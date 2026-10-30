/**
 * Recompute chip stacks from scratch.
 *
 * Usage:
 *   yarn workspace api stack:rebuild                 # all domains
 *   DOMAIN=acme.com yarn workspace api stack:rebuild # one domain
 */
import "reflect-metadata";
import dataSource from "../src/config/data-source";
import { StacksService } from "../src/stacks/stacks.service";

async function main() {
  await dataSource.initialize();
  const service = new StacksService(dataSource);
  const only = process.env.DOMAIN;
  const domains: string[] = only
    ? [only]
    : (await dataSource.query(`SELECT DISTINCT domain FROM players`)).map(
        (r: { domain: string }) => r.domain,
      );
  for (const d of domains) {
    const ids = await service.rebuild(d);
    console.log(`${d}: rebuilt ${ids.length} player stacks`);
  }
  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
