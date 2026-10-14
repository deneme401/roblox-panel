import { Suspense } from "react";
import { Topbar } from "@/components/layout/topbar";
import { listIdeas } from "@/lib/data/workspace";
import { IdeaBoard } from "./idea-board";

export default function IdeasPage() {
  return (
    <>
      <Topbar title="Fikirler" subtitle="Sürükle-bırak ile aşamalar arasında taşı. Kartı açınca puanlama, rakipler ve AI değerlendirmesi." />
      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />)}</div>}>
        <Board />
      </Suspense>
    </>
  );
}

async function Board() {
  const ideas = await listIdeas();
  return <IdeaBoard ideas={JSON.parse(JSON.stringify(ideas))} />;
}
