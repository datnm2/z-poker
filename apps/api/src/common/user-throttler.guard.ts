import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerLimitDetail } from "@nestjs/throttler";
import type { AuthedUser } from "../auth/current-user.decorator";

const THROTTLER_LIMIT = "THROTTLER:LIMIT";
const THROTTLER_TTL = "THROTTLER:TTL";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger("Throttler");

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const filtered = this.throttlers.filter((t) => {
      if (t.name === "default") return true;
      const hasLimit =
        this.reflector.getAllAndOverride(`${THROTTLER_LIMIT}${t.name}`, [
          handler,
          classRef,
        ]) !== undefined;
      const hasTtl =
        this.reflector.getAllAndOverride(`${THROTTLER_TTL}${t.name}`, [
          handler,
          classRef,
        ]) !== undefined;
      return hasLimit || hasTtl;
    });
    const original = this.throttlers;
    this.throttlers = filtered;
    try {
      return await super.canActivate(context);
    } finally {
      this.throttlers = original;
    }
  }

  protected async getTracker(req: {
    user?: AuthedUser;
    ip?: string;
    ips?: string[];
  }): Promise<string> {
    if (req.user?.userId) return `user:${req.user.userId}`;
    return `ip:${req.ips?.[0] ?? req.ip ?? "unknown"}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
      user?: AuthedUser;
      ip?: string;
      ips?: string[];
    }>();
    const handler = context.getHandler()?.name;
    const controller = context.getClass()?.name;
    this.logger.warn(
      `BLOCKED ${req.method ?? "?"} ${req.originalUrl ?? req.url ?? "?"} ` +
        `[${controller}.${handler}] ` +
        `tracker=${detail.tracker} bucket=${detail.key} ` +
        `hits=${detail.totalHits}/${detail.limit} ` +
        `ttl=${detail.ttl}ms expiresIn=${detail.timeToExpire}ms ` +
        `blocked=${detail.isBlocked} blockExpiresIn=${detail.timeToBlockExpire}ms ` +
        `userId=${req.user?.userId ?? "-"} domain=${req.user?.domain ?? "-"} ` +
        `ip=${req.ips?.[0] ?? req.ip ?? "-"}`,
    );
    return super.throwThrottlingException(context, detail);
  }
}
