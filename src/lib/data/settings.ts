// Ayarlar sayfası verisi: iş durumları, AI çağrı istatistikleri, takip listesi, DB boyutu.
import { connection } from "next/server";
import { sql } from "@/lib/db";
import { getAutoTrack } from "./app-settings";

export async function getSettingsData() {
  await connection();
  const [jobs, recent, ai, tracked, [size], [counts], autoTrack] = await Promise.all([
    sql<{ job: string; startedAt: Date; finishedAt: Date | null; ok: boolean | null; rows: number | null; message: string | null }[]>`
      select distinct on (job) job, started_at, finished_at, ok, rows, message from job_runs order by job, started_at desc`,
    sql<{ id: number; job: string; startedAt: Date; finishedAt: Date | null; ok: boolean | null; message: string | null }[]>`
      select id, job, started_at, finished_at, ok, message from job_runs order by started_at desc limit 15`,
    sql<{ model: string; ok: number; fail: number; lastError: string | null; avgMs: number | null }[]>`
      select model, count(*) filter (where ok)::int as ok, count(*) filter (where not ok)::int as fail,
        (array_agg(error order by created_at desc) filter (where not ok))[1] as last_error,
        round(avg(ms) filter (where ok)) as avg_ms
      from ai_calls where created_at > now() - interval '24 hours' group by model`,
    sql<{ universeId: number; name: string; iconUrl: string | null; trackedBy: string | null; trackedAuto: boolean; playing: number | null }[]>`
      select g.universe_id, g.name, g.icon_url, g.tracked_by, g.tracked_auto, m.playing
      from games g left join game_metrics m using (universe_id) where g.tracked order by m.playing desc nulls last`,
    sql<{ bytes: number }[]>`select pg_database_size(current_database()) as bytes`,
    sql<{ games: number; snapshots: number; signals: number; notes: number; ideas: number }[]>`
      select (select count(*) from games)::int as games, (select count(*) from game_snapshots)::int as snapshots,
        (select count(*) from signals)::int as signals, (select count(*) from notes)::int as notes, (select count(*) from ideas)::int as ideas`,
    getAutoTrack(),
  ]);
  return { jobs, recent, ai, tracked, dbBytes: size.bytes, counts, autoTrack };
}
