// Supabase pg_cron + pg_net zamanlamasını kurar (ADR #3). Deploy sonrası bir kez çalıştırılır:
//   node scripts/setup-cron.mjs https://<vercel-adresi>
// CRON_SECRET .env.local'dan okunur ve Supabase Vault'ta saklanır (git'e/SQL dosyasına yazılmaz).
// Tekrar çalıştırmak güvenlidir: işler ve vault kayıtları güncellenir.
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

const appUrl = process.argv[2]?.replace(/\/$/, "");
if (!appUrl?.startsWith("https://")) {
  console.error("Kullanım: node scripts/setup-cron.mjs https://<uygulama-adresi>");
  process.exit(1);
}
const env = loadEnv();
if (!env.CRON_SECRET) throw new Error("CRON_SECRET yok (.env.local)");
const sql = postgres(env.DATABASE_URL_DIRECT ?? env.DATABASE_URL, { ssl: "require", max: 1, prepare: false, onnotice: () => {} });

await sql`create extension if not exists pg_cron`;
await sql`create extension if not exists pg_net`;

async function putSecret(name, value) {
  const [row] = await sql`select id from vault.secrets where name = ${name}`;
  if (row) await sql`select vault.update_secret(${row.id}, ${value})`;
  else await sql`select vault.create_secret(${value}, ${name})`;
}
await putSecret("rr_app_url", appUrl);
await putSecret("rr_cron_secret", env.CRON_SECRET);

// Vault'tan okuyup route'u çağıran yardımcı fonksiyon
await sql.unsafe(`
  create or replace function public.rr_call(job text) returns bigint
  language sql security definer set search_path = public, extensions as $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'rr_app_url') || '/api/cron/' || job,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'rr_cron_secret'),
        'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000
    );
  $$;
  revoke all on function public.rr_call(text) from public, anon, authenticated;
`);

// Saatler UTC. Türkiye = UTC+3 → günlük iş 06:10 TR, sinyaller 12:00 TR.
const jobs = [
  ["rr-hourly", "5 * * * *", "hourly"],
  ["rr-daily", "10 3 * * *", "daily"],
  ["rr-signals", "0 9 * * *", "signals"],
];
for (const [name, schedule, job] of jobs) {
  await sql`select cron.schedule(${name}, ${schedule}, ${`select public.rr_call('${job}')`})`;
}
// pg_net cevap tablosunu ve cron geçmişini şişirme
await sql`select cron.schedule('rr-cleanup', '30 4 * * *', ${"delete from net._http_response where created < now() - interval '2 days'; delete from cron.job_run_details where end_time < now() - interval '7 days'"})`;

console.log(await sql`select jobname, schedule, active from cron.job order by jobname`);
console.log("Zamanlama kuruldu →", appUrl);
await sql.end();
