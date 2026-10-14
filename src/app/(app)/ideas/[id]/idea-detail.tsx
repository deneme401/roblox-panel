"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bot, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Card, InsetCard } from "@/components/ui/card";
import { StatBadge } from "@/components/ui/primitives";
import { GameIcon } from "@/components/game/game-bits";
import { toast, useAction } from "@/components/ui/toast";
import { deleteIdea, evaluateIdeaAction, linkIdeaGame, moveIdea, unlinkIdeaGame, updateIdea } from "@/lib/actions";
import { IDEA_STATUSES, type Idea, type IdeaStatus, type LinkedGame } from "@/lib/data/workspace-shared";
import type { IdeaEval } from "@/lib/ai/tasks";
import { memberName } from "@/lib/auth/members";
import { cn, formatCompact, timeAgo } from "@/lib/utils";
import { SCORE_FIELDS, totalScore } from "../scoring";

type PlainIdea = Omit<Idea, "createdAt" | "updatedAt" | "aiEvaluatedAt"> & { createdAt: string; updatedAt: string; aiEvaluatedAt: string | null };

export function IdeaEditor({ idea }: { idea: PlainIdea }) {
  const [title, setTitle] = useState(idea.title);
  const [pitch, setPitch] = useState(idea.pitch);
  const [genre, setGenre] = useState(idea.genre ?? "");
  const { pending, run } = useAction();
  const router = useRouter();
  // Sunucudaki sürüm değişirse (ör. diğer kullanıcı kaydetti) alanları güncelle
  const [prev, setPrev] = useState(idea.updatedAt);
  if (prev !== idea.updatedAt) {
    setPrev(idea.updatedAt);
    setTitle(idea.title);
    setPitch(idea.pitch);
    setGenre(idea.genre ?? "");
  }

  const dirty = title !== idea.title || pitch !== idea.pitch || genre !== (idea.genre ?? "");
  const save = () => dirty && title.trim() && run(() => updateIdea(idea.id, { title, pitch, genre }), { topic: "ideas" });

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {IDEA_STATUSES.map((s) => (
          <button
            key={s.id}
            disabled={pending}
            onClick={() => s.id !== idea.status && run(() => moveIdea(idea.id, s.id as IdeaStatus, null), { topic: "ideas" })}
            className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition", s.id === idea.status ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg")}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => {
            if (!confirmDelete()) return;
            run(() => deleteIdea(idea.id), { topic: "ideas", onDone: () => router.push("/ideas") });
          }}
          className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-neg-soft hover:text-neg"
          aria-label="Fikri sil"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none" placeholder="Başlık" />
      <input value={genre} onChange={(e) => setGenre(e.target.value)} onBlur={save} className="mt-1 w-full bg-transparent text-sm text-muted outline-none" placeholder="Tür ekle…" />
      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        onBlur={save}
        rows={6}
        placeholder="Fikri anlat: oyuncu ne yapıyor, döngü ne, neden eğlenceli, nasıl para kazanır?"
        className="mt-3 w-full resize-y rounded-2xl bg-inset p-4 text-sm leading-relaxed outline-none ring-accent focus:ring-2"
      />
      <p className="mt-2 text-xs text-muted">
        {memberName(idea.owner)} ekledi · {timeAgo(idea.createdAt)} · son değişiklik {timeAgo(idea.updatedAt)} {dirty && "· kaydedilmemiş (alandan çıkınca kaydedilir)"}
      </p>
    </Card>
  );
}

// Silme onayı tarayıcı diyaloğu yerine basit iki aşamalı tıklama ile yapılır
let armed = 0;
function confirmDelete() {
  const now = Date.now();
  if (now - armed < 3000) return true;
  armed = now;
  toast("error", "Silmek için 3 sn içinde tekrar tıkla");
  return false;
}

