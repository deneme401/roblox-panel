// Toplayıcı işler. Cron route'ları (src/app/api/cron/*) ve Ayarlar sayfasındaki "şimdi çalıştır" bunları çağırır.
// Akış ve zamanlama: docs/02-mimari.md
import { sql } from "@/lib/db";
import { getGamePasses, getGames, getIcons, getSorts, getVotes, SORT_IDS, type RobloxGame } from "@/lib/roblox/client";

export type JobResult = { rows: number; message?: string };
export type JobOutcome = JobResult & { job: string; ok: boolean };

/** İşi job_runs tablosuna kaydederek çalıştırır. Hata fırlatmaz, sonucu döndürür. */
export async function runJob(job: string, fn: () => Promise<JobResult>): Promise<JobOutcome> {
  const [run] = await sql<{ id: number }[]>`insert into job_runs (job) values (${job}) returning id`;
  try {
    const r = await fn();
    await sql`update job_runs set finished_at = now(), ok = true, rows = ${r.rows}, message = ${r.message ?? null} where id = ${run.id}`;
    return { job, ok: true, ...r };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sql`update job_runs set finished_at = now(), ok = false, message = ${message.slice(0, 500)} where id = ${run.id}`;
    return { job, ok: false, rows: 0, message };
  }
}

const clean = (...c: (string | null | undefined)[]) => c.find((x) => x && x !== "All") ?? null;

/** Oyun detaylarını games tablosuna yazar ve bir snapshot ekler. */
export async function storeGames(ids: number[], ts: Date) {
  if (!ids.length) return 0;
  const [all, votes, icons] = await Promise.all([getGames(ids), getVotes(ids), getIcons(ids)]);
  const details = [...new Map(all.map((g) => [g.id, g])).values()];
  if (!details.length) return 0;
  const voteMap = new Map(votes.map((v) => [v.id, v]));
  const gameRows = details.map((g: RobloxGame) => ({
    universe_id: g.id,
    place_id: g.rootPlaceId,
    name: g.name,
    description: g.description?.slice(0, 4000) ?? null,
    creator_name: g.creator.name,
    creator_type: g.creator.type,
    genre: clean(g.genre_l1, g.genre),
    subgenre: clean(g.genre_l2),
    max_players: g.maxPlayers,
    created_at_rbx: g.created,
    updated_at_rbx: g.updated,
    icon_url: icons.get(g.id) ?? null,
    last_snapshot_at: new Date(), // gerçek ölçüm anı (snapshot ts saat başına yuvarlanır)
  }));
  await sql`
    insert into games ${sql(gameRows)}
    on conflict (universe_id) do update set
      place_id = excluded.place_id, name = excluded.name, description = excluded.description,
      creator_name = excluded.creator_name, creator_type = excluded.creator_type, genre = excluded.genre,
      subgenre = excluded.subgenre, max_players = excluded.max_players, created_at_rbx = excluded.created_at_rbx,
      updated_at_rbx = excluded.updated_at_rbx, icon_url = coalesce(excluded.icon_url, games.icon_url),
      last_snapshot_at = excluded.last_snapshot_at`;
  await sql`
    insert into game_updates ${sql(details.map((g) => ({ universe_id: g.id, updated_at_rbx: g.updated })))}
    on conflict do nothing`;
  const snaps = details.map((g) => {
    const v = voteMap.get(g.id);
    return {
      universe_id: g.id,
      ts,
      playing: g.playing,
      visits: g.visits,
      favorites: g.favoritedCount,
      up_votes: v?.upVotes ?? null,
      down_votes: v?.downVotes ?? null,
    };
  });
  await sql`
    insert into game_snapshots ${sql(snaps)}
    on conflict (universe_id, ts) do update set
      playing = excluded.playing, visits = excluded.visits, favorites = excluded.favorites,
      up_votes = excluded.up_votes, down_votes = excluded.down_votes`;
  return snaps.length;
}

function hourStart(d = new Date()) {
  const h = new Date(d);
  h.setUTCMinutes(0, 0, 0);
  return h;
}

