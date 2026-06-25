import { Body, Controller, ForbiddenException, Get, Header, Param, Post, Query, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import type { Response } from "express";
import { SeasonsService } from "./seasons.service";
import { EmailService } from "../email/email.service";
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

class GenerateRecapDto {
  @IsString()
  domain!: string;

  @IsString()
  personaId!: string;

  @IsOptional()
  @IsString()
  seasonKey?: string;
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
  constructor(
    private readonly seasons: SeasonsService,
    private readonly email: EmailService,
  ) {}

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

  // List of past (closed) seasons for the domain.
  @Get()
  @Throttle({ read: { limit: 60, ttl: 60_000 } })
  async list(@CurrentUser() user: AuthedUser) {
    return this.seasons.listClosed(user.domain);
  }

  // Snapshot standings for one season. Declared after the static routes above so
  // ":key" doesn't swallow "latest"/"recap".
  @Get(":key/standings")
  @Throttle({ read: { limit: 60, ttl: 60_000 } })
  async standings(@CurrentUser() user: AuthedUser, @Param("key") key: string) {
    return this.seasons.getStandings(user.domain, key);
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

  // Local dev only: preview the season recap email as HTML in browser.
  @Get("recap/preview-email")
  @Throttle({ read: { limit: 10, ttl: 60_000 } })
  async previewSeasonRecapEmail(
    @CurrentUser() user: AuthedUser,
    @Query("season") season: string | undefined,
    @Res() res: Response,
  ) {
    const seasonKey = season ?? previousSeasonKey(new Date());
    const html = await this.email.previewSeasonRecapHtml(user.domain, seasonKey, user.email.split("@")[0]);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }

  // Generate (or re-generate) prose for a specific persona for a given domain+season.
  @Post("recap/generate")
  @Throttle({ write: { limit: 20, ttl: 60_000 } })
  async generateRecap(@CurrentUser() user: AuthedUser, @Body() body: GenerateRecapDto) {
    if (body.domain !== user.domain) {
      throw new ForbiddenException("Cannot generate recap for another domain");
    }
    const seasonKey = body.seasonKey ?? previousSeasonKey(new Date());
    return this.seasons.generateRecapForPersona(body.domain, seasonKey, body.personaId);
  }

  // Kick off background generation for ALL personas for a domain+season.
  // Returns immediately — generation runs async.
  @Post("recap/generate-all")
  @Throttle({ write: { limit: 5, ttl: 60_000 } })
  async generateRecapAll(@CurrentUser() user: AuthedUser, @Body() body: Omit<GenerateRecapDto, "personaId"> & { seasonKey?: string }) {
    if (body.domain !== user.domain) {
      throw new ForbiddenException("Cannot generate recap for another domain");
    }
    const seasonKey = body.seasonKey ?? previousSeasonKey(new Date());
    void this.seasons.generateAllRecapPersonas(body.domain, seasonKey);
    return { ok: true, seasonKey };
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
