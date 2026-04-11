import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const webOrigin = config.get<string>("WEB_ORIGIN") ?? "http://localhost:3030";
  const allowedOrigins = webOrigin.split(",").map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>("PORT") ?? 3031;
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}`);
}

bootstrap();
