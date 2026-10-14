"use client";

import { useState } from "react";
import { Play, ShieldCheck, X } from "lucide-react";
import { runJobNow, setTracked, verifyModels } from "@/lib/actions";
import { toast, useAction } from "@/components/ui/toast";
import type { ScheduledJob } from "@/lib/collect/schedule";
import { cn } from "@/lib/utils";

export function RunJobButton({ job, label }: { job: ScheduledJob; label: string }) {
  const { pending, run } = useAction();
  return (
    <button
      disabled={pending}
      onClick={() => run(() => runJobNow(job), { onDone: (d) => d && toast("ok", d.message) })}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-inset px-4 text-sm font-semibold disabled:opacity-50"
    >
      <Play className={cn("size-4", pending && "animate-pulse")} /> {pending ? "Çalışıyor…" : label}
    </button>
  );
}

export function UntrackButton({ universeId }: { universeId: number }) {
  const { pending, run } = useAction();
  return (
    <button disabled={pending} onClick={() => run(() => setTracked(universeId, false))} className="text-muted hover:text-neg" aria-label="Takipten çıkar">
      <X className="size-4" />
    </button>
  );
}

export function VerifyModelsButton({ configured }: { configured: string[] }) {
  const [models, setModels] = useState<string[] | null>(null);
  const { pending, run } = useAction();
  return (
    <div className="mt-4">
      <button
        disabled={pending}
        onClick={() => run(() => verifyModels(), { onDone: (d) => d && setModels(d.models) })}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-inset px-4 text-sm font-semibold disabled:opacity-50"
      >
        <ShieldCheck className="size-4" /> {pending ? "Kontrol ediliyor…" : "Anahtarın erişebildiği modelleri listele"}
      </button>
      {models && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl bg-inset p-3 text-xs">
          <p className="mb-2 text-muted">
            Zincirdeki modeller: {configured.map((c) => `${c} ${models.includes(c) ? "✓" : "✗ (yok)"}`).join(" · ")}
          </p>
          <ul className="grid grid-cols-1 gap-0.5 font-mono sm:grid-cols-2">
            {models.filter((m) => m.includes("gemini")).map((m) => (
              <li key={m} className={configured.includes(m) ? "font-bold" : ""}>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
