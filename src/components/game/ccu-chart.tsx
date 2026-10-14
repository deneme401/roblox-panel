"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { HatchedBarChart, SmoothAreaChart } from "@/components/charts/charts";
import type { GameHistory } from "@/lib/data/game";

type Range = "day" | "week" | "month";
const TZ = "Europe/Istanbul";

/** Referans 2'deki Gün/Hafta/Ay seçicili oyuncu grafiği + günlük ziyaret barları. */
export function CcuChart({ hourly, daily }: Pick<GameHistory, "hourly" | "daily">) {
  const [range, setRange] = useState<Range>("day");
  // Aralık son ölçüme göre (render saf kalsın diye Date.now yerine)
  const now = hourly.length ? new Date(hourly[hourly.length - 1].ts).getTime() : 0;
  let data: { label: string; value: number }[];
  if (range === "month") {
    data = daily.map((d) => ({
      label: new Date(d.day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      value: d.avgPlaying,
    }));
  } else {
    const span = range === "day" ? 24 : 24 * 7;
    data = hourly
      .filter((h) => now - new Date(h.ts).getTime() <= span * 3_600_000)
      .map((h) => ({
        label: new Date(h.ts).toLocaleString("tr-TR", range === "day" ? { hour: "2-digit", minute: "2-digit", timeZone: TZ } : { day: "numeric", month: "short", hour: "2-digit", timeZone: TZ }),
        value: h.playing,
      }));
  }

  // Günlük ziyaret: toplam ziyaret sayacının gün sonu farkı
  const visitsPerDay = daily.slice(1).map((d, i) => ({
    label: new Date(d.day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    value: Math.max(0, d.visits - daily[i].visits),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold">Oyuncu geçmişi</h3>
            <p className="text-xs text-muted">{range === "month" ? "Günlük ortalama" : "Saatlik ölçüm"}</p>
          </div>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: "day", label: "Gün" },
              { value: "week", label: "Hafta" },
              { value: "month", label: "Ay" },
            ]}
          />
        </div>
        {data.length > 1 ? (
          <SmoothAreaChart data={data} unit="oyuncu" height={260} />
        ) : (
          <p className="grid h-40 place-items-center rounded-2xl bg-inset text-center text-sm text-muted">
            Bu aralık için yeterli veri yok. Saatlik toplama her saat bir nokta ekler.
          </p>
        )}
      </div>
      {visitsPerDay.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold">Günlük ziyaret</h3>
          <p className="mb-3 text-xs text-muted">Toplam ziyaret sayacındaki günlük artış</p>
          <HatchedBarChart data={visitsPerDay.slice(-14)} unit="ziyaret" height={200} />
        </div>
      )}
    </div>
  );
}
