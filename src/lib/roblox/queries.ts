// Sayfaların okuduğu önbellekli (Cache Components "use cache") Roblox sorguları.
// Geçmiş/büyüme verisi DB'den gelir: lib/data/market.ts (bu dosya DB boşken yedek olarak kullanılır).
import { cacheLife } from "next/cache";
import { getGamePasses, getGames, getIcons, getSorts, getVotes, likeRatio, SORT_IDS, type SortId } from "./client";

export type GameRow = {
  universeId: number;
  placeId: number;
  name: string;
  icon: string | null;
  playing: number;
  visits: number;
  favorites: number;
  likeRatio: number | null;
  genre: string | null;
  subgenre: string | null;
  creator: string;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
  updatedDaysAgo: number;
  /** Bu oyunun göründüğü listeler ve sırası (1'den başlar) */
  sorts: Partial<Record<SortId, number>>;
  // Aşağıdakiler yalnızca DB'den (lib/data/market.ts) gelir; canlı API'de yoktur.
  growth24h?: number | null;
  growth7d?: number | null;
  visits24h?: number | null;
  riseScore?: number | null;
  tracked?: boolean;
  tags?: string[];
  /** Son 48 saatin saatlik oyuncu sayıları */
  spark?: number[];
};

const DAY = 86_400_000;

/** Roblox bazı oyunlarda tür olarak "All" döndürüyor; bunu türsüz say. */
function cleanGenre(...candidates: (string | undefined | null)[]) {
  return candidates.find((c) => c && c !== "All") ?? null;
}

/**
 * "use cache" içinde Date.now() kullanılamıyor (Cache Components); yaşlar önbellek dışında,
 * istek anında hesaplanır.
 */
export function fillAges<T extends { createdAt: string; updatedAt: string; ageDays: number; updatedDaysAgo: number }>(rows: T[]): T[] {
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    ageDays: Math.floor((now - new Date(r.createdAt).getTime()) / DAY),
    updatedDaysAgo: Math.floor((now - new Date(r.updatedAt).getTime()) / DAY),
  }));
}

/** Keşif listelerindeki tüm oyunlar, detay ve ikonlarıyla birleştirilmiş halde. */
export async function getDiscoverGames(): Promise<{ games: GameRow[]; fetchedAt: string }> {
  const games = fillAges(await discoverCached());
  return { games, fetchedAt: new Date().toISOString() };
}

async function discoverCached(): Promise<GameRow[]> {
  "use cache";
  cacheLife("minutes");

  const sorts = await getSorts();
  const sortRank = new Map<number, Partial<Record<SortId, number>>>();
  for (const id of SORT_IDS) {
    sorts[id]?.forEach((g, i) => {
      const r = sortRank.get(g.universeId) ?? {};
      r[id] = i + 1;
      sortRank.set(g.universeId, r);
    });
  }
  const ids = [...sortRank.keys()];
  const [details, votes, icons] = await Promise.all([getGames(ids), getVotes(ids), getIcons(ids)]);
  const voteMap = new Map(votes.map((v) => [v.id, v]));

  const games: GameRow[] = details.map((g) => {
    const v = voteMap.get(g.id);
    return {
      universeId: g.id,
      placeId: g.rootPlaceId,
      name: g.name,
      icon: icons.get(g.id) ?? null,
      playing: g.playing,
      visits: g.visits,
      favorites: g.favoritedCount,
      likeRatio: v ? likeRatio(v.upVotes, v.downVotes) : null,
      genre: cleanGenre(g.genre_l1, g.genre),
      subgenre: cleanGenre(g.genre_l2),
      creator: g.creator.name,
      createdAt: g.created,
      updatedAt: g.updated,
      ageDays: 0,
      updatedDaysAgo: 0,
      sorts: sortRank.get(g.id) ?? {},
    };
  });
  return games;
}

export type GameDetail = GameRow & {
  description: string | null;
  maxPlayers: number;
  upVotes: number;
  downVotes: number;
  iconLarge: string | null;
  passes: { id: number; name: string; price: number | null }[];
};

export async function getGameDetail(universeId: number): Promise<GameDetail | null> {
  const g = await gameDetailCached(universeId);
  return g ? fillAges([g])[0] : null;
}

async function gameDetailCached(universeId: number): Promise<GameDetail | null> {
  "use cache";
  cacheLife("minutes");

  const [[g], [v], icons, iconsLarge, passes] = await Promise.all([
    getGames([universeId]),
    getVotes([universeId]),
    getIcons([universeId]),
    getIcons([universeId], "512x512"),
    getGamePasses(universeId).catch(() => []),
  ]);
  if (!g) return null;
  return {
    universeId: g.id,
    placeId: g.rootPlaceId,
    name: g.name,
    description: g.description,
    icon: icons.get(g.id) ?? null,
    iconLarge: iconsLarge.get(g.id) ?? null,
    playing: g.playing,
    visits: g.visits,
    favorites: g.favoritedCount,
    maxPlayers: g.maxPlayers,
    upVotes: v?.upVotes ?? 0,
    downVotes: v?.downVotes ?? 0,
    likeRatio: v ? likeRatio(v.upVotes, v.downVotes) : null,
    genre: cleanGenre(g.genre_l1, g.genre),
    subgenre: cleanGenre(g.genre_l2),
    creator: g.creator.name,
    createdAt: g.created,
    updatedAt: g.updated,
    ageDays: 0,
    updatedDaysAgo: 0,
    sorts: {},
    passes: passes.filter((p) => p.isForSale).map((p) => ({ id: p.id, name: p.name, price: p.price })),
  };
}
