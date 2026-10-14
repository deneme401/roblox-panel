import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { CommentsSection, NotesSection, SectionSkeleton } from "@/components/workspace/sections";
import { autoScores, getIdea } from "@/lib/data/workspace";
import { getComparePool } from "@/lib/data/compare";
import { hasGemini } from "@/lib/ai/gemini";
import { IdeaEditor, IdeaEvalPanel, LinkedGames, ScoreMatrix } from "./idea-detail";

export default function IdeaPage({ params }: PageProps<"/ideas/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
      <IdeaDetail params={params} />
    </Suspense>
  );
}

async function IdeaDetail({ params }: { params: PageProps<"/ideas/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const [data, pool] = await Promise.all([getIdea(id), getComparePool()]);
  if (!data) notFound();
  const { idea, games } = data;
  const auto = autoScores(games);
  const plain = JSON.parse(JSON.stringify({ idea, games }));

  return (
    <>
      <header className="mb-6 flex items-center gap-3">
        <Link href="/ideas" className="grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label="Geri">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-[15px] font-medium">Fikir</span>
      </header>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <IdeaEditor idea={plain.idea} />
          <Card>
            <CardHeader title="Rakipler" subtitle="Bu fikre benzeyen oyunlar; talep ve rekabet puanı bunlardan hesaplanır" />
            <LinkedGames ideaId={idea.id} games={plain.games} pool={pool} />
          </Card>
          <Card>
            <CardHeader title="Gemini değerlendirmesi" subtitle="Fikir metni + rakip metrikleri + pazar dağılımı" />
            <IdeaEvalPanel ideaId={idea.id} evaluation={plain.idea.aiEval} model={idea.aiModel} at={plain.idea.aiEvaluatedAt} gemini={hasGemini()} />
          </Card>
        </div>
        <div className="space-y-5 lg:col-span-5">
          <ScoreMatrix ideaId={idea.id} scores={idea.scores} auto={auto} />
          <Card>
            <CardHeader title="Notlar" />
            <Suspense fallback={<SectionSkeleton />}>
              <NotesSection entityType="idea" entityId={idea.id} label={idea.title} />
            </Suspense>
          </Card>
          <Card>
            <CardHeader title="Yorumlar" />
            <Suspense fallback={<SectionSkeleton />}>
              <CommentsSection entityType="idea" entityId={idea.id} />
            </Suspense>
          </Card>
        </div>
      </div>
    </>
  );
}
