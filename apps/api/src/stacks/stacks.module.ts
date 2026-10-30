import { Module } from "@nestjs/common";
import { StacksService } from "./stacks.service";
import { StacksListener } from "./stacks.listener";

@Module({
  providers: [StacksService, StacksListener],
  exports: [StacksService],
})
export class StacksModule {}
