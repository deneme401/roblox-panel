"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompareArrows, Home, Lightbulb, NotebookPen, Radio, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Pano", icon: Home },
  { href: "/trends", label: "Trendler", icon: TrendingUp },
  { href: "/compare", label: "Kıyasla", icon: GitCompareArrows },
  { href: "/ideas", label: "Fikirler", icon: Lightbulb },
  { href: "/notes", label: "Notlar", icon: NotebookPen },
  { href: "/signals", label: "Sinyaller", icon: Radio },
  { href: "/settings", label: "Ayarlar", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/games");
  return pathname.startsWith(href);
}

/**
 * Referans 1'deki siyah hap menü. Masaüstünde solda dikey ve yüzen,
 * mobilde altta yatay.
 */
export function PillNav() {
  return <PillNavView pathname={usePathname()} />;
}

/** Hook'suz görünüm; Suspense fallback'inde aktif öğe olmadan da kullanılır. */
export function PillNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Ana menü"
      className={cn(
        "fixed z-40 flex gap-1.5 rounded-full bg-nav p-2 shadow-[0_12px_32px_rgb(0_0_0/0.28)] dark:border dark:border-line",
        "bottom-4 left-1/2 -translate-x-1/2 flex-row",
        "lg:bottom-auto lg:left-5 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col",
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative grid size-11 place-items-center rounded-full transition",
              active ? "bg-white text-zinc-900 dark:bg-accent dark:text-accent-fg" : "text-nav-fg hover:text-white",
              // mobilde ayarlar alt menüde yer kaplamasın
              href === "/settings" && "hidden lg:grid",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
            <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-full bg-nav px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-card transition group-hover:opacity-100 lg:block">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
