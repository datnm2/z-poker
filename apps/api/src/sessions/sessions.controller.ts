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
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Observable } from "rxjs";
import { SessionsService } from "./sessions.service";
import { SessionsEventsService, type SseMessage } from "./sessions.events";
import { CurrentUser, type AuthedUser } from "../auth/current-user.decorator";

class CreateSessionDto {
  @IsInt()
  @Min(1)
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
  async create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateSessionDto,
  ) {
    return this.sessionsService.create(user, body);
  }

  // Domain-wide SSE: all events for sessions in the caller's email domain.
  // MUST be declared before @Get(":id") so Nest doesn't match :id="stream".
  @Sse("stream")
  streamDomain(@CurrentUser() user: AuthedUser): Observable<SseMessage> {
    return this.events.streamForDomain(user.domain);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.sessionsService.getDetail(id, user.domain);
  }

  @Post(":id/players")
  async addPlayer(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() body: AddPlayerDto,
  ) {
    return this.sessionsService.addPlayer(id, user, body);
  }

  @Patch(":id/players/:spId")
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
  async lock(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.sessionsService.lock(id, user);
  }

  @Sse(":id/stream")
  stream(@Param("id") id: string): Observable<SseMessage> {
    return this.events.streamFor(id);
  }
}
