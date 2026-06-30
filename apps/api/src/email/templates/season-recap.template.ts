import {
  MIN_GAMES_FOR_WINRATE,
  type SeasonRecapDto,
} from "../../seasons/season.recap";
import type { SeasonRecapProse } from "../../seasons/season-recap.entity";
import type { EmailTemplate } from "./session-recap.template";

export interface SeasonRecapEmailInput {
  recipientName: string;
  domain: string;
  seasonKey: string;
  recap: SeasonRecapDto;
  webOrigin: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function seasonLabel(seasonKey: string): string {
  // seasonKey format: "2025-Q1"
  const m = seasonKey.match(/^(\d{4})-Q(\d)$/);
  if (!m) return seasonKey;
  return `Q${m[2]} ${m[1]}`;
}

function buildStandingsHtml(recap: SeasonRecapDto): string {
  const rows: string[] = [];

  if (recap.hardest.length > 0) {
    rows.push(`
      <h3 style="margin:20px 0 8px;font-size:15px;color:#374151;">Cày nhiều nhất mùa</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          ${recap.hardest
            .map(
              (p, i) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">#${i + 1}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(p.playerName)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${p.games} ván</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`);
  }

  if (recap.topWinrate.length > 0) {
    rows.push(`
      <h3 style="margin:20px 0 8px;font-size:15px;color:#374151;">Winrate cao nhất (tối thiểu ${MIN_GAMES_FOR_WINRATE} ván)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          ${recap.topWinrate
            .map(
              (p, i) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">#${i + 1}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(p.playerName)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${Math.round(p.pct * 100)}%</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">${p.wins}/${p.games}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`);
  }

  const { records } = recap;
  const highlights: string[] = [];
  if (records.chipRatio) {
    highlights.push(
      `<li>Chip ratio lớn nhất: <strong>${escapeHtml(records.chipRatio.playerName)}</strong> — ×${records.chipRatio.ratio.toFixed(2)}</li>`,
    );
  }
  if (records.biggestEloGain) {
    highlights.push(
      `<li>ELO tăng nhiều nhất 1 ván: <strong>${escapeHtml(records.biggestEloGain.playerName)}</strong> +${records.biggestEloGain.gain}</li>`,
    );
  }
  if (records.longestWinStreak) {
    highlights.push(
      `<li>Win streak dài nhất: <strong>${escapeHtml(records.longestWinStreak.playerName)}</strong> — ${records.longestWinStreak.length} ván</li>`,
    );
  }
  if (records.longestLossStreak) {
    highlights.push(
      `<li>Loss streak dài nhất: <strong>${escapeHtml(records.longestLossStreak.playerName)}</strong> — ${records.longestLossStreak.length} ván</li>`,
    );
  }

  if (highlights.length > 0) {
    rows.push(`
      <h3 style="margin:20px 0 8px;font-size:15px;color:#374151;">Records mùa này</h3>
      <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;">${highlights.join("")}</ul>`);
  }

  return rows.join("");
}

function buildProseHtml(prose: SeasonRecapProse): string {
  const slides = prose.slides as Record<string, { vi: string }>;
  const introSlide = slides["intro"]?.vi ?? null;
  const outroSlide = slides["outro"]?.vi ?? null;

  if (!introSlide && !outroSlide) return "";

  const parts: string[] = [];
  if (introSlide) parts.push(`<p style="margin:0 0 12px;">${escapeHtml(introSlide)}</p>`);
  if (outroSlide) parts.push(`<p style="margin:0;">${escapeHtml(outroSlide)}</p>`);

  const personaName = prose.personaName?.vi ?? null;
  const byLine = personaName
    ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px;">— ${escapeHtml(personaName)}</div>`
    : "";

  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#166534;font-style:italic;line-height:1.6;">
      ${parts.join("")}${byLine}
    </div>`;
}

export function getSeasonRecapTemplate(
  input: SeasonRecapEmailInput,
): EmailTemplate {
  const { recipientName, seasonKey, recap, webOrigin } = input;
  const label = seasonLabel(seasonKey);
  const subject = `Z-Poker: Tổng kết mùa ${label} — ${recap.totalGames} ván`;

  const seasonUrl = `${webOrigin}/seasons/${seasonKey}`;
  const proseHtml = recap.prose ? buildProseHtml(recap.prose) : "";
  const standingsHtml = buildStandingsHtml(recap);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#111;">Tổng kết mùa ${label}</h1>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">
      Chào ${escapeHtml(recipientName)}, mùa giải <strong>${label}</strong> đã khép lại với <strong>${recap.totalGames} ván</strong>.
    </p>

    ${proseHtml}
    ${standingsHtml}

    <div style="text-align:center;margin:24px 0;">
      <a href="${seasonUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Xem đầy đủ tổng kết mùa
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      Bạn nhận được email này vì đã tham gia Z-Poker mùa ${label}.
    </p>
  </div>
</body>
</html>`;

  const proseText = recap.prose
    ? (() => {
        const slides = recap.prose.slides as Record<string, { vi: string }>;
        const intro = slides["intro"]?.vi ?? "";
        const outro = slides["outro"]?.vi ?? "";
        return [intro, outro].filter(Boolean).join("\n\n") + "\n\n";
      })()
    : "";

  const standingsText = [
    recap.hardest.length > 0
      ? "Cày nhiều nhất:\n" +
        recap.hardest.map((p, i) => `#${i + 1} ${p.playerName}: ${p.games} ván`).join("\n")
      : null,
    recap.topWinrate.length > 0
      ? "Winrate cao nhất:\n" +
        recap.topWinrate
          .map((p, i) => `#${i + 1} ${p.playerName}: ${Math.round(p.pct * 100)}% (${p.wins}/${p.games})`)
          .join("\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = `Tổng kết mùa ${label}
Chào ${recipientName}, mùa giải ${label} đã khép lại với ${recap.totalGames} ván.

${proseText}${standingsText}

Xem đầy đủ tổng kết: ${seasonUrl}
`;

  return { subject, html, text };
}
