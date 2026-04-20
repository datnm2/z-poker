import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ClerkGuard } from "./clerk.guard";
import { AuthController } from "./auth.controller";
import { SseTicketService } from "./sse-ticket.service";

@Global()
@Module({
  providers: [
    ClerkGuard,
    SseTicketService,
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
  ],
  controllers: [AuthController],
  exports: [ClerkGuard, SseTicketService],
})
export class AuthModule {}
