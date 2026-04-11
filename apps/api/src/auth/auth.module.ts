import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ClerkGuard } from "./clerk.guard";

@Global()
@Module({
  providers: [
    ClerkGuard,
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
  ],
  exports: [ClerkGuard],
})
export class AuthModule {}
