// supabase/migrations/*.sql dosyalarını sırayla uygular; uygulananlar _migrations tablosunda tutulur.
// Kullanım: node scripts/migrate.mjs  (DATABASE_URL_DIRECT, yoksa DATABASE_URL; .env.local'dan okunur)
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env.mjs";

const env = loadEnv();
const sql = postgres(env.DATABASE_URL_DIRECT ?? env.DATABASE_URL, { ssl: "require", max: 1, prepare: false, onnotice: () => {} });

await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`;
await sql`alter table _migrations enable row level security`;
const done = new Set((await sql`select name from _migrations`).map((r) => r.name));
const dir = "supabase/migrations";
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const body = fs.readFileSync(path.join(dir, f), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`insert into _migrations (name) values (${f})`;
  });
  console.log("uygulandı:", f);
}
console.log("migration tamam");
await sql.end();
