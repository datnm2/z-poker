import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const webOrigin = config.get<string>("WEB_ORIGIN") ?? "http://localhost:3030";
  const allowedOrigins = webOrigin.split(",").map((o) => o.trim());
  const isDev = (config.get<string>("NODE_ENV") ?? "development") !== "production";
  // Dev: allow localhost + any LAN IP (10.x, 172.16-31.x, 192.168.x) on any port
  //      so the web app can be accessed from a phone via Mac's LAN IP without
  //      editing WEB_ORIGIN every time the IP changes.
  // Prod: strict whitelist from WEB_ORIGIN.
  const lanHostRegex =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (isDev && lanHostRegex.test(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Z-Poker API")
    .setDescription("Office Poker ELO Tracker API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    customCssUrl:
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    customJs: [
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
    ],
  });

  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
