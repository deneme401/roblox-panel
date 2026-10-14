import { Suspense } from "react";
import { connection } from "next/server";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader } from "@/components/ui/card";
import { AddGameForm } from "@/components/game/add-game-form";
import { genreStats, getMarketRows, type GenreStat } from "@/lib/data/market";
import { cn, formatCompact, formatPercent, timeAgo } from "@/lib/utils";
import { TrendsTable } from "./trends-table";

/** Büyüme hücresi rengi: diverging (yeşil/kırmızı, sıfırda nötr). Renk tek başına değil, değer de yazılı. */
function growthStyle(v: number | null) {
  if (v == null) return {};
  const a = Math.min(1, Math.abs(v) / 0.5);
  return { background: `color-mix(in oklab, var(${v >= 0 ? "--pos" : "--neg"}) ${Math.round(a * 45)}%, transparent)` };
}

/** Yükseliş skoru hücresi: sequential (tek ton, açık → koyu). */
function scoreStyle(v: number | null, max: number) {
  if (v == null || !max) return {};
  return { background: `color-mix(in oklab, var(--info) ${Math.round((v / max) * 50)}%, transparent)` };
}

function NicheTable({ stats }: { stats: GenreStat[] }) {
  const maxRise = Math.max(...stats.map((s) => s.avgRise ?? 0), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium">Tür</th>
            <th className="px-3 py-2 text-right font-medium">Oyun</th>
            <th className="px-3 py-2 text-right font-medium">≤ 28 gün</th>
            <th className="px-3 py-2 text-right font-medium">Toplam oyuncu</th>
            <th className="px-3 py-2 text-right font-medium">Medyan 24s büyüme</th>
            <th className="px-3 py-2 text-right font-medium">Ort. yükseliş skoru</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.genre} className="border-t border-line/60">
              <td className="px-3 py-2 font-semibold">{s.genre}</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.games}</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.fresh}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCompact(s.playing)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                <span className="rounded-full px-2 py-0.5 font-semibold" style={growthStyle(s.avgGrowth)}>
                  {formatPercent(s.avgGrowth)}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                <span className="rounded-full px-2 py-0.5 font-semibold" style={scoreStyle(s.avgRise, maxRise)}>
                  {s.avgRise != null ? s.avgRise.toFixed(1) : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TrendsPage() {
  await connection();
  const { games, source, updatedAt } = await getMarketRows();
  const stats = genreStats(games);
  return (
    <>
      <Topbar
        title="Trendler"
        subtitle={source === "db" ? `Saatlik veri · son ölçüm ${timeAgo(updatedAt)}` : "Canlı Roblox verisi (geçmiş henüz yok)"}
        actions={<AddGameForm className="hidden w-80 md:flex" />}
      />
      <Suspense>
        <TrendsTable games={games} />
      </Suspense>
      <Card className={cn("mt-8")} id="nisler">
        <CardHeader
          title="Niş tablosu"
          subtitle="Listelerdeki oyunların türe göre dağılımı. Yeşil: oyuncu artıyor, kırmızı: azalıyor; mavi koyuldukça skor yüksek."
        />
        <NicheTable stats={stats} />
      </Card>
    </>
  );
}
