import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PlayersService } from "./players.service";
import { CurrentUser, type AuthedUser } from "../auth/current-user.decorator";

class UpdateMeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

class GetHistoryQuery {
  @IsOptional()
  @IsString()
  limit?: string;
}

@Controller("players")
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthedUser) {
    return this.players.findOrCreateMe(user, user.email.split("@")[0]);
  }

  @Patch("me")
  @Throttle({ write: { limit: 20, ttl: 60_000 } })
  async updateMe(@CurrentUser() user: AuthedUser, @Body() body: UpdateMeDto) {
    return this.players.updateMe(user, body.name);
  }

  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    return this.players.listForDomain(user.domain);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.players.getByIdForDomain(id, user.domain);
  }

  @Get(":id/history")
  async history(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Query() query: GetHistoryQuery,
  ) {
    const limit = query.limit ? Math.min(parseInt(query.limit, 10) || 20, 100) : 20;
    return this.players.getHistory(id, user.domain, limit);
  }
}
