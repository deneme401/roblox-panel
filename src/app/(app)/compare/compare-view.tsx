"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Plus, Search, Trash2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatBadge } from "@/components/ui/primitives";
import { CompareRadar, MultiLineChart, SERIES_COLORS, type Series } from "@/components/charts/charts";
import { GameIcon, ageLabel } from "@/components/game/game-bits";
import { useAction } from "@/components/ui/toast";
import { deleteCompareSet, saveCompareSet } from "@/lib/actions";
import { memberName } from "@/lib/auth/members";
import type { CompareGame } from "@/lib/data/compare";
import { cn, formatCompact, formatNumber } from "@/lib/utils";

type PoolItem = { universeId: number; name: string; iconUrl: string | null; playing: number | null; tracked: boolean };
type SetItem = { id: string; name: string; universeIds: number[]; createdBy: string | null };

const TZ = "Europe/Istanbul";

export function CompareView({ games, pool, sets, activeSet }: { games: CompareGame[]; pool: PoolItem[]; sets: SetItem[]; activeSet: string | null }) {
  const router = useRouter();
  const ids = games.map((g) => g.universeId);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"raw" | "index">("raw");
  const [range, setRange] = useState<"week" | "month">("week");
  const [setName, setSetName] = useState("");
  const { pending, run } = useAction();

  const go = (next: number[]) => router.push(next.length ? `/compare?ids=${next.join(",")}` : "/compare");
  // Renk oyuna bağlı: seçim sırasındaki konum (filtreleme sonrası yeniden boyanmaz)
  const series: Series[] = games.map((g, i) => ({ key: `g${g.universeId}`, name: g.name, color: SERIES_COLORS[i] }));

  const matches = useMemo(() => {
    const n = q.trim().toLocaleLowerCase("tr");
    if (!n) return [];
    return pool.filter((p) => !ids.includes(p.universeId) && p.name.toLocaleLowerCase("tr").includes(n)).slice(0, 8);
  }, [q, pool, ids]);

  const chartData = useMemo(() => {
    const rows = new Map<string, Record<string, number | string | null>>();
    for (const g of games) {
      const pts =
        range === "week"
          ? g.hourly.map((h) => ({ t: h.ts, label: new Date(h.ts).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", timeZone: TZ }), v: h.playing }))
          : g.daily.map((d) => ({ t: d.day, label: new Date(d.day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }), v: d.avgPlaying }));
      const base = pts.find((p) => p.v > 0)?.v ?? 1;
      for (const p of pts) {
        const row = rows.get(p.t) ?? { t: p.t, label: p.label };
        row[`g${g.universeId}`] = mode === "raw" ? p.v : Math.round((p.v / base) * 1000) / 10;
        rows.set(p.t, row);
      }
    }
    return [...rows.values()].sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [games, mode, range]);

  const radar = useMemo(() => {
    if (games.length < 2) return [];
    const axes: { axis: string; get: (g: CompareGame) => number | null; log?: boolean }[] = [
      { axis: "Oyuncu", get: (g) => g.playing, log: true },
      { axis: "Büyüme 24s", get: (g) => (g.growth24h == null ? null : g.growth24h + 1) },
      { axis: "Beğeni", get: (g) => g.likeRatio },
      { axis: "Yükseliş", get: (g) => g.riseScore },
      { axis: "Gamepass", get: (g) => g.passCount },
      { axis: "Tazelik", get: (g) => 1 / Math.sqrt(Math.max(g.ageDays, 1)) },
    ];
    return axes.map((a) => {
      const vals = games.map((g) => {
        const v = a.get(g);
        return v == null ? null : a.log ? Math.log10(Math.max(v, 0) + 1) : v;
      });
      const max = Math.max(...vals.map((v) => v ?? 0), 1e-9);
      const row: Record<string, number | string> = { axis: a.axis };
      games.forEach((g, i) => (row[`g${g.universeId}`] = vals[i] == null ? 0 : Math.round((vals[i]! / max) * 100)));
      return row;
    });
  }, [games]);

  const metricRows: { label: string; render: (g: CompareGame) => React.ReactNode; best?: (g: CompareGame) => number | null }[] = [
    { label: "Anlık oyuncu", render: (g) => formatNumber(g.playing), best: (g) => g.playing },
    { label: "24s değişim", render: (g) => <StatBadge value={g.growth24h} />, best: (g) => g.growth24h },
    { label: "7g değişim", render: (g) => <StatBadge value={g.growth7d} />, best: (g) => g.growth7d },
    { label: "Yükseliş skoru", render: (g) => (g.riseScore != null ? Math.round(g.riseScore) : "—"), best: (g) => g.riseScore },
    { label: "Ziyaret (24s)", render: (g) => formatCompact(g.visits24h), best: (g) => g.visits24h },
    { label: "Toplam ziyaret", render: (g) => formatCompact(g.visits), best: (g) => g.visits },
    { label: "Favori", render: (g) => formatCompact(g.favorites), best: (g) => g.favorites },
    { label: "Beğeni oranı", render: (g) => (g.likeRatio != null ? `%${Math.round(g.likeRatio * 100)}` : "—"), best: (g) => g.likeRatio },
    { label: "Yaş", render: (g) => ageLabel(g.ageDays) },
    { label: "Son güncelleme", render: (g) => (g.updatedDaysAgo === 0 ? "bugün" : `${g.updatedDaysAgo} gün önce`) },
    { label: "Gamepass sayısı", render: (g) => g.passCount, best: (g) => g.passCount },
    { label: "Fiyat (min / medyan / max)", render: (g) => (g.passCount ? `${formatNumber(g.priceMin)} / ${formatNumber(g.priceMedian)} / ${formatNumber(g.priceMax)} R$` : "—") },
  ];

  return (
    <div className="space-y-5">
      {/* Seçim */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {games.map((g, i) => (
            <span key={g.universeId} className="inline-flex items-center gap-2 rounded-full bg-inset py-1 pl-1 pr-2 text-sm font-medium">
              <GameIcon src={g.icon} name={g.name} size={28} className="rounded-full shadow-none" />
              <span className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} />
              <span className="max-w-40 truncate">{g.name}</span>
              <button onClick={() => go(ids.filter((x) => x !== g.universeId))} className="text-muted hover:text-neg" aria-label={`${g.name} çıkar`}>
                <X className="size-4" />
              </button>
            </span>
          ))}
          {games.length < 5 && (
            <div className="relative min-w-60 flex-1">
              <label className="flex h-10 items-center gap-2 rounded-full bg-inset px-4">
                <Search className="size-4 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kıyaslamaya oyun ekle…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              {matches.length > 0 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-inset p-1 shadow-card ring-1 ring-line">
                  {matches.map((m) => (
                    <button
                      key={m.universeId}
                      onClick={() => {
                        setQ("");
                        go([...ids, m.universeId]);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-surface"
                    >
                      <GameIcon src={m.iconUrl} name={m.name} size={28} className="rounded-lg shadow-none" />
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-muted tabular-nums">{formatCompact(m.playing)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {games.length < 2 && (
          <p className="mt-4 text-sm text-muted">
            En az 2 oyun seç. Listede olmayan bir oyunu önce <Link href="/trends" className="underline">Trendler</Link> sayfasından link ile ekleyebilirsin.
          </p>
        )}
      </Card>

      {games.length >= 1 && (
        <div className="grid gap-5 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold">Oyuncu sayısı</h3>
                <p className="text-xs text-muted">{mode === "raw" ? "Ham değer" : "Endeks: ilk ölçüm = 100 (farklı ölçekleri karşılaştırmak için)"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SegmentedControl value={mode} onChange={setMode} options={[{ value: "raw", label: "Ham" }, { value: "index", label: "Endeks" }]} />
                <SegmentedControl value={range} onChange={setRange} options={[{ value: "week", label: "7 gün" }, { value: "month", label: "30 gün" }]} />
              </div>
            </div>
            {chartData.length > 1 ? (
              <MultiLineChart data={chartData} series={series} format={mode === "raw" ? undefined : (v) => v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} />
            ) : (
              <p className="grid h-60 place-items-center rounded-2xl bg-inset text-sm text-muted">Bu aralıkta geçmiş veri yok; saatlik toplama biriktikçe dolar.</p>
            )}
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader title="Radar" subtitle="Her eksen gruptaki en iyiye göre 0–100" />
            {radar.length ? <CompareRadar data={radar} series={series} /> : <p className="text-sm text-muted">Radar için en az 2 oyun gerekli.</p>}
          </Card>
        </div>
      )}

      {games.length >= 1 && (
        <Card className="overflow-hidden p-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Metrik</th>
                  {games.map((g, i) => (
                    <th key={g.universeId} className="px-3 py-2 font-medium">
                      <Link href={`/games/${g.universeId}`} className="inline-flex items-center gap-1.5 text-fg hover:underline">
                        <span className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                        <span className="max-w-40 truncate">{g.name}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((m) => {
                  const vals = m.best ? games.map((g) => m.best!(g)) : [];
                  const top = vals.length ? Math.max(...vals.map((v) => v ?? -Infinity)) : null;
                  return (
                    <tr key={m.label} className="border-t border-line/60">
                      <td className="px-3 py-2.5 text-muted">{m.label}</td>
                      {games.map((g, i) => (
                        <td key={g.universeId} className={cn("px-3 py-2.5 tabular-nums", top != null && games.length > 1 && vals[i] === top && top !== -Infinity && "font-bold")}>
                          {m.render(g)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Kayıtlı setler */}
      <Card>
        <CardHeader title="Kayıtlı kıyas setleri" subtitle="Ekipçe sık baktığınız rakip grupları" />
        <div className="flex flex-wrap gap-2">
          {sets.length === 0 && <p className="text-sm text-muted">Henüz kayıtlı set yok.</p>}
          {sets.map((s) => (
            <span key={s.id} className={cn("group inline-flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-sm", s.id === activeSet ? "bg-accent text-accent-fg" : "bg-inset")}>
              <Link href={`/compare?set=${s.id}`} className="font-medium">
                {s.name} <span className="opacity-60">· {s.universeIds.length} oyun · {memberName(s.createdBy)}</span>
              </Link>
              <button onClick={() => run(() => deleteCompareSet(s.id))} className="opacity-50 hover:opacity-100" aria-label="Seti sil">
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        {games.length >= 2 && (
          <form
            className="mt-4 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveCompareSet(setName, ids), { success: "Set kaydedildi", onDone: () => setSetName("") });
            }}
          >
            <input value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Bu seçimi kaydet: ör. Tycoon rakipleri" className="h-10 flex-1 rounded-full bg-inset px-4 text-sm outline-none ring-accent focus:ring-2" />
            <button disabled={pending || !setName.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-40">
              <Bookmark className="size-4" /> Kaydet
            </button>
          </form>
        )}
        {games.length === 0 && pool.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted">Hızlı başla: en çok oynanan 3 oyunu kıyasla</p>
            <button onClick={() => go(pool.slice(0, 3).map((p) => p.universeId))} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-inset px-4 text-sm font-semibold">
              <Plus className="size-4" /> {pool.slice(0, 3).map((p) => p.name).join(", ")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
