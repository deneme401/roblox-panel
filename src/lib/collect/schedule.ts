// Hangi zamanlanmış iş hangi alt işleri çalıştırır.
//   hourly  → collect-hourly (listeler + snapshot)
//   daily   → collect-passes, rollup, ai-tags (Gemini key varsa)
//   signals → collect-signals (Apify, günlük; APIFY_TOKEN varsa)
import { collectHourly, collectPasses, rollup, runJob, type JobOutcome } from "./jobs";
import { collectSignals } from "./signals";
import { tagGames } from "@/lib/ai/tasks";

export const SCHEDULED_JOBS = ["hourly", "daily", "signals"] as const;
export type ScheduledJob = (typeof SCHEDULED_JOBS)[number];

export async function runScheduledJob(job: ScheduledJob): Promise<JobOutcome[]> {
  switch (job) {
    case "hourly":
      return [await runJob("collect-hourly", collectHourly)];
    case "daily": {
      const out = [await runJob("collect-passes", collectPasses), await runJob("rollup", rollup)];
      if (process.env.GEMINI_API_KEY) out.push(await runJob("ai-tags", () => tagGames(25)));
      return out;
    }
    case "signals":
      if (!process.env.APIFY_TOKEN) return [{ job: "collect-signals", ok: true, rows: 0, message: "APIFY_TOKEN yok, atlandı" }];
      return [await runJob("collect-signals", collectSignals)];
  }
}
