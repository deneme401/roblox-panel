// Sunucu tarafı Postgres istemcisi (Supabase transaction pooler). Tarayıcıya asla gitmez.
// Supabase'in publishable key'i tablolara erişemez (RLS açık, politika yok); tüm okuma/yazma buradan.
import postgres from "postgres";

const numeric = (oid: number) => ({ to: oid, from: [oid], serialize: (x: number) => String(x), parse: (x: string) => Number(x) });

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil (.env.local)");
  return postgres(url, {
    ssl: "require",
    prepare: false, // transaction pooler (6543) prepared statement desteklemez
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
    // bigint (20) ve numeric (1700) JS number olarak gelsin; değerlerimiz 2^53 altında
    types: { bigint: numeric(20), numeric: numeric(1700) },
  });
}

const g = globalThis as unknown as { __rrSql?: ReturnType<typeof create> };
export const sql = g.__rrSql ?? (g.__rrSql = create());

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}
