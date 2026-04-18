import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

const DEFAULT_DEBUG_TOKEN = "zpoker-debug-2026";

@Injectable()
export class DebugGuard implements CanActivate {
  private readonly token: string =
    process.env.DEBUG_TOKEN ?? DEFAULT_DEBUG_TOKEN;

  canActivate(context: ExecutionContext): boolean {
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

    if (!provided || provided !== this.token) {
      throw new UnauthorizedException("Invalid debug token");
    }
    return true;
  }
}
