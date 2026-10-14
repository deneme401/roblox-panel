import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** Gri yüzey kartı (referans 1'deki hedef kartı dış katmanı). */
export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] bg-surface p-5 shadow-card dark:border dark:border-line", className)}
      {...props}
    />
  );
}

/** Kart içindeki beyaz alt kart. */
export function InsetCard({ className, ...props }: DivProps) {
  return <div className={cn("rounded-[var(--radius-inset)] bg-inset p-4", className)} {...props} />;
}

/** Ekrandaki tek yüksek kontrastlı kart: açıkta siyah degrade, koyuda mercan degrade. */
export function HeroCard({ className, children, ...props }: DivProps) {
  return (
    <div
      className={cn("hero-gradient relative overflow-hidden rounded-[var(--radius-card)] p-6 text-hero-fg", className)}
      {...props}
    >
      <div className="hero-lines pointer-events-none absolute inset-0 dark:opacity-0" aria-hidden />
      <div className="relative flex h-full flex-col justify-center">{children}</div>
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** "Your goals ... View all >" tarzı bölüm başlığı. */
export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}
