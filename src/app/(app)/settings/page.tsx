import { Suspense } from "react";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, InsetCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/primitives";
import { GameIcon } from "@/components/game/game-bits";
import { AddGameForm } from "@/components/game/add-game-form";
import { getSettingsData } from "@/lib/data/settings";
import { geminiModels, hasGemini } from "@/lib/ai/gemini";
import { MEMBERS, memberName } from "@/lib/auth/members";
import { formatCompact, formatNumber, timeAgo } from "@/lib/utils";
import { AutoTrackForm, RunJobButton, UntrackButton, VerifyModelsButton } from "./settings-client";

const JOB_INFO: Record<string, { label: string; schedule: string }> = {
  "collect-hourly": { label: "Listeler + snapshot", schedule: "her saat :05" },
  "collect-passes": { label: "Gamepass fiyatları", schedule: "her gün 03:10" },
  rollup: { label: "Günlük özet + temizlik", schedule: "her gün 03:20" },
  "ai-tags": { label: "AI tür etiketleme", schedule: "her gün 03:20 (Gemini varsa)" },
  "collect-signals": { label: "Sosyal sinyaller (Apify)", schedule: "her gün 09:00" },
};

function Status({ ok }: { ok: boolean | null }) {
  if (ok === null) return <CircleDashed className="size-4 text-muted" aria-label="çalışıyor" />;
  return ok ? <CheckCircle2 className="size-4 text-pos" aria-label="başarılı" /> : <XCircle className="size-4 text-neg" aria-label="hata" />;
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pos" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-warn" />}
      <span className={ok ? "" : "text-muted"}>{children}</span>
    </li>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Ayarlar" subtitle="Veri toplama, takip listesi, AI ve ekip" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const d = await getSettingsData();
  const gemini = hasGemini();
  const models = geminiModels();
  const limit = 500 * 1024 * 1024;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-7">
        <Card>
          <CardHeader title="Veri toplama işleri" subtitle="Supabase pg_cron tetikler; buradan elle de çalıştırabilirsin" />
          <div className="mb-4 flex flex-wrap gap-2">
            <RunJobButton job="hourly" label="Saatlik işi çalıştır" />
            <RunJobButton job="daily" label="Günlük işi çalıştır" />
            <RunJobButton job="signals" label="Sinyalleri topla (~0,12 $)" />
          </div>
          <div className="space-y-2">
            {Object.entries(JOB_INFO).map(([job, info]) => {
              const r = d.jobs.find((j) => j.job === job);
              return (
                <InsetCard key={job} className="flex items-start gap-3 p-3">
                  {r ? <Status ok={r.ok} /> : <CircleDashed className="size-4 text-muted" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">{info.label}</span>
                      <span className="text-xs text-muted">{info.schedule}</span>
                    </div>
                    <div className="truncate text-xs text-muted" title={r?.message ?? ""}>
                      {r ? `${timeAgo(r.startedAt)} · ${r.message ?? ""}` : "Henüz çalışmadı"}
                    </div>
                  </div>
                </InsetCard>
              );
            })}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-muted">Son 15 çalışma</summary>
            <ul className="mt-2 space-y-1 text-xs">
              {d.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Status ok={r.ok} />
                  <span className="w-28 shrink-0 font-medium">{r.job}</span>
                  <span className="w-24 shrink-0 text-muted">{timeAgo(r.startedAt)}</span>
                  <span className="truncate text-muted" title={r.message ?? ""}>
                    {r.message}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </Card>

        <Card>
          <CardHeader title={`Takip listesi (${d.tracked.length})`} subtitle="Listelerden düşse bile saatlik izlenen oyunlar · ☆ otomatik, ★ elle" />
          <div className="mb-4">
            <AutoTrackForm initial={d.autoTrack} />
          </div>
          <AddGameForm navigate={false} className="mb-4 bg-inset shadow-none" />
          {d.tracked.length === 0 ? (
            <p className="text-sm text-muted">Takipte oyun yok. Oyun detay sayfasındaki ★ ile ya da yukarıdan link ile ekle.</p>
          ) : (
            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {d.tracked.map((g) => (
                <InsetCard key={g.universeId} className="flex items-center gap-3 p-3">
                  <GameIcon src={g.iconUrl} name={g.name} size={36} className="rounded-xl shadow-none" />
                  <a href={`/games/${g.universeId}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    {g.name}
                  </a>
                  <span className="text-xs text-muted">{g.trackedAuto ? "☆ otomatik" : `★ ${memberName(g.trackedBy)}`}</span>
                  <span className="w-16 text-right text-sm tabular-nums">{formatCompact(g.playing)}</span>
                  <UntrackButton universeId={g.universeId} />
                </InsetCard>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5 lg:col-span-5">
        <Card>
          <CardHeader title="AI (Gemini)" subtitle="Sıradaki model; kota/zaman aşımı/hata olunca bir sonrakine geçilir" />
          {!gemini && (
            <div className="mb-4 rounded-2xl bg-warn/10 p-4 text-sm">
              <p className="font-semibold">Gemini anahtarı yok</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                <li>aistudio.google.com/apikey adresinden ücretsiz anahtar al.</li>
                <li>
                  Lokal: <code>.env.local</code> içine <code>GEMINI_API_KEY=...</code> ekle; canlı: Vercel → Environment Variables.
                </li>
                <li>Sunucuyu yeniden başlat / yeniden deploy et.</li>
              </ol>
            </div>
          )}
          <ol className="space-y-2">
            {models.map((m, i) => {
              const s = d.ai.find((a) => a.model === m);
              return (
                <InsetCard key={m} className="flex items-center gap-3 p-3 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-fg text-xs font-bold text-bg dark:bg-accent dark:text-accent-fg">{i + 1}</span>
                  <span className="flex-1 font-mono text-xs">{m}</span>
                  <span className="text-xs text-muted tabular-nums" title={s?.lastError ?? ""}>
                    {s ? `24s: ${s.ok} ✓ · ${s.fail} ✗${s.avgMs ? ` · ${formatNumber(s.avgMs)} ms` : ""}` : "24s: kullanılmadı"}
                  </span>
                </InsetCard>
              );
            })}
          </ol>
          {gemini && <VerifyModelsButton configured={models} />}
        </Card>

        <Card>
          <CardHeader title="Ekip" />
          <div className="space-y-2">
            {Object.values(MEMBERS).map((m) => (
              <InsetCard key={m.id} className="flex items-center gap-3 p-3">
                <span className="grid size-9 place-items-center rounded-full font-bold text-white" style={{ background: m.color }}>
                  {m.name[0]}
                </span>
                <span className="text-sm font-semibold">{m.name}</span>
              </InsetCard>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Giriş: isim seçimi{process.env.APP_PASSWORD ? " + ekip şifresi (APP_PASSWORD) açık" : ". Canlıya çıkarken APP_PASSWORD tanımlayın, yoksa linki bilen herkes girebilir."}
          </p>
        </Card>

        <Card>
          <CardHeader title="Veritabanı" subtitle="Supabase ücretsiz katman 500 MB" />
          <ProgressBar value={d.dbBytes / limit} color={d.dbBytes / limit > 0.8 ? "neg" : "info"} />
          <p className="mt-2 text-sm tabular-nums">
            {(d.dbBytes / 1024 / 1024).toFixed(1)} MB / 500 MB
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            {Object.entries({ Oyun: d.counts.games, Snapshot: d.counts.snapshots, Sinyal: d.counts.signals, Not: d.counts.notes, Fikir: d.counts.ideas }).map(([k, v]) => (
              <InsetCard key={k} className="p-2">
                <div className="font-bold tabular-nums">{formatCompact(v)}</div>
                <div className="text-muted">{k}</div>
              </InsetCard>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Kurulum durumu" />
          <ul className="space-y-1.5">
            <Check ok>Supabase veritabanı bağlı</Check>
            <Check ok={Boolean(process.env.APIFY_TOKEN)}>Apify anahtarı</Check>
            <Check ok={gemini}>Gemini anahtarı</Check>
            <Check ok={Boolean(process.env.APP_PASSWORD)}>Ekip şifresi (APP_PASSWORD)</Check>
            <Check ok={Boolean(process.env.VERCEL)}>Vercel&apos;de çalışıyor</Check>
          </ul>
        </Card>
      </div>
    </div>
  );
}
