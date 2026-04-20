import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import type { AuthedUser } from "./current-user.decorator";

const TICKET_TTL_MS = 60_000;
const MAX_TICKETS = 10_000;

interface Ticket {
  user: AuthedUser;
  expiresAt: number;
}

@Injectable()
export class SseTicketService {
  private readonly tickets = new Map<string, Ticket>();

  issue(user: AuthedUser): string {
    this.evictExpired();
    if (this.tickets.size > MAX_TICKETS) {
      this.tickets.clear();
    }
    const id = randomBytes(24).toString("base64url");
    this.tickets.set(id, { user, expiresAt: Date.now() + TICKET_TTL_MS });
    return id;
  }

  // Single-use: consume removes the ticket.
  consume(id: string): AuthedUser | null {
    const t = this.tickets.get(id);
    if (!t) return null;
    this.tickets.delete(id);
    if (t.expiresAt <= Date.now()) return null;
    return t.user;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, t] of this.tickets) {
      if (t.expiresAt <= now) this.tickets.delete(id);
    }
  }
}
