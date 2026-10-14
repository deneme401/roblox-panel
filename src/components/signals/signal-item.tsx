import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";
import type { SignalRow } from "@/lib/data/signals";
import { cn, formatCompact, timeAgo } from "@/lib/utils";

export const SOURCE_META = {
  youtube: { label: "YouTube", cls: "bg-[#ff0000] text-white" },
  tiktok: { label: "TikTok", cls: "bg-fg text-bg" },
  reddit: { label: "Reddit", cls: "bg-[#ff4500] text-white" },
} as const;

export function SourceBadge({ source }: { source: SignalRow["source"] }) {
  const m = SOURCE_META[source];
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", m.cls)}>{m.label}</span>;
}

export function SignalItem({ s, compact }: { s: SignalRow; compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-inset p-3">
      {!compact && s.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element -- harici CDN'ler değişken, next/image allowlist'i gereksiz
        <img src={s.thumbnail} alt="" loading="lazy" className="h-16 w-28 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <SourceBadge source={s.source} />
          <span className="truncate">{s.author ?? "—"}</span>
          <span className="ml-auto shrink-0">{timeAgo(s.publishedAt)}</span>
        </div>
        <a href={s.url} target="_blank" rel="noreferrer" className={cn("block text-sm font-medium hover:underline", compact ? "line-clamp-1" : "line-clamp-2")}>
          {s.title || "(başlıksız)"}
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted tabular-nums">
          {s.views != null && (
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" /> {formatCompact(s.views)}
            </span>
          )}
          {s.likes != null && (
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" /> {formatCompact(s.likes)}
            </span>
          )}
          {s.comments != null && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3" /> {formatCompact(s.comments)}
            </span>
          )}
          {s.gameName && s.matchedUniverseId && (
            <Link href={`/games/${s.matchedUniverseId}`} className="rounded-full bg-pos-soft px-2 py-0.5 font-semibold text-pos">
              🎮 {s.gameName}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
