import { Module } from "@nestjs/common";
import { StacksService } from "./stacks.service";
import { StacksController } from "./stacks.controller";
import { StacksListener } from "./stacks.listener";

@Module({
  controllers: [StacksController],
  providers: [StacksService, StacksListener],
  exports: [StacksService],
})
export class StacksModule {}
