import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Observable } from "rxjs";
import { SessionsService } from "./sessions.service";
import { SessionsEventsService, type SseMessage } from "./sessions.events";
import { CurrentUser, type AuthedUser } from "../auth/current-user.decorator";

class CreateSessionDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  buyIn!: number;

  @IsOptional()
  @IsString()
  playedDate?: string;
}

class ListSessionsQuery {
  @IsOptional()
  @IsString()
  active?: string;
}

class AddPlayerDto {
  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsBoolean()
  self?: boolean;
}

class UpdateChipsDto {
  @IsOptional()
  @IsInt()
  chipsEnd?: number | null;
}

@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly events: SessionsEventsService,
  ) {}

  @Get("stats")
  async stats(@CurrentUser() user: AuthedUser) {
    const totalSessions = await this.sessionsService.countLockedForDomain(user.domain);
    return { totalSessions };
  }

  @Get("history")
  async history(
    @CurrentUser() user: AuthedUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit ?? "10", 10) || 10, 1), 50);
    return this.sessionsService.listLockedHistoryForDomain(
      user.domain,
      cursor,
      lim,
    );
  }

  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query() query: ListSessionsQuery,
  ) {
    if (query.active === "true") {
      return this.sessionsService.listActiveForDomain(user.domain);
    }
    return this.sessionsService.listActiveForDomain(user.domain);
  }

  @Post()
  @Throttle({ write: { limit: 1, ttl: 60_000 } })
  async create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateSessionDto,
  ) {
    return this.sessionsService.create(user, body);
  }

  // Domain-wide SSE: all events for sessions in the caller's email domain.
  // MUST be declared before @Get(":id") so Nest doesn't match :id="stream".
  @Sse("stream")
  @SkipThrottle()
  streamDomain(@CurrentUser() user: AuthedUser): Observable<SseMessage> {
    return this.events.streamForDomain(user.domain);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.sessionsService.getDetail(id, user.domain);
  }

  @Post(":id/players")
  @Throttle({ write: { limit: 30, ttl: 60_000 } })
  async addPlayer(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() body: AddPlayerDto,
  ) {
    return this.sessionsService.addPlayer(id, user, body);
  }

  @Patch(":id/players/:spId")
  @Throttle({ write: { limit: 60, ttl: 60_000 } })
  async updateChips(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Param("spId") spId: string,
    @Body() body: UpdateChipsDto,
  ) {
    await this.sessionsService.updateChips(
      id,
      spId,
      user,
      body.chipsEnd ?? null,
    );
    return { ok: true };
  }

  @Post(":id/lock")
  @Throttle({ write: { limit: 10, ttl: 60_000 } })
  async lock(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.sessionsService.lock(id, user);
  }

  @Sse(":id/stream")
  @SkipThrottle()
  stream(@Param("id") id: string): Observable<SseMessage> {
    return this.events.streamFor(id);
  }
}
