import { Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type AuthedUser } from "./current-user.decorator";
import { SseTicketService } from "./sse-ticket.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly tickets: SseTicketService) {}

  @Post("sse-ticket")
  @Throttle({ write: { limit: 30, ttl: 60_000 } })
  issueTicket(@CurrentUser() user: AuthedUser) {
    return { ticket: this.tickets.issue(user), expiresIn: 60 };
  }
}
