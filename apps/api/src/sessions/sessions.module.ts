import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Session } from "./session.entity";
import { SessionPlayer } from "./session-player.entity";
import { Player } from "../players/player.entity";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";
import { SessionsEventsService } from "./sessions.events";
import { EloModule } from "../elo/elo.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionPlayer, Player]),
    EloModule,
  ],
  providers: [SessionsService, SessionsEventsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
