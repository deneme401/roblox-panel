// Uygulama ayarları (app_settings tablosu). İstemci bileşenleri yalnızca `import type` ile tip alır.
import { sql } from "@/lib/db";
import { SORT_IDS, type SortId } from "@/lib/roblox/sorts";

export type AutoTrack = { enabled: boolean; sorts: SortId[] };
export const AUTO_TRACK_DEFAULT: AutoTrack = { enabled: false, sorts: ["top-trending", "up-and-coming"] };

export async function getAutoTrack(): Promise<AutoTrack> {
  const [r] = await sql<{ value: Partial<AutoTrack> }[]>`select value from app_settings where key = 'auto_track'`;
  const v = { ...AUTO_TRACK_DEFAULT, ...r?.value };
  return { enabled: Boolean(v.enabled), sorts: (v.sorts ?? []).filter((s): s is SortId => (SORT_IDS as readonly string[]).includes(s)) };
}

export async function saveAutoTrack(value: AutoTrack, by: string) {
  await sql`
    insert into app_settings (key, value, updated_by, updated_at)
    values ('auto_track', ${sql.json(value)}, ${by}, now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`;
}
