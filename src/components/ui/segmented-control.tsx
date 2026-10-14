"use client";

import { cn } from "@/lib/utils";

/** Referans 2'deki "Income / Outcome" ve "Day / Week / Month" seçicisi. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-full bg-line/70 p-1 dark:bg-inset", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition",
            o.value === value ? "bg-inset text-fg shadow-card dark:bg-accent dark:text-accent-fg" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
