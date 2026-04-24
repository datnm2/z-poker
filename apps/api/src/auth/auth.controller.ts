import { Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type AuthedUser } from "./current-user.decorator";
import { SseTicketService } from "./sse-ticket.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly tickets: SseTicketService) {}

  @Post("sse-ticket")
  // Tickets are single-use, so every SSE (re)connect mints one. Uses its
  // own `sse` bucket so it doesn't eat into the `write` budget that real
  // mutations (addPlayer / updateChips / lock) share per user.
  @Throttle({ sse: { limit: 120, ttl: 60_000 } })
  issueTicket(@CurrentUser() user: AuthedUser) {
    return { ticket: this.tickets.issue(user), expiresIn: 60 };
  }
}
