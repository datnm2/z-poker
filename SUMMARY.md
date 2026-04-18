# Z-Poker — Quick Summary

## 1. Pitch 1 dòng

Poker trưa văn phòng có Elo đàng hoàng — mỗi buổi trưa là một phiên, Elo cộng dồn qua tháng, tách biệt theo email công ty.

## 2. Vấn đề giải quyết

- **Giờ trưa ngắn (30–45p)** → không đủ cho 1 ván poker "chuẩn" kéo dài vài tiếng. Người nghỉ ngang làm kết quả không công bằng.
- **Chơi rời rạc, không biết ai giỏi thật** → thiếu tracking dài hạn, ăn may 1 ván xong hết.
- **Không muốn lẫn người lạ** → đồng nghiệp muốn bảng xếp hạng riêng của công ty mình.
- **Không phải gambling** → chỉ chip ảo, vui là chính; quy đổi tiền (nếu có) nằm ngoài phạm vi app.

## 3. Target user

- **Nhân viên văn phòng** chơi poker giờ trưa / sau giờ làm với đồng nghiệp.
- **Host/Creator**: người rủ rê tổ chức ván, tạo session, lock kết quả.
- **Player thường**: tham gia ván, nhập chip cuối, xem rank cá nhân.
- Điều kiện ngầm: cả nhóm dùng **email cùng domain** (`@acme.com`) → tự động chung "server".

## 4. Core user flow

```
1. Đăng nhập Google (Clerk)  →  domain tự extract từ email
2. Tạo Session  →  nhập buy-in (default 100 chip ảo)
3. Add players (cùng domain)  →  snapshot eloBefore
4. Chơi bài vật lý ngoài đời
5. Hết giờ → mỗi player nhập chipsEnd qua UI
6. Host LOCK session  →  Elo recalc zero-sum  →  rank cập nhật domain-wide
7. Session immutable, kết quả lên leaderboard
```

Real-time qua SSE → ai đó tạo/join/lock phiên là cả nhóm thấy ngay.

## 5. Key screens (web routes)

| Route | Mục đích |
|---|---|
| `/` (logged-out) | Landing page: hero, why-cards, mock leaderboard, rank ladder, "for-fun" disclaimer, CTA Google |
| `/` (logged-in) | Leaderboard domain: active sessions, nút tạo phiên, player rankings + tier/division/progress |
| `/session/[id]` | Chi tiết phiên: nhập chip cuối, xem "ăn/mất tối đa" ước tính, host lock |
| `/sessions` | Lịch sử phiên đã lock (paginated, có dealer + winner) |
| `/player/[id]` | Profile public 1 player (Elo history, games played) |
| `/profile` | Profile của mình: đổi tên, sign out |
| `/guide` | Hướng dẫn Elo + luật |
| `/login` | Clerk login |

## 6. Business rules quan trọng

- **Multi-tenant by email domain**: query đều filter theo `AuthedUser.domain` → công ty A tuyệt đối không thấy dữ liệu công ty B.
- **Starting Elo = 1200**, K=70 (swing rõ hơn chess).
- **Zero-sum enforced**: `sum(chipsEnd) == buyIn × N` khi lock → nếu lệch thì cảnh báo "ai giấu chip" / "chip thừa".
- **Session immutable sau khi lock**: không sửa được → tính chất sổ cái.
- **Nghỉ ngang vẫn fair**: Elo tính theo chip cuối (linear), không cần chơi tới người cuối cùng.
- **"Bài vật lý" only**: mode "online" disabled (placeholder future). App chỉ là tracker, không deal bài.

## 7. Rank tiers (gamification)

6 hạng, mid tiers chia 3 divisions 50-elo:

| Tier | Elo range |
|---|---|
| 👑 Thần Bài — Vua Trò Chơi | 1600+ |
| 🦈 Kẻ Săn Mồi | 1450–1600 (★ ★★ ★★★) |
| 💰 Lão Luyện | 1300–1450 (★ ★★ ★★★) |
| 🎯 Tay Mới Chơi | 1150–1300 (★ ★★ ★★★) |
| 🃏 Tay Non Và Xanh | 1000–1150 (★ ★★ ★★★) |
| 🐟 Cá Con — Chip Feeder | <1000 |

Rank trong domain = đếm số player có elo cao hơn + 1.

## 8. Business use cases

- **Văn phòng nhỏ/team tech** muốn chơi poker nghiêm túc nhưng không có thời gian → tool tracking + ranking chuyên nghiệp hoá hoạt động giải trí.
- **Gamification team building**: leaderboard, tier badges, progress bar tới hạng tiếp theo → tạo động lực chơi đều đặn.
- **Không phải SaaS trả tiền** (hiện tại): free, tự host bản thân; monetization tiềm năng là domain-level features (company tournament, admin, export).

