// Pazar verisi (Supabase'deki saatlik toplanan veriden). Sayfalar bunu okur; DB boşsa canlı API'ye düşer.
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "@/lib/db";
import { SORT_IDS, type SortId } from "@/lib/roblox/client";
import { fillAges, getDiscoverGames, tryLive, type GameRow } from "@/lib/roblox/queries";

export const MARKET_TAG = "market";

type MetricRow = {
  universeId: number;
  placeId: number | null;
  name: string;
  genre: string | null;
  subgenre: string | null;
  iconUrl: string | null;
  creatorName: string | null;
  tracked: boolean;
  createdAtRbx: Date | null;
  updatedAtRbx: Date | null;
  playing: number;
  visits: number;
  favorites: number;
  likeRatio: number | null;
  growth24h: number | null;
  growth7d: number | null;
  visits24h: number | null;
  riseScore: number | null;
  aiTags: string[];
};

function toGameRow(m: MetricRow, sorts: Partial<Record<SortId, number>>, spark: number[]): GameRow {
  const created = new Date(m.createdAtRbx ?? m.updatedAtRbx ?? 0);
  const updated = new Date(m.updatedAtRbx ?? m.createdAtRbx ?? 0);
  return {
    universeId: m.universeId,
    placeId: m.placeId ?? 0,
    name: m.name,
    icon: m.iconUrl,
    playing: m.playing,
    visits: m.visits,
    favorites: m.favorites,
    likeRatio: m.likeRatio,
    genre: m.genre,
    subgenre: m.subgenre,
    creator: m.creatorName ?? "—",
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    ageDays: 0, // fillAges ile istek anında
    updatedDaysAgo: 0,
    sorts,
    growth24h: m.growth24h,
    growth7d: m.growth7d,
    visits24h: m.visits24h,
    riseScore: m.riseScore,
    tracked: m.tracked,
    tags: m.aiTags,
    spark,
  };
}

/**
 * Listelerde son 2 günde görünen + takipteki oyunlar, metrik ve 48 saatlik sparkline ile.
 * `source` DB mi canlı mı olduğunu söyler.
 */
export async function getMarketRows(): Promise<{ games: GameRow[]; source: "db" | "live"; updatedAt: string | null }> {
  const r = await marketRowsCached();
  if (r.source === "db") return { ...r, games: fillAges(r.games) };
  // DB boş: canlı API'yi dene; ulaşılamazsa boş liste (sayfa çökmesin)
  const l = await tryLive(getDiscoverGames);
  return { games: l?.games ?? [], source: "live", updatedAt: l?.fetchedAt ?? null };
}

async function marketRowsCached(): Promise<{ games: GameRow[]; source: "db" | "live"; updatedAt: string | null }> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG);

  // Sorgular paralel: DB uzakken (lokal geliştirme) her ardışık sorgu bir gidiş-dönüş ekler
  const [metrics, ranks, sparks] = await Promise.all([
    sql<MetricRow[]>`
      select m.universe_id, m.place_id, m.name, m.genre, m.subgenre, m.icon_url, m.creator_name, m.tracked,
        m.created_at_rbx, m.updated_at_rbx, m.playing, m.visits, m.favorites, m.like_ratio,
        m.growth_24h, m.growth_7d, m.visits_24h, m.rise_score, g.ai_tags
      from game_metrics m join games g using (universe_id)
      where m.tracked or g.last_seen_in_sort_at > (select max(last_seen_in_sort_at) from games) - interval '2 days'`,
    sql<{ universeId: number; sortId: SortId; rank: number; ts: Date }[]>`
      select universe_id, sort_id, rank, ts from sort_appearances
      where ts = (select max(ts) from sort_appearances)`,
    sql<{ universeId: number; values: number[] }[]>`
      select universe_id, array_agg(playing order by ts) as values
      from game_snapshots where ts > (select max(ts) from game_snapshots) - interval '48 hours'
      group by universe_id`,
  ]);
  if (!metrics.length) return { games: [], source: "live", updatedAt: null };
  const latestTs = ranks[0]?.ts ?? null;
  const sortMap = new Map<number, Partial<Record<SortId, number>>>();
  for (const r of ranks) {
    if (!SORT_IDS.includes(r.sortId)) continue;
    const s = sortMap.get(r.universeId) ?? {};
    s[r.sortId] = r.rank;
    sortMap.set(r.universeId, s);
  }
  const sparkMap = new Map(sparks.map((s) => [s.universeId, s.values.map(Number)]));

  return {
    games: metrics.map((m) => toGameRow(m, sortMap.get(m.universeId) ?? {}, sparkMap.get(m.universeId) ?? [])),
    source: "db",
    updatedAt: latestTs ? new Date(latestTs).toISOString() : null,
  };
}

