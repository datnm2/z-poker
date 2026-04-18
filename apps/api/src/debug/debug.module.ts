import { Module } from "@nestjs/common";
import { DebugController } from "./debug.controller";
import { DebugGuard } from "./debug.guard";

@Module({
  controllers: [DebugController],
  providers: [DebugGuard],
})
export class DebugModule {}
