// Ortak çalışma alanı verisi (fikirler, notlar, yorumlar, aktivite). Önbelleksiz: her istekte taze okunur,
// bu yüzden bu fonksiyonları kullanan bileşenler <Suspense> içinde olmalı.
import { connection } from "next/server";
import { sql } from "@/lib/db";

import type { EntityType, Idea, IdeaCard, LinkedGame } from "./workspace-shared";
export * from "./workspace-shared";


export async function listIdeas(): Promise<IdeaCard[]> {
  await connection();
  return sql<IdeaCard[]>`
    select i.*,
      coalesce((select json_agg(json_build_object('universeId', g.universe_id, 'name', g.name, 'iconUrl', g.icon_url))
        from idea_games ig join games g using (universe_id) where ig.idea_id = i.id), '[]') as games,
      (select count(*) from notes n where n.entity_type = 'idea' and n.entity_id = i.id::text)::int as note_count,
      (select count(*) from comments c where c.entity_type = 'idea' and c.entity_id = i.id::text)::int as comment_count
    from ideas i order by i.position, i.created_at desc`;
}

export async function getIdea(id: string) {
  await connection();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [idea] = await sql<Idea[]>`select * from ideas where id = ${id}`;
  if (!idea) return null;
  const games = await sql<LinkedGame[]>`
    select g.universe_id, g.name, g.icon_url, g.genre, m.playing, m.growth_24h, m.growth_7d, m.like_ratio, m.rise_score,
      round(m.age_days)::int as age_days,
      (select count(*) from game_passes p where p.universe_id = g.universe_id and p.is_for_sale)::int as pass_count
    from idea_games ig join games g using (universe_id) left join game_metrics m using (universe_id)
    where ig.idea_id = ${id}
    order by m.playing desc nulls last`;
  return { idea, games };
}

export type Note = {
  id: string;
  title: string;
  content: unknown;
  plain: string;
  entityType: EntityType;
  entityId: string | null;
  pinned: boolean;
  tags: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteListItem = Omit<Note, "content"> & { entityLabel: string | null };

export async function listNotes(filter?: { entityType: EntityType; entityId: string }): Promise<NoteListItem[]> {
  await connection();
  return sql<NoteListItem[]>`
    select n.id, n.title, left(n.plain, 220) as plain, n.entity_type, n.entity_id, n.pinned, n.tags, n.created_by, n.updated_by,
      n.created_at, n.updated_at,
      case n.entity_type
        when 'game' then (select name from games where universe_id::text = n.entity_id)
        when 'idea' then (select title from ideas where id::text = n.entity_id)
      end as entity_label
    from notes n
    ${filter ? sql`where n.entity_type = ${filter.entityType} and n.entity_id = ${filter.entityId}` : sql``}
    order by n.pinned desc, n.updated_at desc`;
}

export async function getNote(id: string): Promise<Note | null> {
  await connection();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [n] = await sql<Note[]>`select * from notes where id = ${id}`;
  return n ?? null;
}

export type Comment = { id: string; body: string; author: string | null; createdAt: Date };

export async function listComments(entityType: string, entityId: string): Promise<Comment[]> {
  await connection();
  return sql<Comment[]>`
    select id, body, author, created_at from comments
    where entity_type = ${entityType} and entity_id = ${entityId} order by created_at`;
}

export type Activity = { id: number; actor: string | null; verb: string; entityType: string | null; entityId: string | null; label: string | null; createdAt: Date };

export async function listActivity(limit = 12): Promise<Activity[]> {
  await connection();
  return sql<Activity[]>`select id, actor, verb, entity_type, entity_id, label, created_at from activity order by created_at desc limit ${limit}`;
}

export type CompareSet = { id: string; name: string; universeIds: number[]; createdBy: string | null; createdAt: Date };

export async function listCompareSets(): Promise<CompareSet[]> {
  await connection();
  return sql<CompareSet[]>`select * from compare_sets order by created_at desc`;
}