/** Saatlik: keşif listeleri + listelerdeki/takipteki oyunların anlık değerleri. */
export async function collectHourly(): Promise<JobResult> {
  const ts = hourStart();
  const sorts = await getSorts();
  const appearances: { ts: Date; sort_id: string; universe_id: number; rank: number }[] = [];
  const basics = new Map<number, { universe_id: number; place_id: number; name: string; last_seen_in_sort_at: Date }>();
  for (const id of SORT_IDS) {
    const seen = new Set<number>();
    sorts[id]?.forEach((g, i) => {
      // Roblox bazen aynı oyunu bir listede iki kez döndürüyor; ilk (en iyi) sıra kalsın
      if (seen.has(g.universeId)) return;
      seen.add(g.universeId);
      appearances.push({ ts, sort_id: id, universe_id: g.universeId, rank: i + 1 });
      basics.set(g.universeId, { universe_id: g.universeId, place_id: g.rootPlaceId, name: g.name, last_seen_in_sort_at: ts });
    });
  }
  if (basics.size) {
    await sql`
      insert into games ${sql([...basics.values()])}
      on conflict (universe_id) do update set last_seen_in_sort_at = excluded.last_seen_in_sort_at`;
    await sql`insert into sort_appearances ${sql(appearances)} on conflict do nothing`;
    const presence = appearances.map((a) => ({
      sort_id: a.sort_id,
      universe_id: a.universe_id,
      best_rank: a.rank,
      last_rank: a.rank,
      last_seen_at: ts,
    }));
    await sql`
      insert into sort_presence ${sql(presence)}
      on conflict (sort_id, universe_id) do update set
        last_seen_at = excluded.last_seen_at, last_rank = excluded.last_rank,
        best_rank = least(sort_presence.best_rank, excluded.best_rank)`;
  }
  const targets = await sql<{ universeId: number }[]>`
    select distinct universe_id from games
    where tracked or last_seen_in_sort_at > now() - interval '3 days'
       or universe_id in (select universe_id from idea_games)`;
  const snaps = await storeGames(targets.map((t) => t.universeId), ts);
  return { rows: snaps, message: `${basics.size} listede oyun, ${snaps} snapshot` };
}

async function pool<T>(items: T[], size: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let t = queue.shift(); t !== undefined; t = queue.shift()) await fn(t);
    }),
  );
}

/** Tek oyunun gamepass'lerini yazar. */
export async function storePasses(universeId: number) {
  const passes = await getGamePasses(universeId);
  if (!passes.length) return 0;
  const data = passes.map((p) => ({
    universe_id: universeId,
    pass_id: p.id,
    name: p.name.slice(0, 200),
    price: p.price,
    is_for_sale: p.isForSale,
    last_seen_at: new Date(),
  }));
  await sql`
    insert into game_passes ${sql(data)}
    on conflict (universe_id, pass_id) do update set
      name = excluded.name, price = excluded.price, is_for_sale = excluded.is_for_sale, last_seen_at = excluded.last_seen_at`;
  return data.length;
}

/** Günlük: takipteki ve en çok yükselen/oynanan oyunların gamepass'leri. */
export async function collectPasses(): Promise<JobResult> {
  const targets = await sql<{ universeId: number }[]>`
    (select universe_id from games where tracked or universe_id in (select universe_id from idea_games))
    union
    (select universe_id from game_metrics order by rise_score desc nulls last limit 60)
    union
    (select universe_id from game_metrics order by playing desc limit 40)`;
  let rows = 0;
  let failed = 0;
  await pool(targets, 4, async ({ universeId }) => {
    try {
      rows += await storePasses(universeId);
    } catch {
      failed++;
    }
  });
  return { rows, message: `${targets.length} oyun, ${rows} gamepass${failed ? `, ${failed} hata` : ""}` };
}

/** Günlük: snapshot'ları gün özetine aktarır, eski ham veriyi siler (Supabase free 500MB). */
export async function rollup(): Promise<JobResult> {
  const res = await sql`
    insert into game_daily (universe_id, day, avg_playing, peak_playing, visits, favorites, up_votes, down_votes, samples)
    select universe_id, (ts at time zone 'UTC')::date, round(avg(playing)), max(playing), max(visits), max(favorites),
           max(up_votes), max(down_votes), count(*)
    from game_snapshots
    where ts >= current_date - 3
    group by 1, 2
    on conflict (universe_id, day) do update set
      avg_playing = excluded.avg_playing, peak_playing = excluded.peak_playing, visits = excluded.visits,
      favorites = excluded.favorites, up_votes = excluded.up_votes, down_votes = excluded.down_votes,
      samples = excluded.samples`;
  const del1 = await sql`delete from game_snapshots where ts < now() - interval '30 days'`;
  const del2 = await sql`delete from sort_appearances where ts < now() - interval '30 days'`;
  await sql`delete from job_runs where started_at < now() - interval '30 days'`;
  await sql`delete from ai_calls where created_at < now() - interval '30 days'`;
  return { rows: res.count, message: `${res.count} gün özeti, ${del1.count + del2.count} eski satır silindi` };
}
