import { Suspense } from "react";
import { PillNav, PillNavView } from "@/components/layout/pill-nav";
import { RealtimeBridge } from "@/components/layout/realtime-bridge";
import { getMember } from "@/lib/auth/session";

async function Realtime() {
  const m = await getMember();
  return m ? <RealtimeBridge member={m.id} /> : null;
}

// Sayfalar oturuma bağlı ve veri saatlik değiştiği için istek anında render edilir: her sayfa
// `await connection()` çağırır. Bu sınır, sayfa yüklenirken iskelet gösterir.
function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-10 w-64 rounded-full bg-surface" />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="h-72 rounded-[var(--radius-card)] bg-surface lg:col-span-5" />
        <div className="h-72 rounded-[var(--radius-card)] bg-surface lg:col-span-7" />
      </div>
      <div className="h-64 rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<PillNavView pathname="" />}>
        <PillNav />
      </Suspense>
      <Suspense>
        <Realtime />
      </Suspense>
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pl-28 lg:pr-10 lg:pt-8">
        <Suspense fallback={<PageSkeleton />}>
          {children}
        </Suspense>
      </main>
    </>
  );
}