export function ScoreMatrix({ ideaId, scores, auto }: { ideaId: string; scores: Record<string, number | null | undefined>; auto: { demand: number | null; competition: number | null } }) {
  const { run } = useAction();
  const merged: Record<string, number | null | undefined> = { ...scores, demand: auto.demand ?? scores.demand ?? null, competition: auto.competition ?? scores.competition ?? null };
  const total = totalScore(merged);
  return (
    <div className="hero-gradient relative overflow-hidden rounded-[var(--radius-card)] p-6 text-hero-fg">
      <div className="hero-lines pointer-events-none absolute inset-0 dark:opacity-0" aria-hidden />
      <div className="relative">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-hero-muted">Fikir puanı</div>
            <div className="text-5xl font-bold tabular-nums">{total ?? "—"}</div>
          </div>
          <span className="text-xs text-hero-muted">/ 100</span>
        </div>
        <div className="mt-5 space-y-3">
          {SCORE_FIELDS.map((f) => {
            const v = merged[f.key];
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold" title={f.hint}>
                    {f.label} {f.auto && <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">veri</span>}
                  </span>
                  <span className="text-hero-muted">{f.hint.split(":")[0]}</span>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      disabled={f.auto && (f.key === "demand" ? auto.demand : auto.competition) != null}
                      onClick={() => run(() => updateIdea(ideaId, { scores: { [f.key]: n } }), { topic: "ideas" })}
                      className={cn(
                        "h-8 flex-1 rounded-full text-xs font-bold tabular-nums transition",
                        v != null && n <= v ? "bg-white text-zinc-900 dark:text-[#ff6b5b]" : "bg-white/10 text-hero-muted hover:bg-white/20",
                        "disabled:cursor-not-allowed",
                      )}
                      aria-label={`${f.label} ${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-hero-muted">Rekabet ve efor ters puanlanır (düşük = iyi). Talep/rekabet, rakip bağlanınca veriden hesaplanır.</p>
      </div>
    </div>
  );
}

type PoolItem = { universeId: number; name: string; iconUrl: string | null; playing: number | null };

export function LinkedGames({ ideaId, games, pool }: { ideaId: string; games: LinkedGame[]; pool: PoolItem[] }) {
  const [q, setQ] = useState("");
  const { pending, run } = useAction();
  const ids = games.map((g) => g.universeId);
  const matches = useMemo(() => {
    const n = q.trim().toLocaleLowerCase("tr");
    if (!n || /^\d+$/.test(n) || n.includes("roblox.com")) return [];
    return pool.filter((p) => !ids.includes(p.universeId) && p.name.toLocaleLowerCase("tr").includes(n)).slice(0, 6);
  }, [q, pool, ids]);
  const isLink = /^\d+$/.test(q.trim()) || q.includes("roblox.com");

  return (
    <div className="space-y-3">
      {games.length === 0 && <p className="text-sm text-muted">Henüz rakip bağlanmadı.</p>}
      {games.map((g) => (
        <InsetCard key={g.universeId} className="flex items-center gap-3 p-3">
          <GameIcon src={g.iconUrl} name={g.name} size={40} className="rounded-xl shadow-none" />
          <div className="min-w-0 flex-1">
            <Link href={`/games/${g.universeId}`} className="block truncate text-sm font-semibold hover:underline">
              {g.name}
            </Link>
            <div className="text-xs text-muted tabular-nums">
              {g.genre ?? "—"} · {formatCompact(g.playing)} oyuncu · {g.passCount} pass{g.ageDays != null ? ` · ${g.ageDays} gün` : ""}
            </div>
          </div>
          <StatBadge value={g.growth24h} />
          <button onClick={() => run(() => unlinkIdeaGame(ideaId, g.universeId), { topic: "ideas" })} className="text-muted hover:text-neg" aria-label="Bağlantıyı kaldır">
            <X className="size-4" />
          </button>
        </InsetCard>
      ))}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLink) run(() => linkIdeaGame(ideaId, q), { topic: "ideas", success: "Rakip bağlandı", onDone: () => setQ("") });
          }}
          className="flex h-11 items-center gap-2 rounded-full bg-inset pl-4 pr-1"
        >
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rakip ara ya da Roblox linki yapıştır" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {isLink && (
            <button disabled={pending} className="grid size-9 place-items-center rounded-full bg-accent text-accent-fg" aria-label="Bağla">
              <Plus className="size-4" />
            </button>
          )}
        </form>
        {matches.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl bg-inset p-1 shadow-card ring-1 ring-line">
            {matches.map((m) => (
              <button
                key={m.universeId}
                onClick={() => run(() => linkIdeaGame(ideaId, m.universeId), { topic: "ideas", onDone: () => setQ("") })}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-surface"
              >
                <GameIcon src={m.iconUrl} name={m.name} size={28} className="rounded-lg shadow-none" />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-xs text-muted tabular-nums">{formatCompact(m.playing)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const VERDICT_STYLE = {
  güçlü: "bg-pos-soft text-pos",
  orta: "bg-warn/15 text-warn",
  zayıf: "bg-neg-soft text-neg",
} as const;

function List({ title, items, tone }: { title: string; items: string[]; tone?: "pos" | "neg" }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={cn("text-xs font-semibold uppercase tracking-wide", tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-muted")}>{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function IdeaEvalPanel({ ideaId, evaluation, model, at, gemini }: { ideaId: string; evaluation: IdeaEval | null; model: string | null; at: string | null; gemini: boolean }) {
  const { pending, run } = useAction();
  const button = gemini ? (
    <button
      disabled={pending}
      onClick={() => run(() => evaluateIdeaAction(ideaId), { success: "Değerlendirme hazır", topic: "ideas" })}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
    >
      <Sparkles className={cn("size-4", pending && "animate-pulse")} />
      {pending ? "Gemini düşünüyor…" : evaluation ? "Yeniden değerlendir" : "Gemini ile değerlendir"}
    </button>
  ) : (
    <p className="rounded-2xl bg-inset p-3 text-xs text-muted">GEMINI_API_KEY eklenince aktif olur (Ayarlar sayfasına bakın).</p>
  );
  if (!evaluation) return <div className="space-y-3"><p className="text-sm text-muted">Önce rakip bağlarsan değerlendirme veriye dayalı olur.</p>{button}</div>;
  const e = evaluation;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-sm font-bold capitalize", VERDICT_STYLE[e.verdict] ?? "bg-inset")}>{e.verdict}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-inset px-3 py-1 text-xs font-semibold">
          <AlertTriangle className="size-3.5" /> Risk {e.riskScore}/10
        </span>
        <span className="rounded-full bg-inset px-3 py-1 text-xs font-semibold">Talep {e.demandScore}/5</span>
        <span className="rounded-full bg-inset px-3 py-1 text-xs font-semibold">Rekabet {e.competitionScore}/5</span>
      </div>
      <p className="text-sm leading-relaxed">{e.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <List title="Güçlü yanlar" items={e.strengths} tone="pos" />
        <List title="Zayıf yanlar" items={e.weaknesses} tone="neg" />
        <List title="MVP adımları" items={e.mvp} />
        <List title="Monetizasyon" items={e.monetization} />
        <List title="Riskler" items={e.risks} tone="neg" />
        <List title="Benzer oyunlar" items={e.similarGames} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Bot className="size-3.5" /> {model} · {timeAgo(at)}
        </span>
        {button}
      </div>
    </div>
  );
}

