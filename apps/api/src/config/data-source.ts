import "reflect-metadata";
import { DataSource } from "typeorm";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../.env") });

const dbUrl = process.env.DATABASE_URL ?? "";
const useSsl = /neon\.tech|sslmode=require/.test(dbUrl);

export default new DataSource({
  type: "postgres",
  url: dbUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: [resolve(__dirname, "../**/*.entity.{ts,js}")],
  migrations: [resolve(__dirname, "../../migrations/*.{ts,js}")],
});
