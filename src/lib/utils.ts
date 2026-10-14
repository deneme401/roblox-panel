import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("tr-TR");

/** 12.345 → "12,3 B", 1.200.000 → "1,2 Mn" */
export function formatCompact(n: number | null | undefined) {
  return n == null ? "—" : compact.format(n);
}

export function formatNumber(n: number | null | undefined) {
  return n == null ? "—" : full.format(n);
}

/** 0.124 → "+12,4%" */
export function formatPercent(ratio: number | null | undefined, digits = 1) {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${(ratio * 100).toLocaleString("tr-TR", { maximumFractionDigits: digits })}%`;
}

export function daysSince(iso: string | Date) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function formatAge(iso: string | Date) {
  const d = daysSince(iso);
  if (d < 1) return "bugün";
  if (d < 30) return `${d} gün`;
  if (d < 365) return `${Math.floor(d / 30)} ay`;
  return `${(d / 365).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} yıl`;
}

/** "az önce", "12 dk önce", "3 sa önce", "2 gün önce" */
export function timeAgo(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
