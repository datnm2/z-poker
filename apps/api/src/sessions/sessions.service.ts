import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session } from "./session.entity";
import { SessionPlayer } from "./session-player.entity";
import { Player } from "../players/player.entity";
import { EloService, type EloResult } from "../elo/elo.service";
import { SessionsEventsService } from "./sessions.events";
import type { AuthedUser } from "../auth/current-user.decorator";

export interface SessionDto {
  id: string;
  playedDate: string;
  buyIn: number;
  domain: string;
  createdBy: string;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
}

export interface SessionWithCreatorDto extends SessionDto {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

export interface SessionPlayerDto {
  id: string;
  sessionId: string;
  playerId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  updatedAt: string;
  player: { id: string; name: string; elo: number; avatarUrl: string | null };
}

export interface SessionDetailDto {
  session: SessionDto;
  players: SessionPlayerDto[];
}

function toDateString(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function sessionToDto(s: Session): SessionDto {
  return {
    id: s.id,
    playedDate: toDateString(s.playedDate),
    buyIn: s.buyIn,
    domain: s.domain,
    createdBy: s.createdBy,
    isLocked: s.isLocked,
    lockedAt: s.lockedAt ? s.lockedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  };
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(SessionPlayer)
    private readonly sessionPlayers: Repository<SessionPlayer>,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
    private readonly elo: EloService,
    private readonly events: SessionsEventsService,
  ) {}

  async listActiveForDomain(domain: string): Promise<SessionWithCreatorDto[]> {
    const rows = await this.sessions
      .createQueryBuilder("s")
      .leftJoin(Player, "p", "p.id = s.created_by")
      .select([
        's.id AS "id"',
        's.played_date AS "playedDate"',
        's.buy_in AS "buyIn"',
        's.domain AS "domain"',
        's.created_by AS "createdBy"',
        's.is_locked AS "isLocked"',
        's.locked_at AS "lockedAt"',
        's.created_at AS "createdAt"',
        'p.id AS "creatorId"',
        'p.name AS "creatorName"',
      ])
      .where("s.domain = :domain", { domain })
      .andWhere("s.is_locked = false")
      .orderBy("s.created_at", "DESC")
      .getRawMany<{
        id: string;
        playedDate: Date | string;
        buyIn: number;
        domain: string;
        createdBy: string;
        isLocked: boolean;
        lockedAt: Date | null;
        createdAt: Date;
        creatorId: string | null;
        creatorName: string | null;
      }>();

    // Batch-load playerIds for all active sessions
    const sessionIds = rows.map((r) => r.id);
    const playerRows = sessionIds.length
      ? await this.sessionPlayers
          .createQueryBuilder("sp")
          .select(['sp.session_id AS "sessionId"', 'sp.player_id AS "playerId"'])
          .where("sp.session_id IN (:...sessionIds)", { sessionIds })
          .getRawMany<{ sessionId: string; playerId: string }>()
      : [];
    const playerIdsBySession = new Map<string, string[]>();
    for (const pr of playerRows) {
      const arr = playerIdsBySession.get(pr.sessionId) ?? [];
      arr.push(pr.playerId);
      playerIdsBySession.set(pr.sessionId, arr);
    }

    return rows.map((r) => ({
      id: r.id,
      playedDate: toDateString(r.playedDate),
      buyIn: Number(r.buyIn),
      domain: r.domain,
      createdBy: r.createdBy,
      isLocked: r.isLocked,
      lockedAt: r.lockedAt ? r.lockedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      creator:
        r.creatorId && r.creatorName
          ? { id: r.creatorId, name: r.creatorName }
          : null,
      playerIds: playerIdsBySession.get(r.id) ?? [],
    }));
  }

  async create(
    user: AuthedUser,
    input: { buyIn: number; playedDate?: string },
  ): Promise<SessionDto> {
    const session = this.sessions.create({
      buyIn: input.buyIn,
      playedDate: input.playedDate ?? new Date().toISOString().slice(0, 10),
      domain: user.domain,
      createdBy: user.userId,
      isLocked: false,
    });
    const saved = await this.sessions.save(session);

    const creator = await this.players.findOne({
      where: { id: user.userId },
    });
    const withCreator: SessionWithCreatorDto = {
      ...sessionToDto(saved),
      creator: creator ? { id: creator.id, name: creator.name } : null,
      playerIds: [],
    };
    this.events.publish({
      type: "session.created",
      domain: saved.domain,
      sessionId: saved.id,
      session: withCreator,
    });

    return sessionToDto(saved);
  }

  private async loadSessionForDomain(
    sessionId: string,
    domain: string,
  ): Promise<Session> {
    const session = await this.sessions.findOne({
      where: { id: sessionId, domain },
    });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  async getDetail(
    sessionId: string,
    domain: string,
  ): Promise<SessionDetailDto> {
    const session = await this.loadSessionForDomain(sessionId, domain);
    const players = await this.sessionPlayers
      .createQueryBuilder("sp")
      .innerJoin(Player, "p", "p.id = sp.player_id")
      .select([
        'sp.id AS "id"',
        'sp.session_id AS "sessionId"',
        'sp.player_id AS "playerId"',
        'sp.chips_end AS "chipsEnd"',
        'sp.elo_before AS "eloBefore"',
        'sp.elo_after AS "eloAfter"',
        'sp.updated_at AS "updatedAt"',
        'p.id AS "pId"',
        'p.name AS "pName"',
        'p.elo AS "pElo"',
        'p.avatar_url AS "pAvatarUrl"',
      ])
      .where("sp.session_id = :sessionId", { sessionId })
      .orderBy("sp.chips_end", "DESC", "NULLS LAST")
      .addOrderBy("sp.updated_at", "ASC")
      .getRawMany<{
        id: string;
        sessionId: string;
        playerId: string;
        chipsEnd: number | null;
        eloBefore: number | null;
        eloAfter: number | null;
        updatedAt: Date;
        pId: string;
        pName: string;
        pElo: number;
        pAvatarUrl: string | null;
      }>();

    return {
      session: sessionToDto(session),
      players: players.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        playerId: r.playerId,
        chipsEnd: r.chipsEnd,
        eloBefore: r.eloBefore,
        eloAfter: r.eloAfter,
        updatedAt: r.updatedAt.toISOString(),
        player: { id: r.pId, name: r.pName, elo: Number(r.pElo), avatarUrl: r.pAvatarUrl },
      })),
    };
  }

  async addPlayer(
    sessionId: string,
    user: AuthedUser,
    input: { playerId?: string; self?: boolean },
  ): Promise<SessionPlayerDto> {
    const session = await this.loadSessionForDomain(sessionId, user.domain);
    if (session.isLocked) {
      throw new BadRequestException("Session is locked");
    }

    let playerId: string;
    if (input.self) {
      playerId = user.userId;
    } else if (input.playerId) {
      if (session.createdBy !== user.userId) {
        throw new ForbiddenException(
          "Only the session creator can add other players",
        );
      }
      playerId = input.playerId;
    } else {
      throw new BadRequestException("Must provide playerId or self");
    }

    const target = await this.players.findOne({
      where: { id: playerId, domain: user.domain },
    });
    if (!target) {
      throw new NotFoundException("Player not in your domain");
    }

    const existing = await this.sessionPlayers.findOne({
      where: { sessionId, playerId },
    });
    if (existing) {
      throw new BadRequestException("Player already in session");
    }

    const sp = this.sessionPlayers.create({
      sessionId,
      playerId,
      eloBefore: target.elo,
      chipsEnd: null,
      eloAfter: null,
    });
    const saved = await this.sessionPlayers.save(sp);

    const dto: SessionPlayerDto = {
      id: saved.id,
      sessionId: saved.sessionId,
      playerId: saved.playerId,
      chipsEnd: saved.chipsEnd,
      eloBefore: saved.eloBefore,
      eloAfter: saved.eloAfter,
      updatedAt: saved.updatedAt.toISOString(),
      player: { id: target.id, name: target.name, elo: target.elo, avatarUrl: target.avatarUrl },
    };
    this.events.publish({
      type: "session.player_joined",
      domain: session.domain,
      sessionId,
      sessionPlayer: dto,
    });

    return dto;
  }

  async updateChips(
    sessionId: string,
    sessionPlayerId: string,
    user: AuthedUser,
    chipsEnd: number | null,
  ): Promise<void> {
    const session = await this.loadSessionForDomain(sessionId, user.domain);
    if (session.isLocked) {
      throw new BadRequestException("Session is locked");
    }
    const sp = await this.sessionPlayers.findOne({
      where: { id: sessionPlayerId, sessionId },
    });
    if (!sp) throw new NotFoundException("Session player not found");

    const isCreator = session.createdBy === user.userId;
    const isSelf = sp.playerId === user.userId;
    if (!isCreator && !isSelf) {
      throw new ForbiddenException("Can only edit your own chips");
    }

    await this.sessionPlayers.update({ id: sessionPlayerId }, { chipsEnd });
    this.events.publish({
      type: "session.chips_updated",
      domain: session.domain,
      sessionId,
      sessionPlayerId,
      chipsEnd,
    });
  }

  async lock(
    sessionId: string,
    user: AuthedUser,
  ): Promise<{ results: EloResult[] }> {
    const session = await this.loadSessionForDomain(sessionId, user.domain);
    if (session.createdBy !== user.userId) {
      throw new ForbiddenException("Only the session creator can lock");
    }
    const results = await this.elo.calculateAndLock(sessionId);
    this.events.publish({
      type: "session.locked",
      domain: session.domain,
      sessionId,
      results,
    });
    return { results };
  }
}
