"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatNumber } from "@/lib/utils";

/** 10.000 altını tam yaz (2.700 R$), üstünü kısalt (12,4 B). */
const tickFormat = (v: number) => (Math.abs(v) < 10_000 ? formatNumber(v) : formatCompact(v));

export type Point = { label: string; value: number };

const axisTick = { fill: "var(--muted)", fontSize: 12 };

/** Referans 2/3'teki hap şeklinde değer etiketi. */
type PillTooltipProps = { active?: boolean; payload?: readonly { value?: unknown }[]; label?: unknown; unit?: string };

function PillTooltip({ active, payload, label, unit }: PillTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-full bg-fg px-3 py-1.5 text-xs font-semibold text-bg shadow-card tabular-nums dark:bg-accent dark:text-accent-fg">
      <span className="font-normal opacity-70">{String(label)} · </span>
      {formatNumber(payload[0].value as number)}
      {unit && <span className="font-normal opacity-70"> {unit}</span>}
    </div>
  );
}

/** Siyah (koyuda mercan) 2px çizgi + hafif degrade dolgu. Hover'da dikey çizgi ve hap etiket. */
export function SmoothAreaChart({ data, height = 240, unit }: { data: Point[]; height?: number; unit?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-ink)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--chart-ink)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} dy={6} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={tickFormat} />
        <Tooltip
          content={(p) => <PillTooltip {...p} unit={unit} />}
          cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--chart-ink)"
          strokeWidth={2}
          fill={`url(#fill-${id})`}
          activeDot={{ r: 5, fill: "var(--chart-ink)", stroke: "var(--inset)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Referans 1'deki "Saving Analytics": yuvarlak uçlu, taralı koyu sütunlar. */
export function HatchedBarChart({ data, height = 240, unit }: { data: Point[]; height?: number; unit?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--chart-ink)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--surface)" strokeOpacity={0.12} strokeWidth={2} />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} dy={6} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={tickFormat} />
        <Tooltip content={(p) => <PillTooltip {...p} unit={unit} />} cursor={{ fill: "var(--line)", opacity: 0.4, radius: 12 }} />
        <Bar dataKey="value" fill={`url(#hatch-${id})`} radius={[10, 10, 3, 3]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Referans 2'deki koyu kart içi yüzde halkası. */
export function DonutGauge({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? ""} %${Math.round(v * 100)}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums">%{Math.round(v * 100)}</span>
    </div>
  );
}

/** Tablo satırları için küçük trend çizgisi. Son nokta işaretli. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 6) + 3, height - 3 - ((v - min) / span) * (height - 6)]);
  const up = values[values.length - 1] >= values[0];
  const color = up ? "var(--pos)" : "var(--neg)";
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} stroke="var(--inset)" strokeWidth={1.5} />
    </svg>
  );
}

/** Kıyaslama için kategorik seri renkleri (sabit sıra; renk oyuna bağlı kalır, sıralamaya değil). */
export const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

export type Series = { key: string; name: string; color: string };

type MultiTooltipProps = {
  active?: boolean;
  payload?: readonly { value?: unknown; name?: unknown; color?: string }[];
  label?: unknown;
  format: (v: number) => string;
};

function MultiTooltip({ active, payload, label, format }: MultiTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-2xl bg-inset px-3 py-2 text-xs shadow-card ring-1 ring-line">
      <div className="mb-1 font-semibold">{String(label)}</div>
      {[...payload]
        .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
        .map((p) => (
          <div key={String(p.name)} className="flex items-center justify-between gap-3 tabular-nums">
            <span className="flex items-center gap-1.5 truncate">
              <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{String(p.name)}</span>
            </span>
            <span className="font-semibold">{p.value == null ? "—" : format(Number(p.value))}</span>
          </div>
        ))}
    </div>
  );
}

/** Üst üste çizgi grafik (en fazla 5 seri). Tek eksen; normalize modda değerler endekstir (ilk nokta = 100). */
export function MultiLineChart({
  data,
  series,
  height = 300,
  format = tickFormat,
}: {
  data: Record<string, number | string | null>[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={28} dy={6} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={format} />
        <Tooltip content={(p) => <MultiTooltip {...p} format={format} />} cursor={{ stroke: "var(--muted)", strokeWidth: 1 }} />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingBottom: 8, color: "var(--fg)" }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 4, stroke: "var(--inset)", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Kıyaslama radarı: her eksen 0-100 arası (gruptaki en iyiye göre). */
export function CompareRadar({
  data,
  series,
  height = 300,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--chart-grid)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip content={(p) => <MultiTooltip {...p} format={(v) => String(Math.round(v))} />} />
        {series.map((s) => (
          <Radar key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.08} />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
