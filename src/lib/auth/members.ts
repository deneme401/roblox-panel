// Ekip üyeleri. DB'deki `members` tablosuyla aynı (supabase/migrations/0001_init.sql).
export const MEMBERS = {
  yusuf: { id: "yusuf", name: "Yusuf", color: "#3B82F6" },
  mertcan: { id: "mertcan", name: "Mertcan", color: "#F97316" },
} as const;

export type MemberId = keyof typeof MEMBERS;
export type Member = (typeof MEMBERS)[MemberId];

export function isMemberId(v: unknown): v is MemberId {
  return typeof v === "string" && v in MEMBERS;
}

export function memberName(id: string | null | undefined) {
  return id && isMemberId(id) ? MEMBERS[id].name : "—";
}