## 9. Non-goals / giới hạn

- **Không deal bài, không có bàn ảo** — người chơi tự xử bài vật lý.
- **Không tiền thật** — chip chỉ là đơn vị đếm cho Elo.
- **Không cross-domain** — không có "global leaderboard", không friend cross-company.
- **Không mobile native** — web app (mobile-first responsive, `max-w-lg`).

## 10. Tech tóm tắt (cho context kỹ thuật)

- Stack: Next.js 16 App Router + React 19 + Tailwind (web), NestJS + TypeORM + Postgres (api), Clerk auth, Yarn v1 workspaces.
- Deploy: Web → Vercel, API → Render, Postgres → Docker local / managed prod.
- Real-time: SSE streams (`/sessions/stream` domain-wide, `/sessions/:id/stream` per-session).

## 11. Thuật toán tính điểm Elo (`apps/api/src/elo/elo.math.ts`)

**Input**: mảng `{playerId, chipsEnd, elo}` + `buyIn`. **Output**: `eloBefore`, `eloAfter`, `change`.

**Công thức lõi**:
```
change = ceil( K × (N/2) × (actual − expected) )
expected = 1 / (1 + 10^((avgElo − playerElo) / 400))
actual   = 0.5 + 0.5 × (chipsEnd − buyIn) / (buyIn × (N − 1))
```

**Các hằng số & quyết định thiết kế**:

| Thành phần | Giá trị | Vì sao |
|---|---|---|
| `K` | 70 | Chess chuẩn 10–40. Casual office poker cần feedback rõ hơn → lớn hơn. Nhưng thấp hơn 100 để tránh swing 1 ván là nhảy tier. |
| `400` (scaling) | chuẩn Arpad Elo | 1 player hơn 400 Elo → xác suất "thắng" ~91% → Elo gap lớn thì ăn chênh lệch ít, thua thì mất nhiều (upset penalty). |
| `N/2` scaling | × số người / 2 | N=2 giữ nguyên ×1, N=9 thành ×4.5. Bàn đông → stakes to hơn, tránh Elo bị loãng khi chia cho nhiều người. |
| `Math.ceil` | làm tròn lên | Tạo "mild positive drift" — Elo toàn domain inflate nhẹ theo thời gian → số càng tăng càng tạo cảm giác tiến bộ (UX gamification). |
| Min `+1` nếu chipsEnd > buyIn | winner guarantee | Thắng chip thì KHÔNG BAO GIỜ mất Elo, dù đối thủ Elo thấp hơn. Tránh cảm giác "thắng mà vẫn bị trừ" (demotivating). |

**Tính chất quan trọng**:
- **Zero-sum chip** (enforced): `sum(chipsEnd) == buyIn × N` ở lock time → nếu lệch, báo "ai giấu chip" / "chip thừa".
- **KHÔNG zero-sum Elo** (cố ý): do `ceil` + winner-floor → tổng Elo của domain drift dương nhẹ. Trade-off: công bằng tuyệt đối vs. động lực chơi dài hạn → chọn động lực.
- **Linear theo chip delta** (không phải rank ordinal): thắng nhiều chip hơn → `actual` cao hơn → Elo nhiều hơn. Không chỉ "ai #1" mà còn "ăn đậm cỡ nào".
- **`actual ∈ [0, 1]` tự động**: người thua sạch chip → `actual = 0`; người ôm hết → `actual = 1`.
- **`expected` so với avgElo bàn, không pairwise**: approximation cho multi-player (Elo gốc chỉ cho 1v1). Mỗi player so với "mặt bằng chung của bàn".

**Edge case**:
- `numPlayers === 1` → công thức chia cho `(N-1) = 0` → không dùng session 1 người (UI chặn).
- Float noise (e.g. `63.0000004`) → round về 6 chữ số thập phân trước khi `ceil`.

## 12. AI Highlight — MC cà khịa sau mỗi session

**Flow**: Session được lock → trigger `HighlightsService.generateForSession()` async → gọi Gemini với structured output → lưu vào `session.highlights` JSON → UI session detail hiển thị 3 cards troll.

**File chính**:
- `apps/api/src/ai/ai.service.ts` — wrapper `@google/generative-ai` (Gemini), default model `gemini-3-flash-preview`, hỗ trợ `generateJson<T>()` với `ResponseSchema` để output JSON strict.
- `apps/api/src/sessions/highlights/highlights.service.ts` — build context + prompt + parse.
- `apps/api/src/sessions/highlights/highlights.types.ts` — `SessionHighlights` type (`{generatedAt, model, items[]}`).

