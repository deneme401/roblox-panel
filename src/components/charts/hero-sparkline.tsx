"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";
import type { Point } from "./charts";

/** Hero kart içindeki eksensiz beyaz alan grafiği (son 48 saat toplam oyuncu). */
export function HeroSparkline({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          cursor={{ stroke: "rgb(255 255 255 / .4)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 tabular-nums">
                {String(label)} · {formatNumber(payload[0].value as number)}
              </div>
            ) : null
          }
        />
        <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} fill="url(#hero-fill)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
