import { StacksService } from "./stacks.service";

type Sp = { id: string; playerId: string; chipsEnd: number; stackAfter: number | null };

// In-memory fake of the SQL the service issues, keyed by statement shape.
function fakeDataSource(opts: { sessions: { id: string; buyIn: number }[]; rows: Record<string, Sp[]>; players: Record<string, { total: number; bi: number }> }) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const updates: { id: string; delta: number; after: number; afterBi: number }[] = [];
  let pendingSessions = [...opts.sessions];

  const query = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes("pg_advisory_xact_lock")) return [];
    if (sql.includes("SELECT DISTINCT s.id")) {
      const out = pendingSessions;
      pendingSessions = [];
      return out;
    }
    if (sql.includes("FROM session_players") && sql.includes("WHERE session_id")) {
      return opts.rows[params[0] as string].filter((r) => r.stackAfter === null);
    }
    if (sql.startsWith("UPDATE players") && sql.includes("RETURNING")) {
      const p = opts.players[params[0] as string];
      if (!p) return [[], 0];
      p.total += params[1] as number;
      p.bi += params[2] as number;
      return [[{ total: String(p.total), bi: String(p.bi) }], 1];
    }
    if (sql.includes("SET stack_delta = $2")) {
      const [id, delta, after, afterBi] = params as [string, number, string, string];
      updates.push({ id, delta, after: Number(after), afterBi: Number(afterBi) });
      return [];
    }
    return [];
  };

  const ds = { transaction: async (fn: (m: { query: typeof query }) => unknown) => fn({ query }), query };
  return { ds, calls, updates };
}

describe("StacksService.applyPending", () => {
  it("applies sessions oldest-first and accumulates the running stack per player", async () => {
    const { ds, updates, calls } = fakeDataSource({
      sessions: [
        { id: "s1", buyIn: 100 },
        { id: "s2", buyIn: 200 },
      ],
      rows: {
        s1: [
          { id: "a1", playerId: "A", chipsEnd: 150, stackAfter: null },
          { id: "b1", playerId: "B", chipsEnd: 50, stackAfter: null },
        ],
        s2: [
          { id: "a2", playerId: "A", chipsEnd: 0, stackAfter: null },
          { id: "b2", playerId: "B", chipsEnd: 400, stackAfter: null },
        ],
      },
      players: { A: { total: 0, bi: 0 }, B: { total: 0, bi: 0 } },
    });
    const affected = await new StacksService(ds as never).applyPending("acme.com");

    expect(affected.sort()).toEqual(["A", "B"]);
    // A: +50 then -200 => 50, -150 ; buy-ins: +0.5, -1 => 0.5, -0.5
    expect(updates.find((u) => u.id === "a1")).toMatchObject({ delta: 50, after: 50, afterBi: 0.5 });
    expect(updates.find((u) => u.id === "a2")).toMatchObject({ delta: -200, after: -150, afterBi: -0.5 });
    // B: -50 then +200 => -50, 150 ; buy-ins: -0.5, +1 => -0.5, 0.5
    expect(updates.find((u) => u.id === "b1")).toMatchObject({ delta: -50, after: -50 });
    expect(updates.find((u) => u.id === "b2")).toMatchObject({ delta: 200, after: 150, afterBi: 0.5 });
    // quarterly aggregation recomputed once for the affected players
    const q = calls.filter((c) => c.sql.includes("INSERT INTO player_stack_quarterly"));
    expect(q).toHaveLength(1);
    expect((q[0].params[0] as string[]).sort()).toEqual(["A", "B"]);
  });

  it("is a no-op when nothing is pending", async () => {
    const { ds, calls } = fakeDataSource({ sessions: [], rows: {}, players: {} });
    const affected = await new StacksService(ds as never).applyPending("acme.com");
    expect(affected).toEqual([]);
    expect(calls.some((c) => c.sql.includes("player_stack_quarterly"))).toBe(false);
  });

  it("skips players that no longer exist", async () => {
    const { ds, updates } = fakeDataSource({
      sessions: [{ id: "s1", buyIn: 100 }],
      rows: { s1: [{ id: "g1", playerId: "ghost", chipsEnd: 100, stackAfter: null }] },
      players: {},
    });
    const affected = await new StacksService(ds as never).applyPending("acme.com");
    expect(affected).toEqual([]);
    expect(updates).toHaveLength(0);
  });
});

