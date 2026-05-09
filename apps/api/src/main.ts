import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

type DeployInfo = {
  sha: string;
  shortSha: string;
  branch: string;
  message: string;
  deployedAt: string;
};

function readDeployInfo(): DeployInfo {
  // version.json is written by deploy.sh on every deploy. In dev it does not
  // exist, so we fall back to "dev".
  try {
    const path = resolve(process.cwd(), "version.json");
    return JSON.parse(readFileSync(path, "utf8")) as DeployInfo;
  } catch {
    return {
      sha: "dev",
      shortSha: "dev",
      branch: "local",
      message: "(running from source)",
      deployedAt: new Date().toISOString(),
    };
  }
}

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

  const deploy = readDeployInfo();
  const swaggerDescription = [
    "Office Poker ELO Tracker API",
    "",
    `**Build**: \`${deploy.shortSha}\` (${deploy.branch})`,
    `**Deployed**: ${deploy.deployedAt}`,
    `**Commit**: ${deploy.message}`,
  ].join("\n");
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Z-Poker API")
    .setDescription(swaggerDescription)
    .setVersion(deploy.shortSha)
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
