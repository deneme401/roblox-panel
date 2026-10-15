import { Suspense } from "react";
import { getMember } from "@/lib/auth/session";
import { ThemeToggle } from "./theme-toggle";
import { TeamPresence } from "./team-presence";
import { RefreshAllButton } from "./refresh-all";

async function MemberName() {
  const m = await getMember();
  return <>{m?.name ?? "ekip"}</>;
}

async function Team() {
  const m = await getMember();
  return m ? <TeamPresence me={m.id} /> : null;
}

/** Referans 2'deki ince/kalın karışık selamlama başlığı. */
export function Topbar({ title, subtitle, actions }: { title?: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {title ? (
          <h1 className="text-2xl font-bold tracking-tight lg:text-[28px]">{title}</h1>
        ) : (
          <h1 className="text-2xl tracking-tight lg:text-[28px]">
            <span className="font-light text-muted">Hoş geldin, </span>
            <span className="font-bold">
              <Suspense fallback="…">
                <MemberName />
              </Suspense>
            </span>
          </h1>
        )}
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <RefreshAllButton />
        <ThemeToggle />
        <Suspense fallback={<div className="h-9 w-24" />}>
          <Team />
        </Suspense>
      </div>
    </header>
  );
}
