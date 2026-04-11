import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Player } from "./player.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { Session } from "../sessions/session.entity";
import type { AuthedUser } from "../auth/current-user.decorator";

export interface PlayerDto {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  gamesPlayed: number;
  createdAt: string;
}

export interface PlayerWithRankDto extends PlayerDto {
  rank: number | null;
}

export interface PlayerHistoryEntryDto {
  id: string;
  sessionId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  session: {
    id: string;
    playedDate: string;
    buyIn: number;
    isLocked: boolean;
  };
}

function toDto(p: Player): PlayerDto {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    domain: p.domain,
    elo: p.elo,
    gamesPlayed: p.gamesPlayed,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
    @InjectRepository(SessionPlayer)
    private readonly sessionPlayers: Repository<SessionPlayer>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
  ) {}

  async findOrCreateMe(user: AuthedUser, displayName: string): Promise<PlayerDto> {
    const existing = await this.players.findOne({ where: { id: user.userId } });
    if (existing) return toDto(existing);

    const created = this.players.create({
      id: user.userId,
      email: user.email,
      name: displayName || user.email,
      domain: user.domain,
    });
    await this.players.save(created);
    return toDto(created);
  }

  async updateMe(user: AuthedUser, name: string): Promise<PlayerDto> {
    await this.players.update({ id: user.userId }, { name });
    const updated = await this.players.findOne({ where: { id: user.userId } });
    if (!updated) throw new NotFoundException("Player not found");
    return toDto(updated);
  }

  async listForDomain(domain: string): Promise<PlayerDto[]> {
    const rows = await this.players.find({
      where: { domain },
      order: { elo: "DESC" },
    });
    return rows.map(toDto);
  }

  async getByIdForDomain(id: string, domain: string): Promise<PlayerWithRankDto> {
    const player = await this.players.findOne({ where: { id, domain } });
    if (!player) throw new NotFoundException("Player not found");
    const above = await this.players.count({
      where: { domain, elo: MoreThan(player.elo) },
    });
    return { ...toDto(player), rank: above + 1 };
  }

  async getHistory(
    playerId: string,
    domain: string,
    limit: number,
  ): Promise<PlayerHistoryEntryDto[]> {
    // Ensure the target player is in the caller's domain (tenancy)
    const target = await this.players.findOne({
      where: { id: playerId, domain },
    });
    if (!target) throw new NotFoundException("Player not found");

    const rows = await this.sessionPlayers
      .createQueryBuilder("sp")
      .innerJoin(Session, "s", "s.id = sp.session_id")
      .select([
        'sp.id AS "id"',
        'sp.session_id AS "sessionId"',
        'sp.chips_end AS "chipsEnd"',
        'sp.elo_before AS "eloBefore"',
        'sp.elo_after AS "eloAfter"',
        's.id AS "sId"',
        's.played_date AS "sPlayedDate"',
        's.buy_in AS "sBuyIn"',
        's.is_locked AS "sIsLocked"',
      ])
      .where("sp.player_id = :playerId", { playerId })
      .andWhere("s.domain = :domain", { domain })
      .orderBy("sp.updated_at", "DESC")
      .limit(limit)
      .getRawMany<{
        id: string;
        sessionId: string;
        chipsEnd: number | null;
        eloBefore: number | null;
        eloAfter: number | null;
        sId: string;
        sPlayedDate: string;
        sBuyIn: number;
        sIsLocked: boolean;
      }>();

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      chipsEnd: r.chipsEnd,
      eloBefore: r.eloBefore,
      eloAfter: r.eloAfter,
      session: {
        id: r.sId,
        playedDate:
          (r.sPlayedDate as unknown) instanceof Date
            ? (r.sPlayedDate as unknown as Date).toISOString().slice(0, 10)
            : String(r.sPlayedDate),
        buyIn: Number(r.sBuyIn),
        isLocked: r.sIsLocked,
      },
    }));
  }
}
