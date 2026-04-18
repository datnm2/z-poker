import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Session } from "../session.entity";
import { SessionPlayer } from "../session-player.entity";
import { HighlightsService } from "./highlights.service";
import { AiModule } from "../../ai/ai.module";
import { PlayersModule } from "../../players/players.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionPlayer]),
    AiModule,
    PlayersModule,
  ],
  providers: [HighlightsService],
  exports: [HighlightsService],
})
export class HighlightsModule {}
