// Sosyal sinyaller (Apify). Actor seçimi ve maliyet: docs/03-veri-kaynaklari.md
// Apify free plan aylık 5$ kredi verir; günlük ~0,12$ hedeflenir (SIGNAL_ITEMS ile ayarlanır).
import { sql } from "@/lib/db";
import type { JobResult } from "./jobs";

type Signal = {
  source: "youtube" | "tiktok" | "reddit";
  external_id: string;
  url: string;
  title: string | null;
  author: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  thumbnail: string | null;
  published_at: string | null;
  query: string;
};

async function runActor<T>(actor: string, input: unknown): Promise<T[]> {
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=240`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.APIFY_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actor} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

async function youtube(n: number): Promise<Signal[]> {
  const query = "roblox new game";
  type Y = { id: string; url: string; title?: string; channelName?: string; viewCount?: number; likes?: number; commentsCount?: number; thumbnailUrl?: string; date?: string; type?: string };
  const items = await runActor<Y>("streamers~youtube-scraper", {
    searchQueries: [query],
    maxResults: n,
    maxResultsShorts: 0,
    maxResultStreams: 0,
    sortingOrder: "date",
  });
  return items.filter((i) => i.id && i.url).map((i) => ({
    source: "youtube",
    external_id: i.id,
    url: i.url,
    title: i.title ?? null,
    author: i.channelName ?? null,
    views: num(i.viewCount),
    likes: num(i.likes),
    comments: num(i.commentsCount),
    thumbnail: i.thumbnailUrl ?? null,
    published_at: i.date ?? null,
    query,
  }));
}

async function tiktok(n: number): Promise<Signal[]> {
  const query = "#robloxgame";
  type T = { id: string; text?: string; webVideoUrl?: string; playCount?: number; diggCount?: number; commentCount?: number; createTimeISO?: string; authorMeta?: { name?: string }; videoMeta?: { coverUrl?: string } };
  const items = await runActor<T>("clockworks~tiktok-scraper", {
    hashtags: ["robloxgame"],
    resultsPerPage: n,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
  });
  return items.filter((i) => i.id && i.webVideoUrl).map((i) => ({
    source: "tiktok",
    external_id: i.id,
    url: i.webVideoUrl!,
    title: i.text?.slice(0, 500) ?? null,
    author: i.authorMeta?.name ?? null,
    views: num(i.playCount),
    likes: num(i.diggCount),
    comments: num(i.commentCount),
    thumbnail: i.videoMeta?.coverUrl ?? null,
    published_at: i.createTimeISO ?? null,
    query,
  }));
}

async function reddit(n: number): Promise<Signal[]> {
  type R = { id: string; url: string; title?: string; username?: string; upVotes?: number; numberOfComments?: number; createdAt?: string; dataType?: string; communityName?: string; thumbnailUrl?: string };
  const items = await runActor<R>("trudax~reddit-scraper-lite", {
    startUrls: [{ url: "https://www.reddit.com/r/roblox/hot/" }, { url: "https://www.reddit.com/r/robloxgamedev/hot/" }],
    maxItems: n,
    maxPostCount: Math.ceil(n / 2),
    skipComments: true,
    skipUserPosts: true,
    skipCommunity: true,
  });
  return items.filter((i) => i.dataType === "post" && i.id && i.url).map((i) => ({
    source: "reddit",
    external_id: i.id,
    url: i.url,
    title: i.title ?? null,
    author: i.username ?? null,
    views: null,
    likes: num(i.upVotes),
    comments: num(i.numberOfComments),
    thumbnail: null,
    published_at: i.createdAt ?? null,
    query: i.communityName ?? "reddit",
  }));
}

/** "[🎃 UPD] Grow a Garden 🌱" → "grow a garden" */
export function normalizeName(s: string) {
  return s
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC = new Set(["roblox", "game", "games", "obby", "simulator", "tycoon", "the game", "update", "new", "test"]);

/** Sinyal metnini bilinen oyun adlarıyla eşleştirir; en uzun eşleşme kazanır. */
export async function matchSignals() {
  const games = await sql<{ universeId: number; name: string }[]>`
    select universe_id, name from games where last_seen_in_sort_at > now() - interval '30 days' or tracked`;
  const names = games
    .map((g) => ({ id: g.universeId, n: normalizeName(g.name) }))
    .filter((g) => g.n.length >= 5 && !GENERIC.has(g.n))
    .sort((a, b) => b.n.length - a.n.length);
  const pending = await sql<{ id: number; title: string | null }[]>`
    select id, title from signals where matched_universe_id is null and fetched_at > now() - interval '7 days'`;
  let matched = 0;
  for (const s of pending) {
    const text = ` ${normalizeName(s.title ?? "")} `;
    const hit = names.find((g) => text.includes(` ${g.n} `));
    if (hit) {
      await sql`update signals set matched_universe_id = ${hit.id} where id = ${s.id}`;
      matched++;
    }
  }
  return matched;
}

export async function collectSignals(): Promise<JobResult> {
  const n = Number(process.env.SIGNAL_ITEMS ?? 8);
  const results = await Promise.allSettled([youtube(n), tiktok(n), reddit(n)]);
  const rows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const errors = results.flatMap((r, i) => (r.status === "rejected" ? [`${["youtube", "tiktok", "reddit"][i]}: ${String(r.reason).slice(0, 120)}`] : []));
  if (rows.length) {
    await sql`
      insert into signals ${sql(rows)}
      on conflict (source, external_id) do update set
        views = excluded.views, likes = excluded.likes, comments = excluded.comments, fetched_at = now()`;
  }
  const matched = await matchSignals();
  if (!rows.length && errors.length) throw new Error(errors.join(" | "));
  return { rows: rows.length, message: `${rows.length} sinyal, ${matched} eşleşme${errors.length ? ` · hata: ${errors.join(" | ")}` : ""}` };
}
