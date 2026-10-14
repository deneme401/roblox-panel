import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

/** "+112,0%" yeşil/kırmızı hap rozet; renk tek başına anlam taşımasın diye ok ikonu da var. */
export function StatBadge({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn("rounded-full bg-inset px-2.5 py-1 text-xs font-semibold text-muted", className)}>—</span>;
  }
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-2.5 text-xs font-semibold tabular-nums",
        up ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg",
        className,
      )}
    >
      <span className={cn("grid size-4 place-items-center rounded-full text-white", up ? "bg-pos" : "bg-neg")}>
        <Icon className="size-3" strokeWidth={3} />
      </span>
      {formatPercent(value)}
    </span>
  );
}

const barColors = { pos: "bg-pos", warn: "bg-warn", info: "bg-info", accent: "bg-accent", neg: "bg-neg" };

export function ProgressBar({
  value,
  color = "pos",
  className,
}: {
  /** 0..1 */
  value: number;
  color?: keyof typeof barColors;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", barColors[color])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Yuvarlak köşeli ikon kutusu. */
export function IconTile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-inset text-fg shadow-card", className)}>
      {children}
    </div>
  );
}

/** Hero kart içindeki yuvarlak aksiyon butonu + etiket. */
export function RoundAction({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="grid size-12 place-items-center rounded-full bg-gradient-to-b from-white to-zinc-300 text-zinc-900 shadow-[0_4px_12px_rgb(0_0_0/0.35)] transition group-hover:scale-105 dark:from-white/95 dark:to-white/80 dark:text-[#ff6b5b]">
        {icon}
      </span>
      <span className="text-xs text-hero-muted">{label}</span>
    </>
  );
  const cls = "group flex flex-col items-center gap-2";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** İkon kutusu + başlık/alt başlık + sağda değer (referans 1'deki "Transactions" satırı). */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  valueSub,
  href,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  valueSub?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      {icon && <IconTile>{icon}</IconTile>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
      {(value != null || valueSub != null) && (
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums">{value}</div>
          {valueSub && <div className="text-xs text-muted tabular-nums">{valueSub}</div>}
        </div>
      )}
    </>
  );
  const cls = cn("flex items-center gap-3 rounded-[var(--radius-inset)] bg-inset p-3", href && "transition hover:brightness-[0.98] dark:hover:brightness-110", className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ChevronButton({ href }: { href: string }) {
  return (
    <Link href={href} className="grid size-9 shrink-0 place-items-center rounded-xl bg-inset text-fg shadow-card transition hover:scale-105" aria-label="Detay">
      <ChevronRight className="size-4" />
    </Link>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50",
        variant === "primary"
          ? "bg-accent text-accent-fg shadow-card hover:opacity-90 dark:shadow-[0_8px_24px_rgb(255_107_91/0.35)]"
          : "bg-inset text-fg hover:brightness-95 dark:hover:brightness-110",
        className,
      )}
      {...props}
    />
  );
}