describe("StacksService.getForPlayer", () => {
  const quarter = (o: Record<string, number>) => ({
    year: 2026, quarter: 1, net_chips: 0, net_buyins: 0, games: 0, wins: 0, losses: 0, ties: 0,
    best_game: 0, worst_game: 0, start_stack: 0, end_stack: 0, peak_stack: 0, ...o,
  });

  function svc(responses: unknown[][]) {
    const q = jest.fn();
    responses.forEach((r) => q.mockResolvedValueOnce(r));
    return new StacksService({ query: q } as never);
  }

  it("returns null for an unknown player", async () => {
    expect(await svc([[]]).getForPlayer("x", "acme.com")).toBeNull();
  });

  it("derives totals, averages and extremes across quarters and timeline", async () => {
    const dto = await svc([
      [{ chips: "-100", bi: "-1.5" }],
      [
        quarter({ year: 2026, quarter: 2, net_chips: 50, net_buyins: 0.5, games: 2, wins: 1, losses: 1, best_game: 80, worst_game: -30 }),
        quarter({ year: 2026, quarter: 1, net_chips: -150, net_buyins: -2, games: 2, wins: 0, losses: 1, ties: 1, best_game: 0, worst_game: -150 }),
      ],
      [
        { sessionId: "s1", lockedAt: "2026-01-10T00:00:00Z", buyIn: 100, chipsEnd: 0, delta: -100, stackAfter: "-100" },
        { sessionId: "s2", lockedAt: "2026-02-10T00:00:00Z", buyIn: 100, chipsEnd: 50, delta: -50, stackAfter: "-150" },
        { sessionId: "s3", lockedAt: "2026-04-10T00:00:00Z", buyIn: 100, chipsEnd: 180, delta: 80, stackAfter: "-70" },
      ],
      [{ by_stack: "2", by_avg: "3", total: "5" }],
    ]).getForPlayer("p", "acme.com");

    expect(dto!.total).toMatchObject({
      chips: -100,
      buyIns: -1.5,
      games: 4,
      wins: 1,
      losses: 2,
      ties: 1,
      avgBuyIns: -0.333,
      winRate: 25,
      bestGame: 80,
      worstGame: -150,
      bestGameBuyIns: 0.8,
      worstGameBuyIns: -1,
      peak: 0,
      trough: -150,
    });
    expect(dto!.rank).toEqual({ byStack: 2, byAvg: 3, of: 5 });
    expect(dto!.timeline.map((t) => t.stackAfter)).toEqual([-100, -150, -70]);
  });

  it("keeps the average's sign aligned with net chips across mixed buy-ins", async () => {
    const dto = await svc([
      [{ chips: "-100", bi: "0.5" }],
      [quarter({ games: 3, wins: 2, losses: 1, net_chips: -100, net_buyins: 0.5 })],
      [
        { sessionId: "a", lockedAt: "2026-01-01T00:00:00Z", buyIn: 200, chipsEnd: 300, delta: 100, stackAfter: "100" },
        { sessionId: "b", lockedAt: "2026-01-02T00:00:00Z", buyIn: 200, chipsEnd: 300, delta: 100, stackAfter: "200" },
        { sessionId: "c", lockedAt: "2026-01-03T00:00:00Z", buyIn: 400, chipsEnd: 0, delta: -400, stackAfter: "-200" },
      ],
      [],
    ]).getForPlayer("p", "acme.com");
    expect(dto!.total.avgBuyIns).toBe(-0.125);
  });

  it("handles a player with no games", async () => {
    const dto = await svc([[{ chips: "0", bi: "0" }], [], [], []]).getForPlayer("p", "acme.com");
    expect(dto!.total).toMatchObject({ games: 0, avgBuyIns: 0, winRate: 0, bestGame: 0, peak: 0, trough: 0 });
    expect(dto!.rank).toEqual({ byStack: null, byAvg: null, of: 0 });
  });
});
