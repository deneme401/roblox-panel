"use client";

import { RefreshCw } from "lucide-react";
import { runJobNow } from "@/lib/actions";
import { toast, useAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Üst bardaki "Tümünü güncelle": saatlik işi hemen çalıştırır (keşif listeleri + tüm oyunların anlık
 * değerleri + yeni oyunlar + otomatik takip). ~30–60 sn sürer.
 */
export function RefreshAllButton() {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => runJobNow("hourly"), { topic: "market", onDone: (d) => d && toast("ok", `Güncellendi: ${d.message}`) })}
      title="Roblox listelerini ve tüm oyunların oyuncu/ziyaret/oy değerlerini şimdi çek; yeni oyunları ekle"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold shadow-card transition disabled:opacity-60 dark:border dark:border-line",
      )}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} />
      <span className="hidden sm:inline">{pending ? "Güncelleniyor… (~1 dk)" : "Tümünü güncelle"}</span>
    </button>
  );
}
