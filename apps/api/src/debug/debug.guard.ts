import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";

@Injectable()
export class DebugGuard implements CanActivate {
  private readonly logger = new Logger(DebugGuard.name);
  private readonly token: string | undefined = process.env.DEBUG_TOKEN;
  private readonly disabled: boolean =
    process.env.NODE_ENV === "production" && !process.env.DEBUG_TOKEN;

  canActivate(context: ExecutionContext): boolean {
    if (this.disabled) {
      throw new NotFoundException();
    }
    if (!this.token) {
      this.logger.warn("DEBUG_TOKEN not set — debug endpoints disabled");
      throw new NotFoundException();
    }

    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers?.authorization;
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    const headerToken: string | undefined =
      typeof req.headers?.["x-debug-token"] === "string"
        ? req.headers["x-debug-token"]
        : undefined;
    const queryToken: string | undefined =
      typeof req.query?.token === "string" ? req.query.token : undefined;
    const provided = bearer ?? headerToken ?? queryToken;

    if (!provided || !safeEqual(provided, this.token)) {
      throw new UnauthorizedException("Invalid debug token");
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
