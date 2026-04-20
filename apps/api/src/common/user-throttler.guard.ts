import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { AuthedUser } from "../auth/current-user.decorator";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: {
    user?: AuthedUser;
    ip?: string;
    ips?: string[];
  }): Promise<string> {
    if (req.user?.userId) return `user:${req.user.userId}`;
    return `ip:${req.ips?.[0] ?? req.ip ?? "unknown"}`;
  }
}
