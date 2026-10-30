import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Player } from "./player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { PlayersService } from "./players.service";
import { PlayersController } from "./players.controller";
import { StacksModule } from "../stacks/stacks.module";

@Module({
  imports: [TypeOrmModule.forFeature([Player, Session, SessionPlayer]), StacksModule],
  providers: [PlayersService],
  controllers: [PlayersController],
  exports: [PlayersService],
})
export class PlayersModule {}
