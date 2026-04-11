import { Module } from "@nestjs/common";
import { EloService } from "./elo.service";

@Module({
  providers: [EloService],
  exports: [EloService],
})
export class EloModule {}
