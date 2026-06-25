import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Player } from "../players/player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { SeasonRecap } from "../seasons/season-recap.entity";
import { EmailService } from "./email.service";

@Module({
  imports: [TypeOrmModule.forFeature([Player, Session, SessionPlayer, SeasonRecap])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
