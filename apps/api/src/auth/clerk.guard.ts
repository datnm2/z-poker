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

@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);
  private readonly clerk: ReturnType<typeof createClerkClient>;
  private readonly secretKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.secretKey = this.config.getOrThrow<string>("CLERK_SECRET_KEY");
    this.clerk = createClerkClient({ secretKey: this.secretKey });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Accept token via Authorization header OR ?token= query param (for EventSource/SSE)
    const authHeader: string | undefined = request.headers?.authorization;
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    const queryToken: string | undefined =
      typeof request.query?.token === "string" ? request.query.token : undefined;
    const token = bearer ?? queryToken;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let userId: string;
    try {
      const payload = await verifyToken(token, { secretKey: this.secretKey });
      userId = payload.sub;
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid token");
    }

    // Fetch user so we have email — Clerk JWTs don't carry email by default.
    const user = await this.clerk.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      throw new UnauthorizedException("User has no primary email");
    }

    const domain = email.split("@")[1] ?? "";
    const authedUser: AuthedUser = { userId, email, domain };
    request.user = authedUser;
    return true;
  }
}
