import { Global, Module } from "@nestjs/common";
import { SessionsEventsService } from "./sessions.events";

@Global()
@Module({
  providers: [SessionsEventsService],
  exports: [SessionsEventsService],
})
export class SessionsEventsModule {}
