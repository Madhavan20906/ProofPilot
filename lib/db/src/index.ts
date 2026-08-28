import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/proofpilot";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
