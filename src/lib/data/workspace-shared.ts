// İstemci bileşenlerinin de kullanabileceği (DB içermeyen) workspace tipleri ve yardımcıları.
import type { IdeaEval } from "@/lib/ai/tasks";

export type EntityType = "general" | "game" | "idea";
export type IdeaStatus = "idea" | "research" | "prototype" | "dropped";

export const IDEA_STATUSES: { id: IdeaStatus; label: string }[] = [
  { id: "idea", label: "Fikir" },
  { id: "research", label: "Araştırma" },
  { id: "prototype", label: "Prototip" },
  { id: "dropped", label: "Elendi" },
];

export type Idea = {
  id: string;
  title: string;
  pitch: string;
  genre: string | null;
  status: IdeaStatus;
  position: number;
  scores: { effort?: number; monetization?: number; virality?: number };
  aiEval: IdeaEval | null;
  aiModel: string | null;
  aiEvaluatedAt: Date | null;
  owner: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LinkedGame = {
  universeId: number;
  name: string;
  iconUrl: string | null;
  genre: string | null;
  playing: number | null;
  growth24h: number | null;
  growth7d: number | null;
  likeRatio: number | null;
  riseScore: number | null;
  ageDays: number | null;
  passCount: number;
};

/** Fikrin talep ve rekabet puanı (1-5), bağlı rakiplerin verisinden otomatik. */
export function autoScores(games: LinkedGame[]) {
  if (!games.length) return { demand: null, competition: null };
  const total = games.reduce((s, g) => s + (g.playing ?? 0), 0);
  const growth = games.map((g) => g.growth7d ?? g.growth24h).filter((x): x is number => x != null);
  const avgGrowth = growth.length ? growth.reduce((a, b) => a + b, 0) / growth.length : 0;
  // talep: toplam oyuncu (log ölçek) + büyüme
  const demand = Math.max(1, Math.min(5, Math.round(Math.log10(Math.max(total, 10)) - 1 + (avgGrowth > 0.1 ? 1 : avgGrowth < -0.1 ? -1 : 0))));
  // rekabet: büyük oyun sayısı (>10B oyuncu) ne kadar çoksa o kadar doygun
  const big = games.filter((g) => (g.playing ?? 0) > 10_000).length;
  const competition = Math.max(1, Math.min(5, 1 + big + (total > 200_000 ? 1 : 0)));
  return { demand, competition };
}

export function activityHref(a: { entityType: string | null; entityId: string | null }) {
  if (!a.entityId) return null;
  if (a.entityType === "game") return `/games/${a.entityId}`;
  if (a.entityType === "idea") return `/ideas/${a.entityId}`;
  if (a.entityType === "note") return `/notes?id=${a.entityId}`;
  if (a.entityType === "compare") return `/compare?set=${a.entityId}`;
  return null;
}


export type IdeaCard = Idea & { games: { universeId: number; name: string; iconUrl: string | null }[]; noteCount: number; commentCount: number };