/** Pano hero'su: izlenen oyunların toplam oyuncusu, 48 saatlik seyri ve 24s değişimi. */
export async function getPulse() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG);

  const [series, [cmp]] = await Promise.all([
    sql<{ ts: Date; playing: number; games: number }[]>`
      select ts, sum(playing)::bigint as playing, count(*)::int as games
      from game_snapshots where ts > (select max(ts) from game_snapshots) - interval '48 hours'
      group by ts order by ts`,
    // İzlenen oyun kümesi zamanla değiştiği için 24s değişimi yalnızca iki anda da ölçülen oyunlarla hesaplanır
    sql<{ now: number | null; before: number | null }[]>`
      with t as (select max(ts) as ts from game_snapshots)
      select sum(a.playing)::bigint as now, sum(b.playing)::bigint as before
      from game_snapshots a
      join game_snapshots b on b.universe_id = a.universe_id and b.ts = a.ts - interval '24 hours'
      where a.ts = (select ts from t)`,
  ]);
  const last = series.at(-1);
  return {
    series: series.map((s) => ({
      label: new Date(s.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
      value: Number(s.playing),
    })),
    total: last ? Number(last.playing) : null,
    games: last?.games ?? 0,
    change24h: cmp?.before ? Number(cmp.now) / Number(cmp.before) - 1 : null,
    hoursOfData: series.length,
  };
}

/** Up-and-Coming listesine son 72 saatte ilk kez girenler (ilk toplama anındaki toplu giriş hariç). */
export async function getNewEntrants(limit = 8) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(MARKET_TAG);

  return sql<{ universeId: number; name: string; iconUrl: string | null; genre: string | null; firstSeenAt: Date; bestRank: number; playing: number | null }[]>`
    select p.universe_id, g.name, g.icon_url, g.genre, p.first_seen_at, p.best_rank, m.playing
    from sort_presence p
    join games g using (universe_id)
    left join game_metrics m using (universe_id)
    where p.sort_id = 'up-and-coming'
      and p.first_seen_at > now() - interval '72 hours'
      and p.first_seen_at > (select min(first_seen_at) + interval '2 hours' from sort_presence)
    order by p.first_seen_at desc, p.best_rank
    limit ${limit}`;
}

export type GenreStat = { genre: string; games: number; playing: number; avgGrowth: number | null; avgRise: number | null; fresh: number };

/** Tür bazında niş tablosu (ısı haritası). */
export function genreStats(games: GameRow[]): GenreStat[] {
  const map = new Map<string, { games: number; playing: number; growth: number[]; rise: number[]; fresh: number }>();
  for (const g of games) {
    const key = g.genre ?? "Türsüz";
    const e = map.get(key) ?? { games: 0, playing: 0, growth: [], rise: [], fresh: 0 };
    e.games++;
    e.playing += g.playing;
    if (g.growth24h != null) e.growth.push(g.growth24h);
    if (g.riseScore != null) e.rise.push(g.riseScore);
    if (g.ageDays <= 28) e.fresh++;
    map.set(key, e);
  }
  const median = (a: number[]) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  return [...map.entries()]
    .map(([genre, e]) => ({
      genre,
      games: e.games,
      playing: e.playing,
      avgGrowth: median(e.growth),
      avgRise: e.rise.length ? e.rise.reduce((a, b) => a + b, 0) / e.rise.length : null,
      fresh: e.fresh,
    }))
    .sort((a, b) => b.playing - a.playing);
}
