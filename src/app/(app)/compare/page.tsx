import { Suspense } from "react";
import { connection } from "next/server";
import { Topbar } from "@/components/layout/topbar";
import { getCompareData, getComparePool } from "@/lib/data/compare";
import { listCompareSets } from "@/lib/data/workspace";
import { CompareView } from "./compare-view";

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <>
      <Topbar title="Kıyasla" subtitle="2–5 oyunu metrik, geçmiş ve monetizasyon açısından yan yana koy" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <Compare searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Compare({ searchParams }: { searchParams: PageProps<"/compare">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const sets = await listCompareSets();
  const setId = typeof sp.set === "string" ? sp.set : null;
  const fromSet = setId ? sets.find((s) => s.id === setId) : null;
  const raw = fromSet ? fromSet.universeIds.join(",") : typeof sp.ids === "string" ? sp.ids : "";
  const ids = [...new Set(raw.split(",").map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))].slice(0, 5);
  const [games, pool] = await Promise.all([getCompareData(ids), getComparePool()]);
  return (
    <CompareView
      games={games}
      pool={pool}
      sets={sets.map((s) => ({ id: s.id, name: s.name, universeIds: s.universeIds.map(Number), createdBy: s.createdBy }))}
      activeSet={fromSet?.id ?? null}
    />
  );
}
