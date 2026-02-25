import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: "db.rruwdbughevinasxwmuv.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "Beaworldchanger23!",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("Connected to Supabase database");

  const sql = readFileSync(
    resolve(__dirname, "../supabase/migrations/002_enrichment_engine.sql"),
    "utf8"
  );

  try {
    await client.query(sql);
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
