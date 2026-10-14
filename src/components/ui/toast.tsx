"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { notifyChange } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";

type Toast = { id: number; kind: "ok" | "error"; text: string };
let seq = 0;
const subs = new Set<(t: Toast) => void>();

export function toast(kind: Toast["kind"], text: string) {
  const t = { id: ++seq, kind, text };
  subs.forEach((s) => s(t));
}

/** Sağ altta kısa bildirimler. Kök layout'ta bir kez render edilir. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const sub = (t: Toast) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), t.kind === "error" ? 7000 : 3500);
    };
    subs.add(sub);
    return () => void subs.delete(sub);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex max-w-sm flex-col gap-2 lg:bottom-6" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-2xl px-4 py-3 text-sm shadow-card",
            t.kind === "ok" ? "bg-fg text-bg" : "bg-neg text-white",
          )}
        >
          {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span className="break-words">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Server Action'ı geçiş içinde çalıştırır; hata olursa bildirim gösterir, başarılıysa
 * diğer kullanıcıya realtime "değişti" sinyali yollar.
 */
export function useAction() {
  const [pending, start] = useTransition();
  function run<T>(fn: () => Promise<Result<T>>, opts?: { success?: string; topic?: string; onDone?: (data: T | undefined) => void }) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast("error", r.error);
        return;
      }
      if (opts?.success) toast("ok", opts.success);
      notifyChange(opts?.topic ?? "any");
      opts?.onDone?.(r.data);
    });
  }
  return { pending, run };
}
