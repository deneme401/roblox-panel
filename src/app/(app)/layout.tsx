import { Suspense } from "react";
import { PillNav, PillNavView } from "@/components/layout/pill-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<PillNavView pathname="" />}>
        <PillNav />
      </Suspense>
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pl-28 lg:pr-10 lg:pt-8">{children}</main>
    </>
  );
}
