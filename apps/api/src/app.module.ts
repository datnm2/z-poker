import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { CacheModule } from "./cache/cache.module";
import { PlayersModule } from "./players/players.module";
import { SessionsModule } from "./sessions/sessions.module";
import { SessionsEventsModule } from "./sessions/sessions-events.module";

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
          logging: ["warn", "error"] as const,
          maxQueryExecutionTime: 500,
          extra: {
            max: 20,
            idleTimeoutMillis: 30_000,
          },
        };
      },
    }),
    AuthModule,
    SessionsEventsModule,
    CacheModule,
    PlayersModule,
    SessionsModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
