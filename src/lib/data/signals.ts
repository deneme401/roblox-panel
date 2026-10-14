// Sosyal sinyaller (YouTube/TikTok/Reddit) okuma. Toplama: lib/collect/signals.ts
import { connection } from "next/server";
import { sql } from "@/lib/db";

export type SignalRow = {
  id: number;
  source: "youtube" | "tiktok" | "reddit";
  url: string;
  title: string | null;
  author: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  thumbnail: string | null;
  publishedAt: Date | null;
  query: string | null;
  matchedUniverseId: number | null;
  gameName: string | null;
  gameIcon: string | null;
};

export async function listSignals(opts: { source?: string; matchedOnly?: boolean; universeId?: number; limit?: number } = {}) {
  await connection();
  return sql<SignalRow[]>`
    select s.id, s.source, s.url, s.title, s.author, s.views, s.likes, s.comments, s.thumbnail, s.published_at, s.query,
      s.matched_universe_id, g.name as game_name, g.icon_url as game_icon
    from signals s left join games g on g.universe_id = s.matched_universe_id
    where true
      ${opts.source ? sql`and s.source = ${opts.source}` : sql``}
      ${opts.matchedOnly ? sql`and s.matched_universe_id is not null` : sql``}
      ${opts.universeId ? sql`and s.matched_universe_id = ${opts.universeId}` : sql``}
    order by s.published_at desc nulls last
    limit ${opts.limit ?? 60}`;
}

/** En çok bahsedilen oyunlar (son 14 gün). */
export async function topMentioned(limit = 8) {
  await connection();
  return sql<{ universeId: number; name: string; iconUrl: string | null; mentions: number; views: number | null }[]>`
    select g.universe_id, g.name, g.icon_url, count(*)::int as mentions, sum(s.views)::bigint as views
    from signals s join games g on g.universe_id = s.matched_universe_id
    where s.published_at > now() - interval '14 days'
    group by 1, 2, 3 order by mentions desc, views desc nulls last limit ${limit}`;
}

export async function signalCounts() {
  await connection();
  return sql<{ source: string; n: number; lastFetched: Date | null }[]>`
    select source, count(*)::int as n, max(fetched_at) as last_fetched from signals group by source`;
}
