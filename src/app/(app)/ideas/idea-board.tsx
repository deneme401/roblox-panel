"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, NotebookPen, Plus, Sparkles, X } from "lucide-react";
import { createIdea, moveIdea } from "@/lib/actions";
import { useAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/primitives";
import { GameIcon } from "@/components/game/game-bits";
import { MEMBERS, isMemberId } from "@/lib/auth/members";
import { IDEA_STATUSES, type IdeaCard, type IdeaStatus } from "@/lib/data/workspace-shared";
import { cn, timeAgo } from "@/lib/utils";
import { totalScore } from "./scoring";

const COLUMN_TONE: Record<IdeaStatus, string> = {
  idea: "bg-info",
  research: "bg-warn",
  prototype: "bg-pos",
  dropped: "bg-muted",
};

export function IdeaBoard({ ideas }: { ideas: IdeaCard[] }) {
  const [items, setItems] = useState(ideas);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ status: IdeaStatus; before: string | null } | null>(null);
  const params = useSearchParams();
  const [showNew, setShowNew] = useState(params.get("new") === "1");
  const { run } = useAction();

  // Sunucudan yeni veri gelince (refresh / diğer kullanıcı) yerel sıralamayı güncelle
  const [prevIdeas, setPrevIdeas] = useState(ideas);
  if (ideas !== prevIdeas) {
    setPrevIdeas(ideas);
    setItems(ideas);
  }

  function drop(status: IdeaStatus, before: string | null) {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id || id === before) return;
    // İyimser güncelleme
    setItems((xs) => {
      const moving = xs.find((x) => x.id === id);
      if (!moving) return xs;
      const rest = xs.filter((x) => x.id !== id);
      const updated = { ...moving, status };
      const idx = before ? rest.findIndex((x) => x.id === before) : -1;
      if (idx === -1) {
        const lastIdx = rest.map((x) => x.status).lastIndexOf(status);
        rest.splice(lastIdx + 1, 0, updated);
      } else rest.splice(idx, 0, updated);
      return rest;
    });
    run(() => moveIdea(id, status, before), { topic: "ideas" });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="size-4" /> Yeni fikir
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {IDEA_STATUSES.map((col) => {
          const colItems = items.filter((i) => i.status === col.id);
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (over?.status !== col.id || over.before !== null) setOver({ status: col.id, before: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(col.id, over?.status === col.id ? over.before : null);
              }}
              className={cn(
                "flex min-h-72 flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-card transition dark:border dark:border-line",
                dragId && over?.status === col.id && "ring-2 ring-accent",
              )}
            >
              <header className="flex items-center justify-between px-2 pt-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2.5 rounded-full", COLUMN_TONE[col.id])} />
                  {col.label}
                </span>
                <span className="rounded-full bg-inset px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">{colItems.length}</span>
              </header>
              {colItems.map((i) => (
                <IdeaCardView
                  key={i.id}
                  idea={i}
                  dragging={dragId === i.id}
                  showDropLine={over?.status === col.id && over.before === i.id && dragId !== i.id}
                  onDragStart={() => setDragId(i.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  onDragOverCard={() => setOver({ status: col.id, before: i.id })}
                />
              ))}
              {colItems.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted">Buraya sürükle</p>}
            </section>
          );
        })}
      </div>
      {showNew && <NewIdeaDialog onClose={() => setShowNew(false)} />}
    </>
  );
}

function IdeaCardView({
  idea,
  dragging,
  showDropLine,
  onDragStart,
  onDragEnd,
  onDragOverCard,
}: {
  idea: IdeaCard;
  dragging: boolean;
  showDropLine: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: () => void;
}) {
  const owner = isMemberId(idea.owner) ? MEMBERS[idea.owner] : null;
  const score = totalScore(idea.scores as Record<string, number>);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOverCard();
      }}
    >
      {showDropLine && <div className="mb-2 h-1 rounded-full bg-accent" />}
      <Link
        href={`/ideas/${idea.id}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className={cn("block cursor-grab rounded-[var(--radius-inset)] bg-inset p-3.5 transition hover:shadow-card active:cursor-grabbing", dragging && "opacity-40")}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug">{idea.title}</h3>
          {score != null && <span className="shrink-0 rounded-full bg-fg px-2 py-0.5 text-xs font-bold tabular-nums text-bg dark:bg-accent dark:text-accent-fg">{score}</span>}
        </div>
        {idea.pitch && <p className="mt-1 line-clamp-2 text-xs text-muted">{idea.pitch}</p>}
        {idea.games.length > 0 && (
          <div className="mt-2.5 flex -space-x-1.5">
            {idea.games.slice(0, 5).map((g) => (
              <GameIcon key={g.universeId} src={g.iconUrl} name={g.name} size={22} className="rounded-md border-2 border-inset shadow-none" />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
          {owner && (
            <span className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: owner.color }} title={owner.name}>
              {owner.name[0]}
            </span>
          )}
          {idea.genre && <span className="truncate">{idea.genre}</span>}
          <span className="ml-auto flex items-center gap-2">
            {idea.aiEval && <Sparkles className="size-3.5 text-warn" aria-label="AI değerlendirmesi var" />}
            {idea.noteCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <NotebookPen className="size-3" /> {idea.noteCount}
              </span>
            )}
            {idea.commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="size-3" /> {idea.commentCount}
              </span>
            )}
            <span>{timeAgo(idea.updatedAt)}</span>
          </span>
        </div>
      </Link>
    </div>
  );
}

function NewIdeaDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [genre, setGenre] = useState("");
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createIdea({ title, pitch, genre }), {
            success: "Fikir eklendi",
            topic: "ideas",
            onDone: (d) => {
              onClose();
              if (d) router.push(`/ideas/${d.id}`);
            },
          });
        }}
        className="w-full max-w-lg space-y-3 rounded-[var(--radius-card)] bg-surface p-6 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Yeni fikir</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Kapat">
            <X className="size-5" />
          </button>
        </div>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kısa başlık (ör. Balık tutma tycoon)" className="h-11 w-full rounded-full bg-inset px-4 text-sm outline-none ring-accent focus:ring-2" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Tür (opsiyonel)" className="h-11 w-full rounded-full bg-inset px-4 text-sm outline-none ring-accent focus:ring-2" />
        <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={4} placeholder="Fikir ne? Oyuncu ne yapıyor, neden eğlenceli, neyle para kazanır?" className="w-full rounded-2xl bg-inset px-4 py-3 text-sm outline-none ring-accent focus:ring-2" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={pending || !title.trim()}>Ekle</Button>
        </div>
      </form>
    </div>
  );
}
