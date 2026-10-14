// Zamanlanmış bir işi lokal çalıştırır: npx tsx --env-file=.env.local scripts/run-job.mts hourly|daily|signals
import { runScheduledJob, SCHEDULED_JOBS, type ScheduledJob } from "../src/lib/collect/schedule";
import { sql } from "../src/lib/db";

const job = process.argv[2] as ScheduledJob;
if (!SCHEDULED_JOBS.includes(job)) {
  console.error(`Kullanım: run-job.mts ${SCHEDULED_JOBS.join("|")}`);
  process.exit(1);
}
const results = await runScheduledJob(job);
console.log(JSON.stringify(results, null, 2));
await sql.end();
