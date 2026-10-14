import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Card, InsetCard } from "@/components/ui/card";
import { ChevronButton, ProgressBar } from "@/components/ui/primitives";
import { cn, formatCompact } from "@/lib/utils";
import type { GameRow } from "@/lib/roblox/queries";

export function GameIcon({ src, name, size = 44, className }: { src: string | null; name: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-2xl bg-inset shadow-card", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Gamepad2 className="absolute inset-0 m-auto size-1/2 text-muted" />
      )}
    </div>
  );
}

export function ageLabel(days: number) {
  if (days < 1) return "bugün çıktı";
  if (days < 60) return `${days} günlük`;
  if (days < 730) return `${Math.floor(days / 30)} aylık`;
  return `${Math.floor(days / 365)} yıllık`;
}

/**
 * Referans 1'deki "hedef kartı": başlık satırı + içte beyaz kart, ilerleme çubuğu.
 * Çubuk = listedeki en yüksek oyuncu sayısına oranı.
 */
export function GameGoalCard({
  game,
  max,
  rank,
  color = "pos",
}: {
  game: GameRow;
  max: number;
  rank?: number;
  color?: "pos" | "warn" | "info";
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3 p-1 pb-3">
        <GameIcon src={game.icon} name={game.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{game.name}</div>
          <div className="truncate text-xs text-muted">{[game.genre, game.subgenre].filter(Boolean).join(" · ") || "Tür yok"}</div>
        </div>
        <ChevronButton href={`/games/${game.universeId}`} />
      </div>
      <InsetCard className="space-y-2.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold tabular-nums">{formatCompact(game.playing)} oyuncu</span>
          <span className="text-muted tabular-nums">{game.likeRatio != null ? `%${Math.round(game.likeRatio * 100)} beğeni` : "—"}</span>
        </div>
        <ProgressBar value={max ? game.playing / max : 0} color={color} />
        <div className="flex justify-between text-xs">
          <span>{ageLabel(game.ageDays)}</span>
          {rank != null && <span className="font-semibold tabular-nums">#{rank}</span>}
        </div>
      </InsetCard>
    </Card>
  );
}
