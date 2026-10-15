"use client";

import { useState } from "react";
import { Play, ShieldCheck, X } from "lucide-react";
import { runJobNow, saveAutoTrackAction, setTracked, verifyModels } from "@/lib/actions";
import type { AutoTrack } from "@/lib/data/app-settings";
import { SORT_IDS, SORT_LABELS } from "@/lib/roblox/sorts";
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

export function AutoTrackForm({ initial }: { initial: AutoTrack }) {
  const [value, setValue] = useState<AutoTrack>(initial);
  const { pending, run } = useAction();
  const save = (next: AutoTrack) => {
    setValue(next);
    run(() => saveAutoTrackAction(next), { success: next.enabled ? "Otomatik takip kaydedildi" : "Otomatik takip kapalı" });
  };
  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-3 rounded-2xl bg-inset p-3 text-sm">
        <span>
          <span className="font-semibold">Yeni trend oyunlarını otomatik takibe al</span>
          <span className="block text-xs text-muted">Her saatlik güncellemede seçili listelerdeki tüm oyunlar takibe alınır; listeden düşseler de izlenmeye devam eder.</span>
        </span>
        <input
          type="checkbox"
          disabled={pending}
          checked={value.enabled}
          onChange={(e) => save({ ...value, enabled: e.target.checked })}
          className="size-5 shrink-0 accent-[var(--accent)]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {SORT_IDS.map((s) => {
          const on = value.sorts.includes(s);
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => save({ ...value, sorts: on ? value.sorts.filter((x) => x !== s) : [...value.sorts, s] })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                on ? "bg-accent text-accent-fg" : "bg-inset text-muted",
              )}
            >
              {SORT_LABELS[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
