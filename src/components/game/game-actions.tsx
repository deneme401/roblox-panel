"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Lightbulb, Sparkles, Star } from "lucide-react";
import { analyzeGameAction, createIdea, setTracked } from "@/lib/actions";
import { useAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const btn = "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-card transition disabled:opacity-50";

export function GameActions({ universeId, name, tracked }: { universeId: number; name: string; tracked: boolean }) {
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={() => run(() => setTracked(universeId, !tracked), { success: tracked ? "Takipten çıkarıldı" : "Takibe alındı" })}
        className={cn(btn, tracked ? "bg-warn text-white" : "bg-surface dark:border dark:border-line")}
      >
        <Star className={cn("size-4", tracked && "fill-white")} /> {tracked ? "Takipte" : "Takibe al"}
      </button>
      <Link href={`/compare?ids=${universeId}`} className={cn(btn, "bg-surface dark:border dark:border-line")}>
        <GitCompareArrows className="size-4" /> Kıyasla
      </Link>
      <button
        disabled={pending}
        onClick={() =>
          run(() => createIdea({ title: `${name} benzeri`, pitch: "", universeId }), {
            success: "Fikir oluşturuldu",
            onDone: (d) => d && router.push(`/ideas/${d.id}`),
          })
        }
        className={cn(btn, "bg-surface dark:border dark:border-line")}
      >
        <Lightbulb className="size-4" /> Fikre dönüştür
      </button>
    </div>
  );
}

export function AnalyzeButton({ universeId, again }: { universeId: number; again?: boolean }) {
  const { pending, run } = useAction();
  return (
    <button
      disabled={pending}
      onClick={() => run(() => analyzeGameAction(universeId), { success: "Analiz hazır" })}
      className={cn(btn, "bg-accent text-accent-fg")}
    >
      <Sparkles className={cn("size-4", pending && "animate-pulse")} />
      {pending ? "Gemini düşünüyor…" : again ? "Yeniden analiz et" : "AI ile analiz et"}
    </button>
  );
}
