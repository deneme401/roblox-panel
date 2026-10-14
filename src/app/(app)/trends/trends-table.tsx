"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownUp, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCompact } from "@/lib/utils";
import { SORT_IDS, SORT_LABELS, type SortId } from "@/lib/roblox/client";
import type { GameRow } from "@/lib/roblox/queries";
import { GameIcon, ageLabel } from "@/components/game/game-bits";

const AGE_FILTERS = [
  { value: 0, label: "Tümü" },
  { value: 28, label: "≤ 28 gün" },
  { value: 90, label: "≤ 3 ay" },
  { value: 365, label: "≤ 1 yıl" },
];

type SortKey = "rank" | "playing" | "visits" | "likeRatio" | "ageDays" | "updatedDaysAgo";

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
        active ? "bg-accent text-accent-fg shadow-card" : "bg-surface text-muted hover:text-fg dark:border dark:border-line",
      )}
    >
      {children}
    </button>
  );
}

export function TrendsTable({ games }: { games: GameRow[] }) {
  const params = useSearchParams();
  const initial = (SORT_IDS as readonly string[]).includes(params.get("sort") ?? "") ? (params.get("sort") as SortId) : "all";
  const [list, setList] = useState<SortId | "all">(initial);
  const [genre, setGenre] = useState<string>("all");
  const [maxAge, setMaxAge] = useState(0);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(initial === "all" ? "playing" : "rank");
  const [asc, setAsc] = useState(initial !== "all");

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    games.forEach((g) => g.genre && counts.set(g.genre, (counts.get(g.genre) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [games]);

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const filtered = games.filter(
      (g) =>
        (list === "all" || g.sorts[list] != null) &&
        (genre === "all" || g.genre === genre) &&
        (!maxAge || g.ageDays <= maxAge) &&
        (!needle || g.name.toLocaleLowerCase("tr").includes(needle) || g.creator.toLocaleLowerCase("tr").includes(needle)),
    );
    const val = (g: GameRow): number => {
      if (sortKey === "rank") return list === "all" ? Math.min(...Object.values(g.sorts)) : (g.sorts[list] ?? 999);
      return (g[sortKey] as number | null) ?? -1;
    };
    return filtered.sort((a, b) => (asc ? val(a) - val(b) : val(b) - val(a)));
  }, [games, list, genre, maxAge, q, sortKey, asc]);

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button
        type="button"
        onClick={() => {
          if (sortKey === key) setAsc(!asc);
          else {
            setSortKey(key);
            setAsc(key === "rank" || key === "ageDays" || key === "updatedDaysAgo");
          }
        }}
        className={cn("inline-flex items-center gap-1 hover:text-fg", sortKey === key && "text-fg")}
      >
        {label}
        <ArrowDownUp className="size-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Pill active={list === "all"} onClick={() => setList("all")}>
          Tüm listeler
        </Pill>
        {SORT_IDS.map((s) => (
          <Pill key={s} active={list === s} onClick={() => setList(s)}>
            {SORT_LABELS[s]}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-4 shadow-card sm:max-w-xs dark:border dark:border-line">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Oyun veya geliştirici ara"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="h-11 rounded-full bg-surface px-4 text-sm shadow-card outline-none dark:border dark:border-line"
          aria-label="Tür"
        >
          <option value="all">Tüm türler</option>
          {genres.map(([g, n]) => (
            <option key={g} value={g}>
              {g} ({n})
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-full bg-surface p-1 shadow-card dark:border dark:border-line">
          {AGE_FILTERS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setMaxAge(a.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                maxAge === a.value ? "bg-inset text-fg shadow-card dark:bg-accent dark:text-accent-fg" : "text-muted",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">{rows.length} oyun</span>
      </div>

      <Card className="overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                {header("rank", "#", "w-14")}
                <th className="px-3 py-2 font-medium">Oyun</th>
                {header("playing", "Oyuncu", "text-right")}
                {header("visits", "Ziyaret", "text-right")}
                {header("likeRatio", "Beğeni", "text-right")}
                {header("ageDays", "Yaş", "text-right")}
                {header("updatedDaysAgo", "Güncelleme", "text-right")}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const rank = list === "all" ? Math.min(...Object.values(g.sorts)) : g.sorts[list];
                return (
                  <tr key={g.universeId} className="group">
                    <td className="rounded-l-2xl px-3 py-2 text-muted tabular-nums group-hover:bg-inset">{rank}</td>
                    <td className="px-3 py-2 group-hover:bg-inset">
                      <Link href={`/games/${g.universeId}`} className="flex items-center gap-3">
                        <GameIcon src={g.icon} name={g.name} size={40} className="rounded-xl shadow-none" />
                        <div className="min-w-0">
                          <div className="max-w-[280px] truncate font-semibold">{g.name}</div>
                          <div className="max-w-[280px] truncate text-xs text-muted">
                            {g.genre ?? "—"} · {g.creator}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums group-hover:bg-inset">{formatCompact(g.playing)}</td>
                    <td className="px-3 py-2 text-right tabular-nums group-hover:bg-inset">{formatCompact(g.visits)}</td>
                    <td className="px-3 py-2 text-right tabular-nums group-hover:bg-inset">
                      {g.likeRatio != null ? `%${Math.round(g.likeRatio * 100)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right group-hover:bg-inset">
                      <span className={cn(g.ageDays <= 28 && "rounded-full bg-pos-soft px-2 py-0.5 text-xs font-semibold text-pos")}>
                        {ageLabel(g.ageDays)}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-3 py-2 text-right text-muted tabular-nums group-hover:bg-inset">
                      {g.updatedDaysAgo === 0 ? "bugün" : `${g.updatedDaysAgo} g önce`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
