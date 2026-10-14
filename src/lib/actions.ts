"use server";

// Tüm yazma işlemleri (Server Actions). Her biri oturumu doğrular, aktivite kaydı düşer ve sayfayı yeniler.
// İstemci tarafı, işlem bitince notifyChange() ile diğer kullanıcının sayfasını da yeniletir.
import { refresh, updateTag } from "next/cache";
import { sql } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { MARKET_TAG } from "@/lib/data/market";
import { autoScores, getIdea, type IdeaStatus } from "@/lib/data/workspace";
import { placeToUniverse } from "@/lib/roblox/client";
import { storeGames, storePasses } from "@/lib/collect/jobs";
import { runScheduledJob, type ScheduledJob } from "@/lib/collect/schedule";
import { analyzeGame, evaluateIdea } from "@/lib/ai/tasks";
import { listAvailableModels } from "@/lib/ai/gemini";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false, error: string };

const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

async function log(actor: string, verb: string, entityType: string | null, entityId: string | number | null, label: string | null) {
  await sql`insert into activity (actor, verb, entity_type, entity_id, label)
    values (${actor}, ${verb}, ${entityType}, ${entityId == null ? null : String(entityId)}, ${label})`;
}

// ── Oyunlar ────────────────────────────────────────────────────────────

/** "https://www.roblox.com/games/123/..." , place id veya universe id kabul eder. */
async function resolveUniverse(input: string) {
  const s = input.trim();
  const url = s.match(/roblox\.com\/(?:[a-z]{2}\/)?games\/(\d+)/i);
  if (url) return placeToUniverse(Number(url[1]));
  if (!/^\d+$/.test(s)) throw new Error("Roblox oyun linki ya da sayısal ID gir.");
  const id = Number(s);
  const [known] = await sql<{ universeId: number }[]>`select universe_id from games where universe_id = ${id} or place_id = ${id} limit 1`;
  if (known) return known.universeId;
  // Önce place id olarak dene, olmazsa universe id kabul et
  return (await placeToUniverse(id).catch(() => null)) ?? id;
}

export async function addGame(input: string): Promise<ActionResult<{ universeId: number }>> {
  try {
    const me = await requireMember();
    const universeId = await resolveUniverse(input);
    if (!universeId) throw new Error("Oyun bulunamadı.");
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const n = await storeGames([universeId], now);
    if (!n) throw new Error("Roblox bu oyunu döndürmedi.");
    const [g] = await sql<{ name: string }[]>`
      update games set tracked = true, tracked_by = ${me.id} where universe_id = ${universeId} returning name`;
    await storePasses(universeId).catch(() => 0);
    await log(me.id, "takibe aldı", "game", universeId, g?.name ?? null);
    updateTag(MARKET_TAG);
    return { ok: true, data: { universeId } };
  } catch (e) {
    return fail(e);
  }
}

export async function setTracked(universeId: number, tracked: boolean): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const [exists] = await sql`select 1 from games where universe_id = ${universeId}`;
    if (!exists) {
      const now = new Date();
      now.setUTCMinutes(0, 0, 0);
      await storeGames([universeId], now);
    }
    const [g] = await sql<{ name: string }[]>`
      update games set tracked = ${tracked}, tracked_by = ${tracked ? me.id : null}
      where universe_id = ${universeId} returning name`;
    if (tracked) await storePasses(universeId).catch(() => 0);
    await log(me.id, tracked ? "takibe aldı" : "takipten çıkardı", "game", universeId, g?.name ?? null);
    updateTag(MARKET_TAG);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function analyzeGameAction(universeId: number): Promise<ActionResult<{ model: string }>> {
  try {
    const me = await requireMember();
    const [exists] = await sql<{ name: string }[]>`select name from games where universe_id = ${universeId}`;
    if (!exists) {
      const now = new Date();
      now.setUTCMinutes(0, 0, 0);
      await storeGames([universeId], now);
      await storePasses(universeId).catch(() => 0);
    }
    const res = await analyzeGame(universeId);
    await log(me.id, "AI analizi yaptı", "game", universeId, exists?.name ?? null);
    refresh();
    return { ok: true, data: { model: res.model } };
  } catch (e) {
    return fail(e);
  }
}

// ── İşler / ayarlar ───────────────────────────────────────────────────

