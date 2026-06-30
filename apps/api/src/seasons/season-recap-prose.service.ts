import { Injectable, Logger } from "@nestjs/common";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { AiService } from "../ai/ai.service";
import { selectPersona, type McPersona } from "../sessions/highlights/personas";
import { MIN_GAMES_FOR_WINRATE, type SeasonRecapDto } from "./season.recap";
import type { LocalizedText, SeasonRecapProse } from "./season-recap.entity";

// Slide keys the recap overlay knows how to render. Order matters for the prompt
// only; the frontend maps prose by key onto its own slide deck.
const SLIDE_KEYS = [
  "intro",
  "hardest",
  "winrate",
  "chipRatio",
  "biggestTable",
  "biggestEloGain",
  "winStreak",
  "lossStreak",
  "outro",
] as const;
type SlideKey = (typeof SLIDE_KEYS)[number];

const localizedSchema = () => ({
  type: SchemaType.OBJECT as const,
  properties: {
    vi: { type: SchemaType.STRING as const },
    en: { type: SchemaType.STRING as const },
  },
  required: ["vi", "en"],
});

// Build a schema requesting only the keys we actually have data for.
function buildSchema(keys: SlideKey[]): ResponseSchema {
  const slideProps: Record<string, ReturnType<typeof localizedSchema>> = {};
  for (const k of keys) slideProps[k] = localizedSchema();
  return {
    type: SchemaType.OBJECT,
    properties: {
      slides: {
        type: SchemaType.OBJECT,
        properties: slideProps,
        required: keys,
      },
    },
    required: ["slides"],
  };
}

@Injectable()
export class SeasonRecapProseService {
  private readonly logger = new Logger(SeasonRecapProseService.name);

  constructor(private readonly ai: AiService) {}

  // Returns null if the AI call fails — caller stores prose=null and the
  // frontend falls back to its hardcoded slide bodies.
  async generate(
    recap: SeasonRecapDto,
    personaId?: string | null,
  ): Promise<SeasonRecapProse | null> {
    const keys = this.relevantKeys(recap);
    if (keys.length === 0) return null;

    const persona = selectPersona(personaId);
    const prompt = this.buildPrompt(recap, persona, keys);

    try {
      const raw = await this.ai.generateJson<{
        slides: Record<string, LocalizedText>;
      }>(prompt, { schema: buildSchema(keys) });
      return {
        slides: raw.slides,
        personaId: persona.id,
        personaName: persona.displayName,
        model: this.ai.getDefaultModel(),
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(
        `Season recap prose generation failed: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private relevantKeys(recap: SeasonRecapDto): SlideKey[] {
    const r = recap.records;
    const has: Record<SlideKey, boolean> = {
      intro: recap.totalGames > 0,
      hardest: recap.hardest.length > 0,
      winrate: recap.topWinrate.length > 0,
      chipRatio: r.chipRatio != null,
      biggestTable: r.biggestTable != null,
      biggestEloGain: r.biggestEloGain != null,
      winStreak: r.longestWinStreak != null,
      lossStreak: r.longestLossStreak != null,
      outro: recap.totalGames > 0,
    };
    return SLIDE_KEYS.filter((k) => has[k]);
  }

  private buildPrompt(
    recap: SeasonRecapDto,
    persona: McPersona,
    keys: SlideKey[],
  ): string {
    const toneBlock = persona.toneExamples.map((t) => `- "${t}"`).join("\n");
    const statsJson = JSON.stringify(recap, null, 2);
    const keyList = keys.join(", ");

    return `${persona.voiceIntro}

Đây là TỔNG KẾT một MÙA GIẢI poker văn phòng đã KẾT THÚC (season "${recap.seasonKey}", tổng ${recap.totalGames} ván đã khoá). Mày đang nhìn lại cả mùa để kể chuyện cho anh em nghe — giọng HỒI TƯỞNG, tổng kết, vinh danh.

CỰC KỲ QUAN TRỌNG — THÌ THỜI GIAN: TẤT CẢ sự kiện này đã xảy ra trong QUÁ KHỨ, rải rác suốt cả mùa (vài tuần tới vài tháng trước), KHÔNG phải vừa mới xảy ra. BẮT BUỘC viết bằng THÌ QUÁ KHỨ. TUYỆT ĐỐI KHÔNG dùng "vừa", "vừa mới", "đang", "hôm nay", "bây giờ" (vi) hay "just", "now", "today", present continuous (en). Thay vào đó dùng "đã", "hồi đó", "mùa này từng chứng kiến…", "back then", "that season saw…", "had pulled off…". Văn phong như BLV đang xem lại highlight cũ / nhà sử gia kể lại, KHÔNG phải tường thuật trực tiếp.

Nhiệm vụ: viết prose cho từng slide trong danh sách: ${keyList}. Ý nghĩa từng slide:
- intro: mở màn, hype tổng quan cả mùa (${recap.totalGames} ván).
- hardest: vinh danh mấy người cày nhiều ván nhất mùa (con số games trong data).
- winrate: mấy người có tỉ lệ thắng cao nhất (tối thiểu ${MIN_GAMES_FOR_WINRATE} ván).
- chipRatio: phi vụ ôm chip về đậm nhất một ván (ratio = chip cuối / buy-in).
- biggestTable: bàn đông người nhất mùa.
- biggestEloGain: cú nhảy ELO lớn nhất trong một ván.
- winStreak: chuỗi thắng dài nhất mùa.
- lossStreak: chuỗi thua dài nhất mùa (troll nhẹ, an ủi vui).
- outro: lời kết HỒI TƯỞNG. Mùa đã khép lại, vinh danh nhà vô địch (người đứng đầu hardest hoặc winrate). TUYỆT ĐỐI KHÔNG nói "hẹn gặp mùa sau", KHÔNG nói "ELO reset về 1200", KHÔNG chúc may mắn mùa mới — vì người xem có thể đang xem lại một mùa cũ. Chỉ tổng kết kiểu "những con số này đã thành huyền thoại".

Tone examples (bắt chước vibe này):
${toneBlock}

Output — SONG NGỮ (BẮT BUỘC), JSON object "slides" với đúng các key: ${keyList}. Mỗi key là object { vi, en }:
- Mỗi đoạn 2-4 câu, dài hơn và vui hơn caption thường, đúng giọng nhân vật.
- THÌ QUÁ KHỨ cho mọi câu kể sự kiện (xem quy tắc THÌ THỜI GIAN ở trên) — đây là chuyện đã qua cả mùa, không phải live.
- BẮT BUỘC nêu con số cụ thể & TÊN người chơi lấy từ data (số ván, %, ratio, elo gain, độ dài streak).
- Tiếng Anh giữ tone troll tự nhiên — KHÔNG dịch word-by-word, viết lại cho hợp văn hoá English office poker trash-talk.
- KHÔNG bịa số liệu không có trong data.

Data tổng kết mùa:
${statsJson}`;
  }
}
