import { SeasonRecapProseService } from "./season-recap-prose.service";
import type { AiService } from "../ai/ai.service";
import type { ConfigService } from "@nestjs/config";
import type { SeasonRecapDto } from "./season.recap";

// Mock config with no env overrides => service uses its code defaults.
const config = { get: () => undefined } as unknown as ConfigService;

function makeRecap(overrides: Partial<SeasonRecapDto> = {}): SeasonRecapDto {
  return {
    seasonKey: "2026-Q1",
    totalGames: 10,
    hardest: [{ playerId: "a", playerName: "Alice", avatarUrl: null, games: 8 }],
    topWinrate: [],
    records: {
      chipRatio: null,
      biggestTable: null,
      biggestEloGain: null,
      longestWinStreak: null,
      longestLossStreak: null,
    },
    ...overrides,
  };
}

describe("SeasonRecapProseService", () => {
  it("returns prose with persona + model metadata on success", async () => {
    const ai = {
      generateJson: jest.fn().mockResolvedValue({
        slides: {
          intro: { vi: "mở màn", en: "intro" },
          hardest: { vi: "cày", en: "grind" },
          outro: { vi: "kết", en: "outro" },
        },
      }),
      getDefaultModel: () => "gemini-3-flash-preview",
    } as unknown as AiService;

    const svc = new SeasonRecapProseService(ai, config);
    const result = await svc.generate(makeRecap(), "blv");

    expect(result).not.toBeNull();
    expect(result!.model).toBe("gemini-3-flash-preview");
    expect(result!.personaId).toBe("blv");
    expect(result!.slides.intro.vi).toBe("mở màn");
    // schema only requested keys with data: intro, hardest, outro
    expect(ai.generateJson).toHaveBeenCalledTimes(1);
  });

  it("returns null (graceful fallback) when the AI call throws", async () => {
    const ai = {
      generateJson: jest.fn().mockRejectedValue(new Error("503 high demand")),
      getDefaultModel: () => "gemini-3-flash-preview",
    } as unknown as AiService;

    const svc = new SeasonRecapProseService(ai, config);
    const result = await svc.generate(makeRecap());
    expect(result).toBeNull();
  });

  it("returns null without calling AI when the season has no data", async () => {
    const ai = {
      generateJson: jest.fn(),
      getDefaultModel: () => "x",
    } as unknown as AiService;

    const svc = new SeasonRecapProseService(ai, config);
    const result = await svc.generate(makeRecap({ totalGames: 0, hardest: [] }));
    expect(result).toBeNull();
    expect(ai.generateJson).not.toHaveBeenCalled();
  });
});
