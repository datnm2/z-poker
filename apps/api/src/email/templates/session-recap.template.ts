export interface RecapRow {
  name: string;
  chipsEnd: number;
  chipDelta: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  isRecipient: boolean;
}

export interface SessionRecapTemplateInput {
  recipientName: string;
  playedDate: string;
  createdAt: Date;
  buyIn: number;
  rows: RecapRow[];
  sessionUrl: string;
  highlightsReady: boolean;
  mcName: string | null;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const fmtSigned = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function formatCreatedAt(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

export function getSessionRecapTemplate(
  input: SessionRecapTemplateInput,
): EmailTemplate {
  const { recipientName, playedDate, createdAt, buyIn, rows, sessionUrl, highlightsReady, mcName } = input;
  const me = rows.find((r) => r.isRecipient);
  const winner = rows[0];
  const createdAtVi = formatCreatedAt(createdAt);

  const subject = me
    ? `Z-Poker: ${fmtSigned(me.chipDelta)} chip, ${fmtSigned(me.eloChange)} ELO (${playedDate})`
    : `Z-Poker: Kết quả ván ${playedDate}`;

  const rowsHtml = rows
    .map((r, i) => {
      const rank = i + 1;
      const highlight = r.isRecipient
        ? "background:#fef3c7;font-weight:600;"
        : "";
      const chipColor = r.chipDelta > 0 ? "#059669" : r.chipDelta < 0 ? "#dc2626" : "#6b7280";
      const eloColor = r.eloChange > 0 ? "#059669" : r.eloChange < 0 ? "#dc2626" : "#6b7280";
      return `
        <tr style="${highlight}">
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">#${rank}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.name)}${r.isRecipient ? " <span style=\"color:#92400e;\">(bạn)</span>" : ""}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${r.chipsEnd}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${chipColor};">${fmtSigned(r.chipDelta)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${r.eloAfter}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${eloColor};font-weight:600;">${fmtSigned(r.eloChange)}</td>
        </tr>`;
    })
    .join("");

  const meSummary = me
    ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
        <div style="font-size:14px;color:#92400e;margin-bottom:4px;">Kết quả của bạn</div>
        <div style="font-size:24px;font-weight:700;color:#111;">
          ${fmtSigned(me.chipDelta)} chip · ${fmtSigned(me.eloChange)} ELO
        </div>
        <div style="font-size:13px;color:#6b7280;margin-top:6px;">
          ELO: ${me.eloBefore} → <strong>${me.eloAfter}</strong>
        </div>
      </div>`
    : "";

  const mcLine = mcName
    ? `MC <strong>${escapeHtml(mcName)}</strong> đã chấm điểm xong`
    : "MC poker đã chấm điểm xong";
  const highlightsBlock = highlightsReady
    ? `
      <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <div style="font-size:18px;margin-bottom:4px;">🎤 Highlight AI đã sẵn sàng</div>
        <div style="font-size:13px;color:#0e7490;">${mcLine} — vào xem ai bị cà khịa nặng nhất ván này.</div>
      </div>`
    : "";

  const ctaLabel = highlightsReady ? "Xem highlight + chi tiết ván" : "Xem chi tiết ván";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#111;">🃏 Ván poker ${playedDate}</h1>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">
      Chào ${escapeHtml(recipientName)}, ván tạo lúc <strong>${createdAtVi}</strong>, buy-in <strong>${buyIn}</strong> chip.
    </p>

    ${highlightsBlock}
    ${meSummary}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 16px;">
      <thead>
        <tr style="background:#f3f4f6;text-align:left;color:#374151;">
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">#</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">Người chơi</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Chip</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Δ Chip</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">ELO</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Δ ELO</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="text-align:center;margin:24px 0;">
      <a href="${sessionUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        ${ctaLabel}
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      Bạn nhận được email này vì có trong ván poker. Winner: <strong>${escapeHtml(winner?.name ?? "—")}</strong>.
    </p>
  </div>
</body>
</html>`;

  const textRows = rows
    .map(
      (r, i) =>
        `#${i + 1} ${r.name}${r.isRecipient ? " (bạn)" : ""}: ${r.chipsEnd} chip (${fmtSigned(r.chipDelta)}), ELO ${r.eloAfter} (${fmtSigned(r.eloChange)})`,
    )
    .join("\n");

  const text = `Ván poker ${playedDate}
Tạo lúc: ${createdAtVi}
Buy-in: ${buyIn} chip

Chào ${recipientName},
${highlightsReady ? `\n🎤 Highlight AI đã sẵn sàng — ${mcName ? `MC ${mcName}` : "MC"} chấm xong, vào xem ai bị cà khịa nặng nhất.\n` : ""}${me ? `\nKết quả của bạn: ${fmtSigned(me.chipDelta)} chip, ${fmtSigned(me.eloChange)} ELO (${me.eloBefore} → ${me.eloAfter})\n` : ""}
Bảng kết quả:
${textRows}

${ctaLabel}: ${sessionUrl}
`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
