import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { createClerkClient, verifyToken } from "@clerk/backend";
import type { AuthedUser } from "./current-user.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { SseTicketService } from "./sse-ticket.service";

interface CachedUser {
  email: string;
  domain: string;
  avatarUrl: string | undefined;
  expiresAt: number;
}

const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);
  private readonly clerk: ReturnType<typeof createClerkClient>;
  private readonly secretKey: string;
  private readonly userCache = new Map<string, CachedUser>();

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly tickets: SseTicketService,
  ) {
    this.secretKey = this.config.getOrThrow<string>("CLERK_SECRET_KEY");
    this.clerk = createClerkClient({ secretKey: this.secretKey });
  }

  // Active only when NODE_ENV !== production AND both DEBUG_API_TOKEN +
  // DEBUG_USER_EMAIL are set and the request carries the matching header.
  private tryDebugBypass(request: {
    headers?: Record<string, unknown>;
  }): AuthedUser | undefined {
    if (this.config.get<string>("NODE_ENV") === "production") return undefined;
    const debugToken = this.config.get<string>("DEBUG_API_TOKEN");
    const debugEmail = this.config.get<string>("DEBUG_USER_EMAIL");
    if (!debugToken || !debugEmail) return undefined;
    const provided = request.headers?.["x-debug-token"];
    if (provided !== debugToken) return undefined;

    this.logger.warn(`Auth bypass via x-debug-token as ${debugEmail}`);
    return {
      userId: "debug-user",
      email: debugEmail,
      domain: debugEmail.split("@")[1] ?? "",
      avatarUrl: undefined,
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Local-only auth bypass via `x-debug-token` header (no-op in production).
    const debugUser = this.tryDebugBypass(request);
    if (debugUser) {
      request.user = debugUser;
      return true;
    }

    // SSE path: single-use ticket via ?ticket= (can't set headers on EventSource).
    // Ticket is opaque random string, no JWT in URL/logs.
    const queryTicket: string | undefined =
      typeof request.query?.ticket === "string"
        ? request.query.ticket
        : undefined;
    if (queryTicket) {
      const user = this.tickets.consume(queryTicket);
      if (!user) throw new UnauthorizedException("Invalid or expired ticket");
      request.user = user;
      return true;
    }

    const authHeader: string | undefined = request.headers?.authorization;
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

    if (!bearer) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let userId: string;
    try {
      const payload = await verifyToken(bearer, { secretKey: this.secretKey });
      userId = payload.sub;
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).name}`);
      throw new UnauthorizedException("Invalid token");
    }

    const now = Date.now();
    let cached = this.userCache.get(userId);
    if (!cached || cached.expiresAt <= now) {
      const user = await this.clerk.users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) {
        throw new UnauthorizedException("User has no primary email");
      }
      cached = {
        email,
        domain: email.split("@")[1] ?? "",
        avatarUrl: user.imageUrl || undefined,
        expiresAt: now + USER_CACHE_TTL_MS,
      };
      this.userCache.set(userId, cached);
    }

    const authedUser: AuthedUser = {
      userId,
      email: cached.email,
      domain: cached.domain,
      avatarUrl: cached.avatarUrl,
    };
    request.user = authedUser;
    return true;
  }
}
