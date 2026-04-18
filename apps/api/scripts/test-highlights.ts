import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppModule } from "../src/app.module";
import { HighlightsService } from "../src/sessions/highlights/highlights.service";
import { Session } from "../src/sessions/session.entity";

async function main() {
  const sessionIdArg = process.argv[2];
  const domainArg = process.argv[3];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const sessions = app.get<Repository<Session>>(getRepositoryToken(Session));

  let sessionId = sessionIdArg;
  let domain = domainArg;

  if (!sessionId || !domain) {
    const latest = await sessions
      .createQueryBuilder("s")
      .where("s.is_locked = true")
      .orderBy("s.locked_at", "DESC")
      .limit(1)
      .getOne();
    if (!latest) {
      console.error("No locked sessions found in DB");
      await app.close();
      process.exit(1);
    }
    sessionId = latest.id;
    domain = latest.domain;
    console.log(`[auto] latest locked session: ${sessionId} (domain=${domain})`);
  }

  const svc = app.get(HighlightsService);
  console.log(`Generating highlights for session ${sessionId}...`);
  await svc.generateForSession(sessionId, domain);

  const row = await sessions.findOne({ where: { id: sessionId } });
  console.log("---");
  console.log(JSON.stringify(row?.highlights ?? null, null, 2));

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
