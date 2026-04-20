import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { CacheModule } from "./cache/cache.module";
import { DebugModule } from "./debug/debug.module";
import { PlayersModule } from "./players/players.module";
import { SessionsModule } from "./sessions/sessions.module";
import { SessionsEventsModule } from "./sessions/sessions-events.module";
import { UserThrottlerGuard } from "./common/user-throttler.guard";
import { SlowQueryLogger } from "./common/slow-query.logger";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>("DATABASE_URL");
        const useSsl = /neon\.tech|sslmode=require/.test(url);
        return {
          type: "postgres" as const,
          url,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: false,
          logger: new SlowQueryLogger(),
          maxQueryExecutionTime: 1000,
          extra: {
            max: 20,
            idleTimeoutMillis: 30_000,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 120 },
      { name: "write", ttl: 60_000, limit: 20 },
      { name: "ai", ttl: 60_000, limit: 5 },
    ]),
    AuthModule,
    SessionsEventsModule,
    CacheModule,
    PlayersModule,
    SessionsModule,
    AiModule,
    DebugModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: UserThrottlerGuard }],
})
export class AppModule {}