export async function runJobNow(job: ScheduledJob): Promise<ActionResult<{ message: string }>> {
  try {
    await requireMember();
    const results = await runScheduledJob(job);
    updateTag(MARKET_TAG);
    refresh();
    const message = results.map((r) => `${r.job}: ${r.ok ? "✓" : "✗"} ${r.message ?? ""}`).join(" · ");
    return results.every((r) => r.ok) ? { ok: true, data: { message } } : { ok: false, error: message };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyModels(): Promise<ActionResult<{ models: string[] }>> {
  try {
    await requireMember();
    return { ok: true, data: { models: await listAvailableModels() } };
  } catch (e) {
    return fail(e);
  }
}

// ── Fikirler ───────────────────────────────────────────────────────────

export async function createIdea(input: { title: string; pitch?: string; genre?: string; universeId?: number }): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireMember();
    const title = input.title.trim();
    if (!title) throw new Error("Başlık boş olamaz.");
    const [{ id }] = await sql<{ id: string }[]>`
      insert into ideas (title, pitch, genre, owner, position)
      values (${title}, ${input.pitch?.trim() ?? ""}, ${input.genre?.trim() || null}, ${me.id},
        coalesce((select min(position) - 1 from ideas where status = 'idea'), 0))
      returning id`;
    if (input.universeId) await sql`insert into idea_games (idea_id, universe_id) values (${id}, ${input.universeId}) on conflict do nothing`;
    await log(me.id, "fikir ekledi", "idea", id, title);
    refresh();
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateIdea(
  id: string,
  patch: { title?: string; pitch?: string; genre?: string | null; scores?: Record<string, number> },
): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const [cur] = await sql<{ title: string }[]>`select title from ideas where id = ${id}`;
    if (!cur) throw new Error("Fikir bulunamadı.");
    await sql`
      update ideas set
        title = coalesce(${patch.title?.trim() || null}, title),
        pitch = coalesce(${patch.pitch ?? null}, pitch),
        genre = ${patch.genre === undefined ? sql`genre` : patch.genre?.trim() || null},
        scores = ${patch.scores ? sql`scores || ${sql.json(patch.scores)}` : sql`scores`},
        updated_at = now()
      where id = ${id}`;
    await log(me.id, "fikri düzenledi", "idea", id, patch.title?.trim() || cur.title);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveIdea(id: string, status: IdeaStatus, beforeId: string | null): Promise<ActionResult> {
  try {
    const me = await requireMember();
    // Hedef sütundaki sıralama: beforeId'nin hemen önüne, yoksa sona
    const col = await sql<{ id: string; position: number }[]>`
      select id, position from ideas where status = ${status} and id <> ${id} order by position, created_at desc`;
    let position: number;
    const idx = beforeId ? col.findIndex((c) => c.id === beforeId) : -1;
    if (idx === -1) position = (col.at(-1)?.position ?? 0) + 1;
    else if (idx === 0) position = col[0].position - 1;
    else position = (col[idx - 1].position + col[idx].position) / 2;
    const [r] = await sql<{ title: string; old: string }[]>`
      update ideas i set status = ${status}, position = ${position}, updated_at = now()
      from (select status as old from ideas where id = ${id}) o
      where i.id = ${id} returning i.title, o.old`;
    if (r && r.old !== status) await log(me.id, `fikri taşıdı → ${status}`, "idea", id, r.title);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const [r] = await sql<{ title: string }[]>`delete from ideas where id = ${id} returning title`;
    await sql`delete from notes where entity_type = 'idea' and entity_id = ${id}`;
    await sql`delete from comments where entity_type = 'idea' and entity_id = ${id}`;
    if (r) await log(me.id, "fikri sildi", null, null, r.title);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function linkIdeaGame(ideaId: string, input: string | number): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const universeId = typeof input === "number" ? input : await resolveUniverse(input);
    if (!universeId) throw new Error("Oyun bulunamadı.");
    const [exists] = await sql`select 1 from games where universe_id = ${universeId}`;
    if (!exists) {
      const now = new Date();
      now.setUTCMinutes(0, 0, 0);
      if (!(await storeGames([universeId], now))) throw new Error("Roblox bu oyunu döndürmedi.");
      await storePasses(universeId).catch(() => 0);
    }
    await sql`insert into idea_games (idea_id, universe_id) values (${ideaId}, ${universeId}) on conflict do nothing`;
    const [g] = await sql<{ name: string }[]>`select name from games where universe_id = ${universeId}`;
    await log(me.id, "fikre rakip bağladı", "idea", ideaId, g?.name ?? null);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function unlinkIdeaGame(ideaId: string, universeId: number): Promise<ActionResult> {
  try {
    await requireMember();
    await sql`delete from idea_games where idea_id = ${ideaId} and universe_id = ${universeId}`;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function evaluateIdeaAction(id: string): Promise<ActionResult<{ model: string }>> {
  try {
    const me = await requireMember();
    const res = await evaluateIdea(id);
    const data = await getIdea(id);
    if (data) {
      // Otomatik talep/rekabet puanlarını da kaydet (AI'dan bağımsız, veriden)
      const auto = autoScores(data.games);
      await sql`update ideas set scores = scores || ${sql.json({ demand: auto.demand, competition: auto.competition })} where id = ${id}`;
    }
    await log(me.id, "fikri AI ile değerlendirdi", "idea", id, data?.idea.title ?? null);
    refresh();
    return { ok: true, data: { model: res.model } };
  } catch (e) {
    return fail(e);
  }
}

// ── Notlar ─────────────────────────────────────────────────────────────

export async function createNote(input: { entityType?: "general" | "game" | "idea"; entityId?: string | null; title?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireMember();
    const [{ id }] = await sql<{ id: string }[]>`
      insert into notes (title, entity_type, entity_id, created_by, updated_by)
      values (${input.title?.trim() || "Adsız not"}, ${input.entityType ?? "general"}, ${input.entityId ?? null}, ${me.id}, ${me.id})
      returning id`;
    await log(me.id, "not oluşturdu", "note", id, input.title?.trim() || "Adsız not");
    refresh();
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveNote(
  id: string,
  patch: { title?: string; content?: unknown; plain?: string; tags?: string[]; pinned?: boolean; entityType?: "general" | "game" | "idea"; entityId?: string | null },
): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    const me = await requireMember();
    const [prev] = await sql<{ updatedBy: string | null; updatedAt: Date }[]>`select updated_by, updated_at from notes where id = ${id}`;
    if (!prev) throw new Error("Not bulunamadı.");
    const [r] = await sql<{ title: string; updatedAt: Date }[]>`
      update notes set
        title = ${patch.title !== undefined ? patch.title.trim() || "Adsız not" : sql`title`},
        content = ${patch.content !== undefined ? sql.json(patch.content as never) : sql`content`},
        plain = ${patch.plain !== undefined ? patch.plain : sql`plain`},
        tags = ${patch.tags !== undefined ? patch.tags : sql`tags`},
        pinned = ${patch.pinned !== undefined ? patch.pinned : sql`pinned`},
        entity_type = ${patch.entityType !== undefined ? patch.entityType : sql`entity_type`},
        entity_id = ${patch.entityId !== undefined ? patch.entityId : sql`entity_id`},
        updated_by = ${me.id}, updated_at = now()
      where id = ${id} returning title, updated_at`;
    // Aynı kişinin art arda kaydetmeleri aktivite akışını doldurmasın: 30 dk'da bir
    if (prev.updatedBy !== me.id || Date.now() - new Date(prev.updatedAt).getTime() > 30 * 60_000) {
      await log(me.id, "notu düzenledi", "note", id, r.title);
    }
    return { ok: true, data: { updatedAt: new Date(r.updatedAt).toISOString() } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const [r] = await sql<{ title: string }[]>`delete from notes where id = ${id} returning title`;
    await sql`delete from comments where entity_type = 'note' and entity_id = ${id}`;
    if (r) await log(me.id, "notu sildi", null, null, r.title);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Yorumlar ───────────────────────────────────────────────────────────

export async function addComment(entityType: string, entityId: string, body: string): Promise<ActionResult> {
  try {
    const me = await requireMember();
    const text = body.trim();
    if (!text) throw new Error("Yorum boş.");
    await sql`insert into comments (entity_type, entity_id, body, author) values (${entityType}, ${entityId}, ${text.slice(0, 4000)}, ${me.id})`;
    const label =
      entityType === "game"
        ? (await sql<{ name: string }[]>`select name from games where universe_id::text = ${entityId}`)[0]?.name
        : entityType === "idea"
          ? (await sql<{ title: string }[]>`select title from ideas where id::text = ${entityId}`)[0]?.title
          : null;
    await log(me.id, "yorum yazdı", entityType, entityId, label ?? null);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteComment(id: string): Promise<ActionResult> {
  try {
    const me = await requireMember();
    await sql`delete from comments where id = ${id} and author = ${me.id}`;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Kıyas setleri ──────────────────────────────────────────────────────

export async function saveCompareSet(name: string, universeIds: number[]): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireMember();
    if (!name.trim() || universeIds.length < 2) throw new Error("İsim ve en az 2 oyun gerekli.");
    const [{ id }] = await sql<{ id: string }[]>`
      insert into compare_sets (name, universe_ids, created_by) values (${name.trim()}, ${universeIds}, ${me.id}) returning id`;
    await log(me.id, "kıyas seti kaydetti", "compare", id, name.trim());
    refresh();
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCompareSet(id: string): Promise<ActionResult> {
  try {
    await requireMember();
    await sql`delete from compare_sets where id = ${id}`;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
