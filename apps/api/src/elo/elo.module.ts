import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EloAdjustment } from "./elo-adjustment.entity";
import { EloService } from "./elo.service";

@Module({
  imports: [TypeOrmModule.forFeature([EloAdjustment])],
  providers: [EloService],
  exports: [EloService],
})
export class EloModule {}
