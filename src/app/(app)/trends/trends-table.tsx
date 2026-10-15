"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownUp, Search, Sparkles, Star, StarOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCompact } from "@/lib/utils";
import { SORT_IDS, SORT_LABELS, type SortId } from "@/lib/roblox/sorts";
import type { GameRow } from "@/lib/roblox/queries";
import { GameIcon, ageLabel } from "@/components/game/game-bits";
import { Sparkline } from "@/components/charts/charts";
import { StatBadge } from "@/components/ui/primitives";
import { useAction, toast } from "@/components/ui/toast";
import { setTrackedMany } from "@/lib/actions";

const AGE_FILTERS = [
  { value: 0, label: "Tümü" },
  { value: 28, label: "≤ 28 gün" },
  { value: 90, label: "≤ 3 ay" },
  { value: 365, label: "≤ 1 yıl" },
];

type SortKey = "rank" | "playing" | "visits" | "likeRatio" | "ageDays" | "updatedDaysAgo" | "growth24h" | "growth7d" | "riseScore";

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
  const hasDb = games.some((g) => g.riseScore !== undefined);
  const initialKey: SortKey = params.get("order") === "rise" && hasDb ? "riseScore" : initial === "all" ? "playing" : "rank";
  const [sortKey, setSortKey] = useState<SortKey>(initialKey);
  const [asc, setAsc] = useState(initialKey === "rank");
  const [onlyTracked, setOnlyTracked] = useState(false);
  const [onlyNew, setOnlyNew] = useState(params.get("new") === "1");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const bulk = useAction();
  const newCount = useMemo(() => games.filter((g) => g.isNew).length, [games]);

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
        (!onlyTracked || g.tracked) &&
        (!onlyNew || g.isNew) &&
        (!needle || g.name.toLocaleLowerCase("tr").includes(needle) || g.creator.toLocaleLowerCase("tr").includes(needle)),
    );
    const val = (g: GameRow): number => {
      if (sortKey === "rank") return list === "all" ? Math.min(999, ...Object.values(g.sorts)) : (g.sorts[list] ?? 999);
      return (g[sortKey] as number | null | undefined) ?? -Infinity;
    };
    const cmp = (x: number, y: number) => (x === y ? 0 : x === -Infinity ? 1 : y === -Infinity ? -1 : asc ? x - y : y - x);
    return filtered.sort((a, b) => cmp(val(a), val(b)));
  }, [games, list, genre, maxAge, q, sortKey, asc, onlyTracked, onlyNew]);

  const visibleIds = rows.map((g) => g.universeId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const untrackedVisible = rows.filter((g) => !g.tracked).map((g) => g.universeId);
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const track = (ids: number[], tracked: boolean) =>
    bulk.run(() => setTrackedMany(ids, tracked), {
      topic: "market",
      onDone: (d) => {
        toast("ok", tracked ? `${d?.count ?? 0} oyun takibe alındı` : `${d?.count ?? 0} oyun takipten çıkarıldı`);
        setSelected(new Set());
      },
    });

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
        {hasDb && (
          <button
            type="button"
            onClick={() => setOnlyTracked(!onlyTracked)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-card",
              onlyTracked ? "bg-accent text-accent-fg" : "bg-surface text-muted dark:border dark:border-line",
            )}
          >
            <Star className="size-3.5" /> Takiptekiler
          </button>
        )}
        {hasDb && (
          <button
            type="button"
            onClick={() => setOnlyNew(!onlyNew)}
            title="Son 72 saatte listelerde ilk kez görülen oyunlar"
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-card",
              onlyNew ? "bg-accent text-accent-fg" : "bg-surface text-muted dark:border dark:border-line",
            )}
          >
            <Sparkles className="size-3.5" /> Yeni ({newCount})
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{rows.length} oyun</span>
      </div>

      {hasDb && (
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm shadow-card dark:border dark:border-line">
          <span className="px-1 text-xs text-muted">{selected.size ? `${selected.size} oyun seçili` : "Satırları seçerek toplu işlem yap"}</span>
          {selected.size > 0 && (
            <>
              <button
                type="button"
                disabled={bulk.pending}
                onClick={() => track([...selected], true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-accent-fg disabled:opacity-50"
              >
                <Star className="size-3.5" /> Seçilenleri takibe al
              </button>
              <button
                type="button"
                disabled={bulk.pending}
                onClick={() => track([...selected], false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-inset px-3 text-xs font-semibold disabled:opacity-50"
              >
                <StarOff className="size-3.5" /> Takipten çıkar
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-fg">
                Seçimi temizle
              </button>
            </>
          )}
          <button
            type="button"
            disabled={bulk.pending || !untrackedVisible.length}
            onClick={() => track(untrackedVisible, true)}
            title="Şu anki filtreyle görünen ve takipte olmayan tüm oyunları takibe al"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-inset px-3 text-xs font-semibold disabled:opacity-50"
          >
            <Star className="size-3.5" /> Görünenlerin hepsini takibe al ({untrackedVisible.length})
          </button>
        </div>
      )}

      <Card className="overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                {hasDb && (
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label="Görünenlerin hepsini seç"
                      checked={allVisibleSelected}
                      onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visibleIds))}
                      className="size-4 accent-[var(--accent)]"
                    />
                  </th>
                )}
                {header("rank", "#", "w-14")}
                <th className="px-3 py-2 font-medium">Oyun</th>
                {header("playing", "Oyuncu", "text-right")}
                {hasDb && <th className="px-3 py-2 font-medium">48 saat</th>}
                {hasDb && header("growth24h", "24s", "text-right")}
                {hasDb && header("growth7d", "7g", "text-right")}
                {hasDb && header("riseScore", "Skor", "text-right")}
                {header("visits", "Ziyaret", "text-right")}
                {header("likeRatio", "Beğeni", "text-right")}
                {header("ageDays", "Yaş", "text-right")}
                {header("updatedDaysAgo", "Güncelleme", "text-right")}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const ranks = Object.values(g.sorts);
                const rank = list === "all" ? (ranks.length ? Math.min(...ranks) : "—") : g.sorts[list];
                return (
                  <tr key={g.universeId} className={cn("group", selected.has(g.universeId) && "[&>td]:bg-inset")}>
                    {hasDb && (
                      <td className="rounded-l-2xl px-2 py-2 group-hover:bg-inset">
                        <input
                          type="checkbox"
                          aria-label={`${g.name} seç`}
                          checked={selected.has(g.universeId)}
                          onChange={() => toggle(g.universeId)}
                          className="size-4 accent-[var(--accent)]"
                        />
                      </td>
                    )}
                    <td className={cn("px-3 py-2 text-muted tabular-nums group-hover:bg-inset", !hasDb && "rounded-l-2xl")}>{rank}</td>
                    <td className="px-3 py-2 group-hover:bg-inset">
                      <Link href={`/games/${g.universeId}`} className="flex items-center gap-3">
                        <GameIcon src={g.icon} name={g.name} size={40} className="rounded-xl shadow-none" />
                        <div className="min-w-0">
                          <div className="flex max-w-[280px] items-center gap-1 truncate font-semibold">
                            {g.tracked && (
                              <Star
                                className={cn("size-3 shrink-0", g.trackedAuto ? "text-warn" : "fill-warn text-warn")}
                                aria-label={g.trackedAuto ? "Otomatik takipte" : "Takipte"}
                              />
                            )}
                            <span className="truncate">{g.name}</span>
                            {g.isNew && (
                              <span className="shrink-0 rounded-full bg-pos-soft px-1.5 py-0.5 text-[10px] font-bold text-pos">YENİ</span>
                            )}
                          </div>
                          <div className="max-w-[280px] truncate text-xs text-muted">
                            {g.genre ?? "—"} · {g.creator}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums group-hover:bg-inset">{formatCompact(g.playing)}</td>
                    {hasDb && (
                      <td className="px-3 py-2 group-hover:bg-inset">
                        <Sparkline values={g.spark ?? []} width={88} height={28} />
                      </td>
                    )}
                    {hasDb && (
                      <td className="px-3 py-2 text-right group-hover:bg-inset">
                        <StatBadge value={g.growth24h} />
                      </td>
                    )}
                    {hasDb && (
                      <td className="px-3 py-2 text-right group-hover:bg-inset">
                        <StatBadge value={g.growth7d} />
                      </td>
                    )}
                    {hasDb && (
                      <td className="px-3 py-2 text-right font-semibold tabular-nums group-hover:bg-inset">
                        {g.riseScore != null ? Math.round(g.riseScore) : "—"}
                      </td>
                    )}
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
