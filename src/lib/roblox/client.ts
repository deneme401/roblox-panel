// Roblox herkese açık API istemcisi. Endpoint'ler ve test notları: docs/03-veri-kaynaklari.md

export const SORT_IDS = ["top-trending", "up-and-coming", "top-playing-now", "fun-with-friends", "top-revisited"] as const;
export type SortId = (typeof SORT_IDS)[number];

export const SORT_LABELS: Record<SortId, string> = {
  "top-trending": "En Trend",
  "up-and-coming": "Yükselen (son 28 gün)",
  "top-playing-now": "Şu An En Çok Oynanan",
  "fun-with-friends": "Arkadaşlarla",
  "top-revisited": "En Çok Geri Dönülen",
};

export type SortGame = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
  isSponsored: boolean;
  genreL1?: string;
};

export type RobloxSort = { sortId: string; sortDisplayName: string; games: SortGame[] };

export type RobloxGame = {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string | null;
  creator: { id: number; name: string; type: "User" | "Group"; hasVerifiedBadge: boolean };
  price: number | null;
  playing: number;
  visits: number;
  maxPlayers: number;
  created: string;
  updated: string;
  genre: string;
  genre_l1?: string;
  genre_l2?: string;
  favoritedCount: number;
};

export type GameVotes = { id: number; upVotes: number; downVotes: number };
export type GamePass = { id: number; name: string; price: number | null; isForSale: boolean };

// Bu modül önbelleklemez; sayfalar lib/roblox/queries.ts ("use cache") üzerinden okur,
// toplayıcılar (cron) doğrudan bunu kullanır.
async function getJson<T>(url: string, attempt = 0): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Roblox API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Keşif sayfasındaki listeler (Trend, Yükselen, ...). Sponsorlu girişler çıkarılır. */
export async function getSorts(): Promise<Partial<Record<SortId, SortGame[]>>> {
  const data = await getJson<{ sorts: (RobloxSort & { contentType: string })[] }>(
    `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${crypto.randomUUID()}&device=computer`,
    );
  const out: Partial<Record<SortId, SortGame[]>> = {};
  for (const s of data.sorts) {
    if (s.contentType !== "Games" || !SORT_IDS.includes(s.sortId as SortId)) continue;
    out[s.sortId as SortId] = s.games.filter((g) => !g.isSponsored);
  }
  return out;
}

/** Oyun detayları; 50'lik batch'ler halinde. */
export async function getGames(universeIds: number[]): Promise<RobloxGame[]> {
  const parts = await Promise.all(
    chunk(universeIds, 50).map((ids) =>
      getJson<{ data: RobloxGame[] }>(`https://games.roblox.com/v1/games?universeIds=${ids.join(",")}`),
    ),
  );
  return parts.flatMap((p) => p.data);
}

export async function getVotes(universeIds: number[]): Promise<GameVotes[]> {
  const parts = await Promise.all(
    chunk(universeIds, 50).map((ids) =>
      getJson<{ data: GameVotes[] }>(`https://games.roblox.com/v1/games/votes?universeIds=${ids.join(",")}`),
    ),
  );
  return parts.flatMap((p) => p.data);
}

/** universeId → ikon URL */
export async function getIcons(universeIds: number[], size: "150x150" | "512x512" = "150x150") {
  const parts = await Promise.all(
    chunk(universeIds, 100).map((ids) =>
      getJson<{ data: { targetId: number; imageUrl: string | null }[] }>(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(",")}&size=${size}&format=Png&isCircular=false`,
    ),
    ),
  );
  return new Map(parts.flatMap((p) => p.data).map((d) => [d.targetId, d.imageUrl]));
}

export async function getGamePasses(universeId: number): Promise<GamePass[]> {
  const out: GamePass[] = [];
  let token = "";
  for (let page = 0; page < 5; page++) {
    const data = await getJson<{ gamePasses: GamePass[]; nextPageToken?: string | null }>(
      `https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?passView=Full&pageSize=100${token ? `&pageToken=${token}` : ""}`,
    );
    out.push(...data.gamePasses);
    if (!data.nextPageToken) break;
    token = data.nextPageToken;
  }
  return out;
}

/** Oyun linkinden (roblox.com/games/{placeId}/...) universeId bulur. */
export async function placeToUniverse(placeId: number) {
  const data = await getJson<{ universeId: number | null }>(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  return data.universeId;
}

export function likeRatio(up: number, down: number) {
  const total = up + down;
  return total ? up / total : null;
}
