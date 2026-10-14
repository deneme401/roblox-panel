// Tek oyunun DB'deki geçmişi ve ekip verisi (oyun detay sayfası).
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { sql } from "@/lib/db";
import type { GameAnalysis } from "@/lib/ai/tasks";
import { MARKET_TAG } from "./market";

export type GameHistory = {
  inDb: boolean;
  tracked: boolean;
  trackedBy: string | null;
  growth24h: number | null;
  growth7d: number | null;
  visits24h: number | null;
  riseScore: number | null;
  aiTags: string[];
  hourly: { ts: string; playing: number; visits: number }[];
  daily: { day: string; avgPlaying: number; peakPlaying: number; visits: number }[];
  sorts: { sortId: string; firstSeenAt: string; lastSeenAt: string; bestRank: number; lastRank: number }[];
  updates: string[];
  passes: { passId: number; name: string; price: number | null; isForSale: boolean; firstSeenAt: string }[];
};

/** Saatlik/günlük geçmiş, liste geçmişi, güncellemeler, gamepass'ler. 5 dk önbellek. */
export async function getGameHistory(universeId: number): Promise<GameHistory> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG, `game-${universeId}`);

  const [g] = await sql<{ tracked: boolean; trackedBy: string | null; aiTags: string[] }[]>`
    select tracked, tracked_by, ai_tags from games where universe_id = ${universeId}`;
  if (!g)
    return { inDb: false, tracked: false, trackedBy: null, growth24h: null, growth7d: null, visits24h: null, riseScore: null, aiTags: [], hourly: [], daily: [], sorts: [], updates: [], passes: [] };

  const [[m], hourly, daily, sorts, updates, passes] = await Promise.all([
    sql<{ growth24h: number | null; growth7d: number | null; visits24h: number | null; riseScore: number | null }[]>`
      select growth_24h, growth_7d, visits_24h, rise_score from game_metrics where universe_id = ${universeId}`,
    sql<{ ts: Date; playing: number; visits: number }[]>`
      select ts, playing, visits from game_snapshots where universe_id = ${universeId} order by ts`,
    sql<{ day: string; avgPlaying: number; peakPlaying: number; visits: number }[]>`
      select day::text, avg_playing, peak_playing, visits from game_daily where universe_id = ${universeId} order by day`,
    sql<{ sortId: string; firstSeenAt: Date; lastSeenAt: Date; bestRank: number; lastRank: number }[]>`
      select sort_id, first_seen_at, last_seen_at, best_rank, last_rank from sort_presence where universe_id = ${universeId}
      order by last_seen_at desc`,
    sql<{ updatedAtRbx: Date }[]>`
      select updated_at_rbx from game_updates where universe_id = ${universeId} order by updated_at_rbx desc limit 20`,
    sql<{ passId: number; name: string; price: number | null; isForSale: boolean; firstSeenAt: Date }[]>`
      select pass_id, name, price, is_for_sale, first_seen_at from game_passes where universe_id = ${universeId}
      order by price nulls last`,
  ]);
  const iso = (d: Date) => new Date(d).toISOString();
  return {
    inDb: true,
    tracked: g.tracked,
    trackedBy: g.trackedBy,
    growth24h: m?.growth24h ?? null,
    growth7d: m?.growth7d ?? null,
    visits24h: m?.visits24h ?? null,
    riseScore: m?.riseScore ?? null,
    aiTags: g.aiTags,
    hourly: hourly.map((h) => ({ ts: iso(h.ts), playing: h.playing, visits: h.visits })),
    daily,
    sorts: sorts.map((s) => ({ ...s, firstSeenAt: iso(s.firstSeenAt), lastSeenAt: iso(s.lastSeenAt) })),
    updates: updates.map((u) => iso(u.updatedAtRbx)),
    passes: passes.map((p) => ({ ...p, firstSeenAt: iso(p.firstSeenAt) })),
  };
}

/** AI analizi (önbelleksiz: buton sonrası hemen görünsün). */
export async function getGameAnalysis(universeId: number) {
  await connection();
  const [r] = await sql<{ aiAnalysis: GameAnalysis | null; aiModel: string | null; aiAnalyzedAt: Date | null }[]>`
    select ai_analysis, ai_model, ai_analyzed_at from games where universe_id = ${universeId}`;
  return r ?? null;
}

/** Bu oyuna bağlı fikirler. */
export async function getGameIdeas(universeId: number) {
  await connection();
  return sql<{ id: string; title: string; status: string }[]>`
    select i.id, i.title, i.status from idea_games ig join ideas i on i.id = ig.idea_id where ig.universe_id = ${universeId}`;
}
