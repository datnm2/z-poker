import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Player } from "../players/player.entity";
import { SeasonResult } from "./season-result.entity";
import { SeasonRecap } from "./season-recap.entity";
import { SeasonsService } from "./seasons.service";
import { SeasonsController } from "./seasons.controller";
import { SeasonRecapProseService } from "./season-recap-prose.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, SeasonResult, SeasonRecap]),
    AiModule,
  ],
  providers: [SeasonsService, SeasonRecapProseService],
  controllers: [SeasonsController],
  exports: [SeasonsService],
})
export class SeasonsModule {}
