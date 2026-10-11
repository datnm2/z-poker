import {
  calendarDaysBetween,
  computeInactivityPenalty,
  inactivityBeat,
  inactivityPenaltyForBeat,
  INACTIVITY_BASE_PENALTY,
  INACTIVITY_ELO_FLOOR,
} from "./elo.math";

function daily(elo: number, missed: number, beatsCharged = 0) {
  return computeInactivityPenalty({
    elo,
    missedSessions: missed,
    daysAbsent: missed,
    beatsCharged,
  });
}

describe("inactivityBeat", () => {
  it("is 0 until MORE than 3 sessions are missed", () => {
    expect(inactivityBeat(0, 10)).toBe(0);
    expect(inactivityBeat(1, 10)).toBe(0);
    expect(inactivityBeat(3, 10)).toBe(0);
    expect(inactivityBeat(4, 10)).toBe(1);
  });

  it("also needs MORE than 3 days away", () => {
    expect(inactivityBeat(4, 2)).toBe(0);
    expect(inactivityBeat(4, 3)).toBe(0);
    expect(inactivityBeat(4, 4)).toBe(1);
  });

  it("advances one beat per 3 extra sessions (4, 7, 10, 13)", () => {
    expect(inactivityBeat(6, 30)).toBe(1);
    expect(inactivityBeat(7, 30)).toBe(2);
    expect(inactivityBeat(9, 30)).toBe(2);
    expect(inactivityBeat(10, 30)).toBe(3);
    expect(inactivityBeat(13, 30)).toBe(4);
  });

  it("is capped by the day threshold when several sessions run per day", () => {
    expect(inactivityBeat(8, 4)).toBe(1);
    expect(inactivityBeat(14, 7)).toBe(2);
  });
});

describe("inactivityPenaltyForBeat", () => {
  it("starts at 10 and doubles every beat", () => {
    expect(inactivityPenaltyForBeat(0)).toBe(0);
    expect(inactivityPenaltyForBeat(1)).toBe(INACTIVITY_BASE_PENALTY);
    expect([1, 2, 3, 4, 5].map(inactivityPenaltyForBeat)).toEqual([
      10, 20, 40, 80, 160,
    ]);
  });
});

describe("computeInactivityPenalty", () => {
  it("charges nothing for the first 3 missed sessions", () => {
    for (const missed of [1, 2, 3]) {
      expect(daily(1400, missed)).toEqual({ beat: 0, penalty: 0, eloAfter: 1400 });
    }
  });

  it("charges -10 on the 4th missed session", () => {
    expect(daily(1400, 4)).toEqual({ beat: 1, penalty: 10, eloAfter: 1390 });
  });

  it("does not charge the same beat twice", () => {
    expect(daily(1390, 5, 1)).toEqual({ beat: 1, penalty: 0, eloAfter: 1390 });
    expect(daily(1390, 6, 1)).toEqual({ beat: 1, penalty: 0, eloAfter: 1390 });
  });

  it("doubles on every following beat: -20, -40, -80", () => {
    expect(daily(1390, 7, 1)).toEqual({ beat: 2, penalty: 20, eloAfter: 1370 });
    expect(daily(1370, 10, 2)).toEqual({ beat: 3, penalty: 40, eloAfter: 1330 });
    expect(daily(1330, 13, 3)).toEqual({ beat: 4, penalty: 80, eloAfter: 1250 });
  });

  it("matches the agreed totals: 1 week -10, 2 weeks -70, 3 weeks -150", () => {
    const totalAfter = (sessions: number) => {
      let elo = 1425;
      let level = 0;
      for (let missed = 1; missed <= sessions; missed++) {
        const out = daily(elo, missed, level);
        elo = out.eloAfter;
        level = out.beat;
      }
      return 1425 - elo;
    };
    expect(totalAfter(5)).toBe(10);
    expect(totalAfter(10)).toBe(70);
    expect(totalAfter(15)).toBe(150);
    expect(totalAfter(16)).toBe(1425 - INACTIVITY_ELO_FLOOR);
    expect(totalAfter(40)).toBe(1425 - INACTIVITY_ELO_FLOOR);
  });

  it("stops at the 1200 floor", () => {
    expect(daily(1204, 4)).toEqual({ beat: 1, penalty: 4, eloAfter: 1200 });
    expect(daily(1215, 7, 1)).toEqual({ beat: 2, penalty: 15, eloAfter: 1200 });
  });

  it("never touches players at or below 1200", () => {
    expect(daily(1200, 4)).toEqual({ beat: 1, penalty: 0, eloAfter: 1200 });
    expect(daily(1100, 10, 0)).toEqual({ beat: 3, penalty: 0, eloAfter: 1100 });
  });

  it("waits for the day threshold when sessions pile up in a few days", () => {
    const out = computeInactivityPenalty({
      elo: 1400,
      missedSessions: 6,
      daysAbsent: 3,
      beatsCharged: 0,
    });
    expect(out).toEqual({ beat: 0, penalty: 0, eloAfter: 1400 });
  });

  it("charges every skipped beat once the day threshold catches up", () => {
    const out = computeInactivityPenalty({
      elo: 1425,
      missedSessions: 14,
      daysAbsent: 20,
      beatsCharged: 1,
    });
    expect(out).toEqual({ beat: 4, penalty: 140, eloAfter: 1285 });
  });

  it("stays finite for absurdly long absences", () => {
    const out = daily(1425, 5000);
    expect(out.eloAfter).toBe(INACTIVITY_ELO_FLOOR);
    expect(out.penalty).toBe(225);
  });
});

describe("calendarDaysBetween", () => {
  it("counts calendar dates in UTC+7, not 24h blocks", () => {
    const mon = new Date("2026-10-05T05:30:00Z");
    const fri = new Date("2026-10-09T05:20:00Z");
    expect(calendarDaysBetween(mon, fri)).toBe(4);
  });

  it("is 0 for two sessions on the same Vietnam day", () => {
    const noon = new Date("2026-10-05T05:00:00Z");
    const evening = new Date("2026-10-05T11:00:00Z");
    expect(calendarDaysBetween(noon, evening)).toBe(0);
  });

  it("uses the Vietnam date when UTC is still on the previous day", () => {
    const monNoonVn = new Date("2026-10-05T05:00:00Z");
    const tueEarlyVn = new Date("2026-10-05T23:30:00Z");
    expect(calendarDaysBetween(monNoonVn, tueEarlyVn)).toBe(1);
  });

  it("never goes negative", () => {
    const a = new Date("2026-10-09T05:00:00Z");
    const b = new Date("2026-10-05T05:00:00Z");
    expect(calendarDaysBetween(a, b)).toBe(0);
  });
});
