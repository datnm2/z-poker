import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, ResponseSchema } from "@google/generative-ai";

export interface GenerateOptions {
  model?: string;
  systemInstruction?: string;
}

export interface GenerateJsonOptions<T> extends GenerateOptions {
  schema: ResponseSchema;
}

interface KeyClient {
  label: string; // "key1" | "key2" — used in logs to trace which key was used
  client: GoogleGenerativeAI;
}

// One step in the fallback chain: which key + which model to try.
interface Attempt {
  key: KeyClient;
  model: string;
  isFallback: boolean; // true if not the very first (primary key + primary model)
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private keys: KeyClient[] = [];
  private defaultModel = "gemini-3-flash-preview";
  private fallbackModel = "gemini-2.5-flash";

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const key1 = this.config.getOrThrow<string>("GEMINI_API_KEY");
    this.keys.push({ label: "key1", client: new GoogleGenerativeAI(key1) });

    const key2 = this.config.get<string>("GEMINI_API_KEY_2");
    if (key2) {
      this.keys.push({ label: "key2", client: new GoogleGenerativeAI(key2) });
    }
    this.logger.log(`AiService initialized with ${this.keys.length} Gemini key(s)`);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Builds the ordered fallback chain:
   *   1. key1 + requested/default model
   *   2. key1 + fallback model   (only when caller didn't pin a model)
   *   3. key2 + requested/default model, then key2 + fallback model (if key2 exists)
   * Stops at step 1 if the caller pinned an explicit model — but still tries
   * other keys, since quota is per-key.
   */
  private buildChain(requestedModel?: string): Attempt[] {
    const primaryModel = requestedModel ?? this.defaultModel;
    const models = requestedModel
      ? [requestedModel]
      : [this.defaultModel, this.fallbackModel];

    const chain: Attempt[] = [];
    for (const key of this.keys) {
      for (const model of models) {
        chain.push({
          key,
          model,
          isFallback: !(key.label === this.keys[0].label && model === primaryModel),
        });
      }
    }
    return chain;
  }

  async generateText(prompt: string, opts?: GenerateOptions): Promise<string> {
    return this.runChain(
      "generateText",
      opts?.model,
      (attempt) =>
        attempt.key.client
          .getGenerativeModel({
            model: attempt.model,
            systemInstruction: opts?.systemInstruction,
          })
          .generateContent(prompt),
      (res) => res.response.text(),
    );
  }

  async generateJson<T>(prompt: string, opts: GenerateJsonOptions<T>): Promise<T> {
    return this.runChain(
      "generateJson",
      opts.model,
      (attempt) =>
        attempt.key.client
          .getGenerativeModel({
            model: attempt.model,
            systemInstruction: opts.systemInstruction,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: opts.schema,
            },
          })
          .generateContent(prompt),
      (res) => JSON.parse(res.response.text()) as T,
    );
  }

  // Walks the fallback chain. Each attempt gets per-call retries (withRetry)
  // for transient errors; when an attempt is exhausted we move to the next
  // (key, model) combo as long as the error is fallback-worthy (5xx or 429).
  private async runChain<R, Out>(
    op: string,
    requestedModel: string | undefined,
    run: (attempt: Attempt) => Promise<R>,
    extract: (res: R) => Out,
  ): Promise<Out> {
    const chain = this.buildChain(requestedModel);
    let lastErr: unknown;

    for (let i = 0; i < chain.length; i++) {
      const attempt = chain[i];
      const tag = `[key=${attempt.key.label} model=${attempt.model}]${attempt.isFallback ? " (fallback)" : ""}`;
      try {
        const res = await this.withRetry(() => run(attempt));
        this.logger.log(`Gemini ${op} OK ${tag}`);
        return extract(res);
      } catch (err) {
        lastErr = err;
        const isLast = i === chain.length - 1;
        if (this.shouldFallback(err) && !isLast) {
          this.logger.warn(`Gemini ${op} failed ${tag}, trying next: ${(err as Error).message}`);
          continue;
        }
        this.logger.error(`Gemini ${op} FAILED ${tag}: ${(err as Error).message}`);
        throw err;
      }
    }
    throw lastErr;
  }

  // Gemini preview models return 503 ("high demand") fairly often; the server
  // usually recovers within seconds. 429 and 5xx are also worth retrying.
  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (!this.isRetryable(err) || attempt === maxAttempts - 1) throw err;
        const base = 1000 * 2 ** attempt;
        const delay = base * (0.7 + Math.random() * 0.6);
        this.logger.warn(
          `AI call failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(delay)}ms: ${(err as Error).message}`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  private isRetryable(err: unknown): boolean {
    const msg = (err as Error)?.message ?? "";
    return /\b(429|500|502|503|504)\b/.test(msg) || /high demand|overloaded|unavailable|ECONNRESET|ETIMEDOUT/i.test(msg);
  }

  // Worth moving to the next (key, model) in the chain: server errors or quota (429).
  private shouldFallback(err: unknown): boolean {
    const msg = (err as Error)?.message ?? "";
    return /\b(429|500|502|503|504)\b/.test(msg) || /high demand|overloaded|unavailable|quota|exhausted/i.test(msg);
  }
}
