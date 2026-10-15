// Kıyaslama verisi: 2-5 oyunun metrikleri, geçmişi ve monetizasyonu.
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "@/lib/db";
import { fillAges, getGameDetail, tryLive } from "@/lib/roblox/queries";
import { MARKET_TAG } from "./market";

export type CompareGame = {
  universeId: number;
  name: string;
  icon: string | null;
  genre: string | null;
  playing: number;
  visits: number;
  favorites: number;
  likeRatio: number | null;
  growth24h: number | null;
  growth7d: number | null;
  visits24h: number | null;
  riseScore: number | null;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
  updatedDaysAgo: number;
  passCount: number;
  priceMin: number | null;
  priceMedian: number | null;
  priceMax: number | null;
  prices: number[];
  hourly: { ts: string; playing: number }[];
  daily: { day: string; avgPlaying: number }[];
};

export async function getCompareData(ids: number[]): Promise<CompareGame[]> {
  return fillAges(await compareCached(ids));
}

async function compareCached(ids: number[]): Promise<CompareGame[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG);
  if (!ids.length) return [];

  const rows = await sql<
    {
      universeId: number;
      name: string;
      iconUrl: string | null;
      genre: string | null;
      playing: number | null;
      visits: number | null;
      favorites: number | null;
      likeRatio: number | null;
      growth24h: number | null;
      growth7d: number | null;
      visits24h: number | null;
      riseScore: number | null;
      createdAtRbx: Date | null;
      updatedAtRbx: Date | null;
      prices: number[] | null;
    }[]
  >`
    select g.universe_id, g.name, g.icon_url, g.genre, m.playing, m.visits, m.favorites, m.like_ratio, m.growth_24h, m.growth_7d,
      m.visits_24h, m.rise_score, g.created_at_rbx, g.updated_at_rbx,
      (select array_agg(price order by price) from game_passes p where p.universe_id = g.universe_id and p.is_for_sale and price > 0) as prices
    from games g left join game_metrics m using (universe_id)
    where g.universe_id in ${sql(ids)}`;
  const hourly = await sql<{ universeId: number; ts: Date; playing: number }[]>`
    select universe_id, ts, playing from game_snapshots
    where universe_id in ${sql(ids)} and ts > now() - interval '7 days' order by ts`;
  const daily = await sql<{ universeId: number; day: string; avgPlaying: number }[]>`
    select universe_id, day::text, avg_playing from game_daily where universe_id in ${sql(ids)} order by day`;

  const out: CompareGame[] = [];
  for (const id of ids) {
    const r = rows.find((x) => x.universeId === id);
    // DB'de yoksa ya da anlık değer eksikse canlı API'den tamamla
    const live = !r || r.playing == null ? await tryLive(() => getGameDetail(id)) : null;
    if (!r && !live) continue;
    const prices = (r?.prices ?? live?.passes.map((p) => p.price ?? 0).filter((p) => p > 0) ?? []).map(Number).sort((a, b) => a - b);
    const created = r?.createdAtRbx ? new Date(r.createdAtRbx).toISOString() : (live?.createdAt ?? new Date(0).toISOString());
    const updated = r?.updatedAtRbx ? new Date(r.updatedAtRbx).toISOString() : (live?.updatedAt ?? created);
    out.push({
      universeId: id,
      name: r?.name ?? live!.name,
      icon: r?.iconUrl ?? live?.icon ?? null,
      genre: r?.genre ?? live?.genre ?? null,
      playing: r?.playing ?? live?.playing ?? 0,
      visits: r?.visits ?? live?.visits ?? 0,
      favorites: r?.favorites ?? live?.favorites ?? 0,
      likeRatio: r?.likeRatio ?? live?.likeRatio ?? null,
      growth24h: r?.growth24h ?? null,
      growth7d: r?.growth7d ?? null,
      visits24h: r?.visits24h ?? null,
      riseScore: r?.riseScore ?? null,
      createdAt: created,
      updatedAt: updated,
      ageDays: 0,
      updatedDaysAgo: 0,
      passCount: prices.length,
      priceMin: prices[0] ?? null,
      priceMedian: prices.length ? prices[Math.floor(prices.length / 2)] : null,
      priceMax: prices.at(-1) ?? null,
      prices,
      hourly: hourly.filter((h) => h.universeId === id).map((h) => ({ ts: new Date(h.ts).toISOString(), playing: h.playing })),
      daily: daily.filter((d) => d.universeId === id).map((d) => ({ day: d.day, avgPlaying: d.avgPlaying })),
    });
  }
  return out;
}

/** Seçici için aday oyunlar: takiptekiler + listelerde son 2 günde görünenler. */
export async function getComparePool() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG);
  return sql<{ universeId: number; name: string; iconUrl: string | null; playing: number | null; tracked: boolean }[]>`
    select g.universe_id, g.name, g.icon_url, m.playing, g.tracked
    from games g left join game_metrics m using (universe_id)
    where g.tracked or g.last_seen_in_sort_at > now() - interval '2 days'
       or g.universe_id in (select universe_id from idea_games)
    order by g.tracked desc, m.playing desc nulls last`;
}