**Context build cho LLM** (`PlayerContext`):
- Kết quả session hiện tại: `chipsEnd`, `chipDelta`, `eloBefore/After/Change`.
- `isFirstTimer`: flag nếu người chơi chưa có history locked.
- **History 10 session gần nhất** của mỗi player: date, buyIn, chipsEnd, eloBefore/After, result (`win`/`loss`/`tie`) → để LLM bắt được pattern streak/comeback.

**Prompt design** (tiếng Việt, tone "MC sòng bài văn phòng mồm mép lanh"):
- Bắt pattern có chủ đích: **thắng/thua streak ≥3**, **comeback** (thua chuỗi rồi thắng), **chip feeder** (delta âm nhất), **upset** (người thường thua bỗng thắng), **fall from grace** (streak thắng rồi thua), **first-timer** (history rỗng → angle riêng, KHÔNG bịa streak).
- Output schema enforce: `items[3]` — mỗi item có `title/body` song ngữ `{vi, en}`, `emoji`, `playerId` khớp data.
- **Constraints tone**: cà khịa dí dỏm, không tục, không động chạm ngoại hình/giới tính/gia đình. EN phải natural trash-talk chứ không dịch word-by-word.
- **Hard rule**: body BẮT BUỘC nêu số cụ thể (chip delta / streak count / elo change) → chống LLM hallucination, ép bám data.

**Error handling**: try/catch log error, không fail lock flow nếu AI lỗi (highlights optional, core Elo vẫn tính).

**Giới hạn** (cố ý):
- Chỉ 3 highlights / session (tránh spam).
- Generated once, lưu DB, không regenerate (determinism cho user).
- Bilingual hardcoded `vi` + `en` (i18n app hiện chỉ 2 ngôn ngữ).

## 13. Game theory / design principles đang apply

**a) Loss aversion nhẹ + winner floor**
Kahneman: nỗi đau mất gấp đôi niềm vui được. Winner guaranteed `+1` Elo → giảm cảm giác "mình thắng mà vẫn bị trừ" → khuyến khích quay lại.

**b) Variable reward schedule (Elo change không predictable)**
Elo thay đổi phụ thuộc avgElo bàn, N người, chip gap → không thể "tính trước chính xác sẽ ăn bao nhiêu". Tương tự slot machine / gacha → tăng engagement. Nhưng vẫn deterministic theo skill (không random noise).

**c) Upset bonus (Elo-gap asymmetry)**
Low-Elo thắng High-Elo → `expected` thấp → `(actual − expected)` lớn → ăn nhiều Elo. Ngược lại, cao đè thấp chỉ ăn rỉa. → Ngăn **rich get richer**, top player không thể farm người yếu để cày rank.

**d) Tier gating với divisions (gamification ladder)**
6 tier × 3 divisions ở mid tier = **15 nấc nhỏ** thay vì 1 thanh liên tục từ 1000→1600. Mỗi 50 Elo là 1 cột mốc visible (★→★★→★★★→tier mới). Short-term goals → dopamine hit thường xuyên hơn so với "còn 400 Elo nữa tới Thần Bài".

**e) Zero-sum chip + social accountability**
Tổng chip phải khớp ở lock → nếu lệch UI cảnh báo "🚨 Ai đó giấu chip". Nhóm public thấy → social pressure tự correct. Game theory: **common knowledge of defection** → tự-enforce honesty mà không cần audit.

**f) Domain isolation = small-pond effect**
Chỉ so với đồng nghiệp (~10-50 người) thay vì global (Codeforces-level). Rank #1 trong công ty feels achievable → entry motivation cao. Kết hợp tier + division → ai cũng có thể tiến bộ thấy được, không có "được hay là bỏ".

**g) Narrative layer (AI highlights)**
Cold numbers → hot stories. Troll MC biến Elo/chip delta thành highlights có cảm xúc → session memorable → người ta kể lại ở water cooler → retention organic, viral trong office.

**h) Irreversible lock = commitment device**
Host lock xong là immutable, không sửa được. Loại bỏ drama "cho tao gỡ lại", "sửa tí đi" → người chơi nhập chip nghiêm túc lần đầu. Social contract enforced bằng code.

**i) Inflation-biased rounding (`ceil`)**
Làm tròn LÊN → Elo domain drift dương từ từ. Psychology: số càng tăng càng thoả mãn ("con số cao = tôi tiến bộ"), dù relative ranking không đổi. Trade-off đạo đức nhẹ vs. engagement — app chọn engagement vì không có stakes thật.
