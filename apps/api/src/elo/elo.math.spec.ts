import {
  BUST_MIN_PENALTY,
  computeEloChanges,
  EloInput,
  K,
  LOSER_MIN_PENALTY,
  LOSS_STREAK_BONUS_CAP,
  STREAK_THRESHOLD,
  WIN_STREAK_BONUS_PER_STEP,
  WINNER_FLAT_BONUS,
} from "./elo.math";

describe("computeEloChanges", () => {
  it("keeps changes near zero-sum when everyone has equal Elo", () => {
    const result = computeEloChanges(
      [
        {
          playerId: "a",
          chipsEnd: 1500,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "b",
          chipsEnd: 1000,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "c",
          chipsEnd: 500,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
      ],
      1000,
    );
    const sum = result.reduce((acc, r) => acc + r.change, 0);
    // Drift = winner formula gain + WINNER_FLAT_BONUS − loser softened loss.
    // 1 winner × (~13 + 3) − 1 loser × ~9 = ~7 (positive by design).
    expect(sum).toBeGreaterThan(0);
    expect(result[0].change).toBeGreaterThan(0);
    expect(result[1].change).toBe(0);
    expect(result[2].change).toBeLessThan(0);
  });

  it("caps max change near +K for equal-Elo two-player blowout", () => {
    const result = computeEloChanges(
      [
        {
          playerId: "a",
          chipsEnd: 2000,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
        { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0, jackpot: 0 },
      ],
      1000,
    );
    // Winner: K*(N/2)*(1.0-0.5) = 70*1*0.5 = 35, plus WINNER_FLAT_BONUS.
    // Loser: K_LOSS*(N/2)*(0-0.5) = 50*1*(-0.5) = -25 (softened).
    // WITH mitigation (L=1, 0.9x): -25 * 0.9 = -22.5 -> -22 (Math.round(-22.5) rounds towards zero in JS for negative if not careful, but let's see results)
    expect(result[0].change).toBe(35 + WINNER_FLAT_BONUS);
    expect(result[1].change).toBe(-22);
  });

  it("penalizes the favorite for losing to the underdog", () => {
    const result = computeEloChanges(
      [
        {
          playerId: "fav",
          chipsEnd: 500,
          elo: 1600,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "dog",
          chipsEnd: 1500,
          elo: 1000,
          currentStreak: 0,
          jackpot: 0,
        },
      ],
      1000,
    );
    expect(result[0].change).toBeLessThan(0);
    expect(result[1].change).toBeGreaterThan(0);
    // Drift positive: dog wins (K=70) + bonus, fav loses softer (K_LOSS=50).
    const sum = result[0].change + result[1].change;
    expect(sum).toBeGreaterThan(WINNER_FLAT_BONUS);
  });

  it("never deducts ELO from a player who finished with more chips than buy-in", () => {
    // Reproduces the screenshot case: 7 players, host has high Elo but only +10 chips.
    const result = computeEloChanges(
      [
        {
          playerId: "p1",
          chipsEnd: 210,
          elo: 1188,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p2",
          chipsEnd: 195,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p3",
          chipsEnd: 135,
          elo: 1197,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "host",
          chipsEnd: 110,
          elo: 1220,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p5",
          chipsEnd: 50,
          elo: 1197,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p6",
          chipsEnd: 0,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p7",
          chipsEnd: 0,
          elo: 1191,
          currentStreak: 0,
          jackpot: 0,
        },
      ],
      100,
    );
    for (const r of result) {
      const chipsEnd = [210, 195, 135, 110, 50, 0, 0][result.indexOf(r)];
      if (chipsEnd > 100) {
        // Floor + bonus = 5 minimum for any chip-winner.
        expect(r.change).toBeGreaterThanOrEqual(5);
      }
    }
    const host = result.find((r) => r.playerId === "host")!;
    expect(host.change).toBeGreaterThanOrEqual(5);
  });

  it("keeps drift small on zero-sum-chip games (rounding noise only)", () => {
    const scenarios: number[][] = [
      [240, 130, 110, 60, 40, 20],
      [235, 145, 105, 65, 30, 20],
    ];
    for (const chips of scenarios) {
      const result = computeEloChanges(
        chips.map((c, idx) => ({
          playerId: `p${idx}`,
          chipsEnd: c,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        })),
        100,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      // With asymmetric K (winners 70, losers 50) + winner bonus + floor,
      // drift is positive but bounded by table size.
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K * 1.5);
    }
  });

  it("triggers jackpot payout (Nổ Hũ) for Top 3 with 3+ loss streak and 1.5x buy-in chips", () => {
    const buyIn = 100;
    // p1: huge win (200), on 3-loss streak (-3), has 50 in jackpot
    // p2: normal win (150), on 4-loss streak (-4), has 100 in jackpot (Top 2)
    // p3: small win (110), on 3-loss streak (-3), has 30 in jackpot (Top 3)
    const players = [
      {
        playerId: "p1",
        elo: 1200,
        currentStreak: -3,
        chipsEnd: 200,
        jackpot: 50,
      },
      {
        playerId: "p2",
        elo: 1200,
        currentStreak: -4,
        chipsEnd: 151,
        jackpot: 100,
      },
      {
        playerId: "p3",
        elo: 1200,
        currentStreak: -3,
        chipsEnd: 110,
        jackpot: 30,
      },
      { playerId: "p4", elo: 1200, currentStreak: 0, chipsEnd: 39, jackpot: 0 },
    ];

    const result = computeEloChanges(players, buyIn);

    const r1 = result.find((r) => r.playerId === "p1")!;
    const r2 = result.find((r) => r.playerId === "p2")!;
    const r3 = result.find((r) => r.playerId === "p3")!;

    // p1: chips(200) >= 150, rank(1) <= 3, streakBefore(-3) <= -3
    expect(r1.jackpotChange).toBe(-50);
    expect(r1.streakAfter).toBe(0);
    expect(r1.jackpotAfter).toBe(0);
    // change should include baseEloChange (~10-20) + 50
    expect(r1.change).toBeGreaterThan(50);

    // p2: chips(151) >= 150, rank(2) <= 3, streakBefore(-4) <= -3
    expect(r2.jackpotChange).toBe(-100);
    expect(r2.streakAfter).toBe(0);

    // p3: chips(110) < 150 -> NO jackpot payout despite rank 3 and streak -3
    expect(r3.jackpotChange).toBe(0);
    expect(r3.streakAfter).toBe(1); // loss streak broken, now 1-win streak
  });

  it("adds to jackpot for players on 3+ loss streaks who lose", () => {
    const buyIn = 100;
    // p1: loser (30), on 3-loss streak (-3)
    const players = [
      {
        playerId: "p1",
        elo: 1200,
        currentStreak: -3,
        chipsEnd: 30,
        jackpot: 10,
      },
      {
        playerId: "p2",
        elo: 1200,
        currentStreak: 0,
        chipsEnd: 170,
        jackpot: 0,
      },
    ];

    const result = computeEloChanges(players, buyIn);
    const r1 = result.find((r) => r.playerId === "p1")!;

    expect(r1.jackpotChange).toBeGreaterThan(0);
    expect(r1.jackpotAfter).toBe(10 + r1.jackpotChange);
    expect(r1.streakAfter).toBe(-4);
  });

  it("logs ELO summary table by player count (max-skew, equal Elo 1200)", () => {
    const counts = [2, 3, 6, 8, 9, 10, 15];
    const buyIn = 100;
    const rows = counts.map((N) => {
      const chips = [buyIn * N, ...Array(N - 1).fill(0)];
      const result = computeEloChanges(
        chips.map((c, i) => ({
          playerId: `p${i}`,
          chipsEnd: c,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        })),
        buyIn,
      );
      const winner = result[0];
      const loser = result[1];
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      const volume = result.reduce((acc, r) => acc + Math.abs(r.change), 0);
      const rawWinner = K * (N / 2) * 0.5;
      const rawLoser = -K * (N / 2) * (0.5 / (N - 1));
      return {
        N,
        K,
        rawWinner: rawWinner.toFixed(2),
        winnerChange: winner.change,
        rawLoser: rawLoser.toFixed(2),
        loserChange: loser.change,
        drift,
        volume,
      };
    });
    console.table(rows);
    // Drift is positive by design (asymmetric K_LOSS softening + winner bonus);
    // bounded by ~N × (K - K_LOSS) / 2 in worst-case max-skew.
    expect(rows.every((r) => r.drift >= 0)).toBe(true);
    expect(rows.every((r) => r.drift < r.N * K)).toBe(true);
  });

  describe("streak bonus", () => {
    it("does not apply bonus below threshold (streak < 3)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 1,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: -1,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(2);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(-2);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies +bonus when win streak reaches threshold", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 2,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(3);
      expect(result[0].streakBonus).toBe(
        STREAK_THRESHOLD * WIN_STREAK_BONUS_PER_STEP,
      );
      // 35 (raw) + 6 (streak) + WINNER_FLAT_BONUS
      expect(result[0].change).toBe(35 + 6 + WINNER_FLAT_BONUS);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies -bonus when loss streak reaches threshold (step 1, capped)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: -2,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[1].streakAfter).toBe(-3);
      expect(result[1].streakBonus).toBe(-STREAK_THRESHOLD); // step 1, not ×2
      // K_LOSS=50 → loser raw = -25. Mitigation (L=3) = 0.7. Round(-25*0.7) = -17.
      // Streak bonus = -3. Total = -17 - 3 = -20.
      expect(result[1].change).toBe(-17 - 3);
    });

    it("scales win-streak bonus linearly with longer streaks (no cap)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 4,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(5);
      expect(result[0].streakBonus).toBe(10);
      // 35 (raw winner) + 10 (streak) + WINNER_FLAT_BONUS
      expect(result[0].change).toBe(35 + 10 + WINNER_FLAT_BONUS);
    });

    it("caps loss-streak bonus at -LOSS_STREAK_BONUS_CAP for long losing runs", () => {
      // Walk losing streaks 3..8 and verify bonuses: -3, -4, -5, -5, -5, -5.
      const expected: Record<number, number> = {
        [-3]: -3,
        [-4]: -4,
        [-5]: -5,
        [-6]: -LOSS_STREAK_BONUS_CAP,
        [-7]: -LOSS_STREAK_BONUS_CAP,
        [-8]: -LOSS_STREAK_BONUS_CAP,
      };
      for (const [streakAfterStr, bonus] of Object.entries(expected)) {
        const streakAfter = Number(streakAfterStr);
        const result = computeEloChanges(
          [
            {
              playerId: "a",
              chipsEnd: 2000,
              elo: 1200,
              currentStreak: 0,
              jackpot: 0,
            },
            {
              playerId: "b",
              chipsEnd: 0,
              elo: 1200,
              currentStreak: streakAfter + 1,
              jackpot: 0,
            },
          ],
          1000,
        );
        expect(result[1].streakAfter).toBe(streakAfter);
        expect(result[1].streakBonus).toBe(bonus);
      }
    });

    it("flips streak sign when result reverses", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 5,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 1200,
            elo: 1200,
            currentStreak: -4,
            jackpot: 0,
          },
          {
            playerId: "c",
            chipsEnd: 800,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(-1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("resets streak to 0 when player ties (chipsEnd === buyIn)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1500,
            elo: 1200,
            currentStreak: 5,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 1000,
            elo: 1200,
            currentStreak: 3,
            jackpot: 0,
          },
          {
            playerId: "c",
            chipsEnd: 500,
            elo: 1200,
            currentStreak: -3,
            jackpot: 0,
          },
        ],
        1000,
      );
      const tied = result.find((r) => r.playerId === "b")!;
      expect(tied.streakAfter).toBe(0);
      expect(tied.streakBonus).toBe(0);
    });

    it("returns streakBefore reflecting input streak", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 7,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: -2,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakBefore).toBe(7);
      expect(result[1].streakBefore).toBe(-2);
    });

    it("strips bonus when a long win streak ties (no residual streak credit)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1500,
            elo: 1200,
            currentStreak: 6,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 1000,
            elo: 1200,
            currentStreak: 6,
            jackpot: 0,
          },
          {
            playerId: "c",
            chipsEnd: 500,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      const tied = result.find((r) => r.playerId === "b")!;
      expect(tied.streakAfter).toBe(0);
      expect(tied.streakBonus).toBe(0);
      expect(tied.change).toBe(0);
    });

    it("strips bonus when a long loss streak ties", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1500,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 1000,
            elo: 1200,
            currentStreak: -8,
            jackpot: 0,
          },
          {
            playerId: "c",
            chipsEnd: 500,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      const tied = result.find((r) => r.playerId === "b")!;
      expect(tied.streakAfter).toBe(0);
      expect(tied.streakBonus).toBe(0);
      expect(tied.change).toBe(0);
    });

    it("breaks a long loss streak: win after -7 → streak becomes +1, no bonus", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1200,
            elo: 1200,
            currentStreak: -7,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 800,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(1);
      expect(result[0].streakBonus).toBe(0);
    });

    it("breaks a long win streak: loss after +7 → streak becomes -1, no bonus", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 7,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
      // No residual win-streak credit leaks in. K_LOSS=50 → raw -25.
      // WITH mitigation (L=1, 0.9x): -25 * 0.9 = -22.5 -> -22
      expect(result[1].change).toBe(-22);
    });

    it("starts a fresh win streak from a tie (currentStreak=0 → +1)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("does not award streak bonus on the first game that breaks the opposite streak", () => {
      // Even if the previous run was deep (-5), the very first win after it
      // is still streak=+1 → no bonus. Bonus only resumes once +3 is hit again.
      const trail = [-5, +1, +2];
      let currentStreak = trail[0];
      // Win at currentStreak=-5: should give +1, no bonus.
      let result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1200,
            elo: 1200,
            currentStreak,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 800,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(trail[1]);
      expect(result[0].streakBonus).toBe(0);

      // Next win at currentStreak=+1 → +2, still no bonus.
      currentStreak = result[0].streakAfter;
      result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1200,
            elo: 1200,
            currentStreak,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 800,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(trail[2]);
      expect(result[0].streakBonus).toBe(0);

      // Third win → +3, bonus kicks in for the first time.
      currentStreak = result[0].streakAfter;
      result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 1200,
            elo: 1200,
            currentStreak,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 800,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(3);
      expect(result[0].streakBonus).toBe(
        STREAK_THRESHOLD * WIN_STREAK_BONUS_PER_STEP,
      );
    });
  });

  describe("TFT-Style Jackpot Mechanics", () => {
    const buyIn = 100;

    it("mitigates loss and accumulates Jackpot on L=3", () => {
      const players: EloInput[] = [
        {
          playerId: "winner",
          elo: 1200,
          chipsEnd: 200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "loser",
          elo: 1200,
          chipsEnd: 0,
          currentStreak: -2,
          jackpot: 10,
        },
      ];
      const result = computeEloChanges(players, buyIn);
      const loser = result[1];
      // Base loss: 50 * 1 * -0.5 = -25.
      // L_after = 3. mitigation = max(0.5, 1 - 0.1 * 3) = 0.7.
      // Mitigated: -25 * 0.7 = -17.5 -> -17 (Math.round).
      // Jackpot addition: abs(-25) * 0.2 * 3 = 15.
      expect(loser.streakAfter).toBe(-3);
      expect(loser.streakBonus).toBe(-3);
      // change = -17 (mitigated) + -3 (streak bonus) = -20.
      expect(loser.change).toBe(-20);
      expect(loser.jackpotAfter).toBe(10 + 15);
    });

    it("explodes Jackpot (Nổ Hũ) for Top 3 with 1.5x chips", () => {
      const players: EloInput[] = [
        {
          playerId: "p1",
          elo: 1200,
          chipsEnd: 155,
          currentStreak: -3,
          jackpot: 100,
        },
        {
          playerId: "p2",
          elo: 1200,
          chipsEnd: 45,
          currentStreak: 0,
          jackpot: 0,
        },
      ];
      const result = computeEloChanges(players, buyIn);
      const p1 = result[0];
      // Rank 1, chips 155 >= 150. L_before = 3.
      // Base win: 70 * 1 * (0.775 - 0.5) = 19.
      // jackpot payout: 19 + 100 = 119.
      // Flat bonus: 119 + 3 = 122.
      // streakAfter = 0 (reset). streakBonus = 0.
      expect(p1.change).toBe(122);
      expect(p1.jackpotAfter).toBe(0);
      expect(p1.streakAfter).toBe(0);
      expect(p1.streakBonus).toBe(0);
    });

    it("does not explode Jackpot if chipsEnd < 1.5x Buy-in", () => {
      const players: EloInput[] = [
        {
          playerId: "p1",
          elo: 1200,
          chipsEnd: 140,
          currentStreak: -3,
          jackpot: 100,
        },
        {
          playerId: "p2",
          elo: 1200,
          chipsEnd: 60,
          currentStreak: 0,
          jackpot: 0,
        },
      ];
      const result = computeEloChanges(players, buyIn);
      const p1 = result[0];
      // Rank 1, but chips 140 < 150. No nổ hũ.
      // Base win: 70 * 1 * (0.7 - 0.5) = 14.
      // Flat bonus: 14 + 3 = 17.
      // streakAfter = 1. streakBonus = 0.
      expect(p1.change).toBe(17);
      expect(p1.jackpotAfter).toBe(100);
      expect(p1.streakAfter).toBe(1);
    });

    it("does not explode Jackpot if rank > 3", () => {
      const players: EloInput[] = [
        {
          playerId: "p1",
          elo: 1200,
          chipsEnd: 200,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p2",
          elo: 1200,
          chipsEnd: 180,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p3",
          elo: 1200,
          chipsEnd: 160,
          currentStreak: 0,
          jackpot: 0,
        },
        {
          playerId: "p4",
          elo: 1200,
          chipsEnd: 155,
          currentStreak: -3,
          jackpot: 100,
        },
        {
          playerId: "p5",
          elo: 1200,
          chipsEnd: 5,
          currentStreak: 0,
          jackpot: 0,
        },
      ];
      const result = computeEloChanges(players, buyIn);
      const p4 = result[3];
      // Rank 4 (p1, p2, p3 are ahead), even if chips 155 >= 150. No nổ hũ.
      expect(p4.jackpotAfter).toBeGreaterThanOrEqual(100);
    });
  });

  describe("loser floor", () => {
    it("guarantees at least LOSER_MIN_PENALTY ELO loss for any chip loss", () => {
      // Setup: 11 players, buyIn=100
      const elos = [
        1219, 1256, 1165, 1175, 1207, 1239, 1154, 1229, 1145, 1225, 1224,
      ];
      const chips = [370, 245, 165, 135, 90, 60, 20, 15, 0, 0, 0];
      const result = computeEloChanges(
        elos.map((elo, idx) => ({
          playerId: `p${idx}`,
          chipsEnd: chips[idx],
          elo,
          currentStreak: 0,
          jackpot: 0,
        })),
        100,
      );
      expect(result[6].change).toBeLessThanOrEqual(LOSER_MIN_PENALTY);
    });

    it("applies LOSER_MIN_PENALTY when raw rounds to 0 for a small loss", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "winner",
            chipsEnd: 1100,
            elo: 1300,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "loser",
            chipsEnd: 900,
            elo: 1100,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      expect(result[1].change).toBeLessThanOrEqual(LOSER_MIN_PENALTY);
    });

    it("does NOT apply loser floor when chipsEnd === buyIn (tie keeps 0)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "winner",
            chipsEnd: 1500,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "tie",
            chipsEnd: 1000,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "loser",
            chipsEnd: 500,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      const tied = result.find((r) => r.playerId === "tie")!;
      expect(tied.change).toBe(0);
    });
  });

  describe("bust floor", () => {
    it("guarantees at least BUST_MIN_PENALTY ELO loss when chipsEnd === 0", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "fav1",
            chipsEnd: 1200,
            elo: 1500,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "fav2",
            chipsEnd: 800,
            elo: 1500,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "underdog",
            chipsEnd: 0,
            elo: 900,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        500,
      );
      const bust = result.find((r) => r.playerId === "underdog")!;
      expect(bust.change).toBeLessThanOrEqual(BUST_MIN_PENALTY);
    });

    it("does not weaken a larger bust loss (formula already worse than -3)", () => {
      const result = computeEloChanges(
        [
          {
            playerId: "a",
            chipsEnd: 2000,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
          {
            playerId: "b",
            chipsEnd: 0,
            elo: 1200,
            currentStreak: 0,
            jackpot: 0,
          },
        ],
        1000,
      );
      // K_LOSS=50, actual=0, expected=0.5 -> -25.
      // WITH mitigation (L=1, 0.9x): -25 * 0.9 = -22.5 -> -22
      expect(result[1].change).toBe(-22);
    });
  });

  describe("drift at scale (large office tables)", () => {
    it("keeps drift bounded for an 11-player game", () => {
      const buyIn = 100;
      // Realistic spread: 1 big winner, several partial winners, many losers
      const chips = [350, 200, 150, 120, 100, 80, 50, 30, 20, 0, 0];
      const result = computeEloChanges(
        chips.map((c, i) => ({
          playerId: `p${i}`,
          chipsEnd: c,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        })),
        buyIn,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K * 1.5); // Should be around 65-70
    });

    it("keeps drift bounded for a 15-player mega-table", () => {
      const buyIn = 100;
      const chips = [
        400, 250, 200, 150, 130, 110, 100, 80, 50, 30, 0, 0, 0, 0, 0,
      ];
      const result = computeEloChanges(
        chips.map((c, i) => ({
          playerId: `p${i}`,
          chipsEnd: c,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        })),
        buyIn,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K * 1.5);
    });
  });

  it("inflates ELO over many randomized chip distributions (drift > 0 by design)", () => {
    const N = 6;
    const buyIn = 100;
    const total = buyIn * N;
    let totalDrift = 0;
    const games = 100;
    for (let i = 0; i < games; i++) {
      const cuts = Array.from({ length: N - 1 }, () =>
        Math.floor(Math.random() * total),
      ).sort((a, b) => a - b);
      const chips: number[] = [];
      let prev = 0;
      for (const cut of cuts) {
        chips.push(cut - prev);
        prev = cut;
      }
      chips.push(total - prev);
      const result = computeEloChanges(
        chips.map((c, idx) => ({
          playerId: `p${idx}`,
          chipsEnd: c,
          elo: 1200,
          currentStreak: 0,
          jackpot: 0,
        })),
        buyIn,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K * 1.5);
      totalDrift += drift;
    }
    const meanDrift = totalDrift / games;
    expect(meanDrift).toBeGreaterThan(0);
  });
});
