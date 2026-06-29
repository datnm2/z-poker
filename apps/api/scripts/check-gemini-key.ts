/**
 * Check capacity & quota for a Gemini API key.
 *
 * Usage:
 *   yarn workspace api gemini:check            # checks GEMINI_API_KEY_2
 *   KEY_ENV=GEMINI_API_KEY yarn workspace api gemini:check
 *
 * Hits generativelanguage.googleapis.com directly so it works with both the
 * legacy (AIza...) and new (AQ....) key formats. Surfaces:
 *   - key validity
 *   - which models the key can access (capacity)
 *   - quota / rate-limit headers + 429 details from a live test call
 */
import "dotenv/config";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

const keyEnv = process.env.KEY_ENV ?? "GEMINI_API_KEY_2";
const apiKey = process.env[keyEnv];

const TEST_MODEL = process.env.TEST_MODEL ?? "gemini-2.5-flash";

function header(s: string) {
  console.log(`\n=== ${s} ===`);
}

async function main() {
  if (!apiKey) {
    console.error(`Missing ${keyEnv} in apps/api/.env`);
    process.exit(1);
  }

  console.log(`Key env:    ${keyEnv}`);
  console.log(`Key prefix: ${apiKey.slice(0, 6)}…${apiKey.slice(-4)}`);
  console.log(`Format:     ${apiKey.startsWith("AQ.") ? "new (AQ.)" : "legacy (AIza)"}`);

  // 1) Validity + capacity: list models the key can reach
  header("Validity & accessible models (capacity)");
  const listRes = await fetch(`${BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
  });

  if (!listRes.ok) {
    const body = await listRes.text();
    console.error(`ListModels failed: ${listRes.status} ${listRes.statusText}`);
    console.error(body);
    process.exit(1);
  }

  const data = (await listRes.json()) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
  };
  const models = data.models ?? [];
  const genModels = models.filter((m) =>
    m.supportedGenerationMethods?.includes("generateContent"),
  );
  console.log(`Key is VALID. ${models.length} models visible, ${genModels.length} support generateContent.`);
  for (const m of genModels) {
    console.log(`  - ${m.name.replace("models/", "")}`);
  }

  // 2) Quota / rate-limit: make one real call and inspect headers + errors
  header(`Live call + quota headers (model: ${TEST_MODEL})`);
  const genRes = await fetch(
    `${BASE}/models/${TEST_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    },
  );

  const quotaHeaders = [
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens",
    "retry-after",
  ];
  const seen = quotaHeaders.filter((h) => genRes.headers.has(h));
  if (seen.length) {
    for (const h of seen) console.log(`  ${h}: ${genRes.headers.get(h)}`);
  } else {
    console.log("  (no explicit rate-limit headers returned by this endpoint)");
  }

  console.log(`\nStatus: ${genRes.status} ${genRes.statusText}`);
  if (genRes.ok) {
    console.log("Generate call SUCCEEDED — key has live capacity right now.");
  } else {
    const body = await genRes.text();
    if (genRes.status === 429) {
      console.error("QUOTA EXCEEDED / rate limited (429). Details below:");
    } else {
      console.error("Call failed. Details below:");
    }
    console.error(body);
    process.exit(genRes.status === 429 ? 2 : 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
