import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthedUser {
  userId: string; // Clerk user ID
  email: string;
  domain: string; // split_part(email, '@', 2)
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthedUser;
  },
);
