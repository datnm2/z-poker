import { Body, Controller, ForbiddenException, Get, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { SeasonsService } from "./seasons.service";
import { CurrentUser, type AuthedUser } from "../auth/current-user.decorator";
import { previousSeasonKey } from "./season.util";

class CloseSeasonDto {
  @IsString()
  domain!: string;

  @IsOptional()
  @IsString()
  seasonKey?: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}

class RecapVisibilityDto {
  @IsString()
  domain!: string;

  @IsOptional()
  @IsString()
  seasonKey?: string;

  @IsBoolean()
  visible!: boolean;
}

@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get("latest")
  @Throttle({ read: { limit: 60, ttl: 60_000 } })
  async latest(@CurrentUser() user: AuthedUser) {
    return this.seasons.latest(user.domain);
  }

  @Get("recap")
  @Throttle({ read: { limit: 60, ttl: 60_000 } })
  async recap(@CurrentUser() user: AuthedUser, @Query("season") season?: string) {
    const seasonKey = season ?? previousSeasonKey(new Date());
    return this.seasons.getRecap(user.domain, seasonKey);
  }

  // Manual season close. Domain is passed explicitly, but must match the caller's
  // own domain — a creator can only close their own company's season.
  @Post("close")
  @Throttle({ write: { limit: 1, ttl: 60_000 } })
  async close(@CurrentUser() user: AuthedUser, @Body() body: CloseSeasonDto) {
    if (body.domain !== user.domain) {
      throw new ForbiddenException("Cannot close a season for another domain");
    }
    const seasonKey = body.seasonKey ?? previousSeasonKey(new Date());
    return this.seasons.closeSeason(body.domain, seasonKey, body.personaId ?? null);
  }

  // Admin toggle: show/hide the recap button + auto-open for a season.
  @Post("recap/visibility")
  @Throttle({ write: { limit: 10, ttl: 60_000 } })
  async setRecapVisibility(
    @CurrentUser() user: AuthedUser,
    @Body() body: RecapVisibilityDto,
  ) {
    if (body.domain !== user.domain) {
      throw new ForbiddenException("Cannot change recap for another domain");
    }
    const seasonKey = body.seasonKey ?? previousSeasonKey(new Date());
    return this.seasons.setRecapVisible(body.domain, seasonKey, body.visible);
  }
}
