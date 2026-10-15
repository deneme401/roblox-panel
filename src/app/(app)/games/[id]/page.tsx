import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lightbulb, Ticket } from "lucide-react";
import { Card, CardHeader, InsetCard } from "@/components/ui/card";
import { ListRow, StatBadge } from "@/components/ui/primitives";
import { DonutGauge, HatchedBarChart } from "@/components/charts/charts";
import { GameIcon, ageLabel } from "@/components/game/game-bits";
import { CcuChart } from "@/components/game/ccu-chart";
import { AnalyzeButton, GameActions } from "@/components/game/game-actions";
import { SignalItem } from "@/components/signals/signal-item";
import { CommentsSection, NotesSection, SectionSkeleton } from "@/components/workspace/sections";
import { getGameDetail, tryLive } from "@/lib/roblox/queries";
import { getGameAnalysis, getGameBase, getGameHistory, getGameIdeas } from "@/lib/data/game";
import { listSignals } from "@/lib/data/signals";
import { hasGemini } from "@/lib/ai/gemini";
import { SORT_LABELS, type SortId } from "@/lib/roblox/client";
import { memberName } from "@/lib/auth/members";
import { formatCompact, formatNumber, timeAgo } from "@/lib/utils";

export default function GamePage({ params }: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <GameDetail params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-11 w-48 rounded-full bg-surface" />
      <div className="h-24 rounded-[var(--radius-card)] bg-surface" />
      <div className="h-80 rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <InsetCard className="p-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-bold tabular-nums">
        {value}
        {extra}
      </div>
    </InsetCard>
  );
}

async function AiPanel({ universeId }: { universeId: number }) {
  const a = await getGameAnalysis(universeId);
  const gemini = hasGemini();
  if (!a?.aiAnalysis) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Gemini; oyunun açıklaması, metrikleri ve gamepass yapısına bakıp neden yükseldiğini, çekirdek döngüsünü ve bizim için dersleri çıkarır.
        </p>
        {gemini ? <AnalyzeButton universeId={universeId} /> : <p className="rounded-2xl bg-inset p-3 text-xs text-muted">GEMINI_API_KEY eklenince aktif olur (Ayarlar).</p>}
      </div>
    );
  }
  const x = a.aiAnalysis;
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Neden yükseliyor</div>
          <p className="mt-1 leading-relaxed">{x.whyRising}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Çekirdek döngü</div>
          <p className="mt-1 leading-relaxed">{x.coreLoop}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Monetizasyon</div>
          <p className="mt-1 leading-relaxed">{x.monetization}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Kitle</div>
          <p className="mt-1 leading-relaxed">{x.audience}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Bizim için dersler</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {x.lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">
          🤖 {a.aiModel} · {timeAgo(a.aiAnalyzedAt)}
        </span>
        {gemini && <AnalyzeButton universeId={universeId} again />}
      </div>
    </div>
  );
}

async function Mentions({ universeId }: { universeId: number }) {
  const rows = await listSignals({ universeId, limit: 6 });
  if (!rows.length) return <p className="text-sm text-muted">Sosyal medyada eşleşen bahsedilme yok.</p>;
  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <SignalItem key={s.id} s={s} compact />
      ))}
    </div>
  );
}

async function LinkedIdeas({ universeId }: { universeId: number }) {
  const ideas = await getGameIdeas(universeId);
  if (!ideas.length) return null;
  return (
    <Card>
      <CardHeader title="Bağlı fikirler" />
      <div className="space-y-2">
        {ideas.map((i) => (
          <ListRow key={i.id} href={`/ideas/${i.id}`} icon={<Lightbulb className="size-5" />} title={i.title} />
        ))}
      </div>
    </Card>
  );
}

async function GameDetail({ params }: { params: PageProps<"/games/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const universeId = Number(id);
  if (!Number.isSafeInteger(universeId)) notFound();
  // Önce DB (hızlı, Roblox erişiminden bağımsız); oyun DB'de yoksa canlı API'yi kısa zaman aşımıyla dene
  const [dbGame, hist] = await Promise.all([getGameBase(universeId), getGameHistory(universeId)]);
  const game = dbGame ?? (await tryLive(() => getGameDetail(universeId)));
  if (!game) notFound();

  // DB'de gamepass geçmişi varsa onu kullan (ilk görülme tarihleriyle), yoksa canlı listeyi
  const passes = hist.passes.length
    ? hist.passes.filter((p) => p.isForSale).map((p) => ({ id: p.passId, name: p.name, price: p.price, firstSeenAt: p.firstSeenAt }))
    : game.passes.map((p) => ({ ...p, firstSeenAt: null as string | null }));
  passes.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const priced = passes.filter((p) => p.price != null && p.price > 0);
  const avgPrice = priced.length ? priced.reduce((s, p) => s + p.price!, 0) / priced.length : null;
  const firstPassSeen = hist.passes.length ? Math.min(...hist.passes.map((p) => new Date(p.firstSeenAt).getTime())) : 0;

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/trends" className="grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label="Geri">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-[15px] font-medium">Oyun Detayı</span>
        <a
          href={`https://www.roblox.com/games/${game.placeId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium shadow-card"
        >
          Roblox <ExternalLink className="size-4" />
        </a>
      </header>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="flex flex-wrap items-start gap-4">
            <GameIcon src={game.iconLarge ?? game.icon} name={game.name} size={72} className="rounded-3xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{game.name}</h1>
                {hist.growth24h != null && <StatBadge value={hist.growth24h} />}
              </div>
              <p className="mt-1 text-sm text-muted">
                {[game.genre, game.subgenre].filter(Boolean).join(" · ") || "Tür yok"} · {game.creator} · {ageLabel(game.ageDays)}
              </p>
              {hist.aiTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hist.aiTags.map((t) => (
                    <span key={t} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium shadow-card">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <GameActions
              universeId={universeId}
              name={game.name}
              tracked={hist.tracked}
              measuredLabel={dbGame?.measuredAt ? timeAgo(dbGame.measuredAt) : null}
            />
          </div>

          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums">{formatNumber(game.playing)}</span>
              <span className="text-sm text-muted">
                anlık oyuncu
                {hist.tracked && hist.trackedBy && ` · ${memberName(hist.trackedBy)} takibe aldı`}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="24s değişim" value="" extra={<StatBadge value={hist.growth24h} />} />
              <Stat label="7g değişim" value="" extra={<StatBadge value={hist.growth7d} />} />
              <Stat label="Yükseliş skoru" value={hist.riseScore != null ? String(Math.round(hist.riseScore)) : "—"} />
              <Stat label="Ziyaret (24s)" value={formatCompact(hist.visits24h)} />
              <Stat label="Toplam ziyaret" value={formatCompact(game.visits)} />
              <Stat label="Favori" value={formatCompact(game.favorites)} />
            </div>
          </Card>

          <Card>
            <CcuChart hourly={hist.hourly} daily={hist.daily} />
          </Card>

          <Card>
            <CardHeader
              title="Gamepass fiyatları"
              subtitle={
                priced.length
                  ? `${priced.length} satıştaki pass · ortalama ${formatNumber(Math.round(avgPrice!))} Robux · en pahalı ${formatNumber(priced.at(-1)!.price)} R$`
                  : "Satışta gamepass yok"
              }
            />
            {priced.length > 0 && <HatchedBarChart data={priced.map((p) => ({ label: p.name.slice(0, 10), value: p.price! }))} unit="R$" height={240} />}
          </Card>

          <Card>
            <CardHeader title="AI analizi" subtitle="Gemini model zinciri" />
            <Suspense fallback={<SectionSkeleton />}>
              <AiPanel universeId={universeId} />
            </Suspense>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader title="Notlar" subtitle="Bu oyuna bağlı ekip notları" />
              <Suspense fallback={<SectionSkeleton />}>
                <NotesSection entityType="game" entityId={String(universeId)} label={game.name} />
              </Suspense>
            </Card>
            <Card>
              <CardHeader title="Yorumlar" />
              <Suspense fallback={<SectionSkeleton />}>
                <CommentsSection entityType="game" entityId={String(universeId)} />
              </Suspense>
            </Card>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-4">
          <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-[#111113] p-6 text-white shadow-card dark:border dark:border-line dark:bg-inset">
            <div>
              <div className="text-xs text-white/60">Beğeni oranı</div>
              <div className="mt-1 text-lg font-semibold">{formatCompact(game.upVotes + game.downVotes)} oy</div>
              <div className="mt-1 text-xs text-white/60 tabular-nums">
                👍 {formatCompact(game.upVotes)} · 👎 {formatCompact(game.downVotes)}
              </div>
            </div>
            <DonutGauge value={game.likeRatio ?? 0} label="Beğeni oranı" />
          </div>

          <Suspense>
            <LinkedIdeas universeId={universeId} />
          </Suspense>

          <Card>
            <CardHeader title="Liste geçmişi" subtitle="Roblox keşif listelerinde görünme" />
            {hist.sorts.length === 0 ? (
              <p className="text-sm text-muted">Bu oyun izlediğimiz listelerde görülmedi.</p>
            ) : (
              <div className="space-y-2">
                {hist.sorts.map((s) => (
                  <InsetCard key={s.sortId} className="p-3 text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>{SORT_LABELS[s.sortId as SortId] ?? s.sortId}</span>
                      <span className="tabular-nums">#{s.lastRank}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      İlk: {timeAgo(s.firstSeenAt)} · son: {timeAgo(s.lastSeenAt)} · en iyi #{s.bestRank}
                    </div>
                  </InsetCard>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Güncelleme geçmişi" subtitle="Roblox 'son güncelleme' zamanı değiştikçe" />
            <div className="space-y-1.5 text-sm">
              {(hist.updates.length ? hist.updates : [game.updatedAt]).map((u) => (
                <div key={u} className="flex justify-between rounded-xl bg-inset px-3 py-2">
                  <span>{new Date(u).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</span>
                  <span className="text-muted">{timeAgo(u)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Gamepass listesi" subtitle="Ucuzdan pahalıya" />
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {passes.length === 0 && <p className="text-sm text-muted">Gamepass bulunamadı.</p>}
              {passes.map((p) => {
                const isNew = p.firstSeenAt && firstPassSeen && new Date(p.firstSeenAt).getTime() - firstPassSeen > 86_400_000;
                return (
                  <ListRow
                    key={p.id}
                    icon={<Ticket className="size-5" />}
                    title={p.name}
                    subtitle={isNew ? `yeni · ${timeAgo(p.firstSeenAt)}` : undefined}
                    value={p.price != null ? `${formatNumber(p.price)} R$` : "—"}
                  />
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Sosyal bahsedilmeler" />
            <Suspense fallback={<SectionSkeleton />}>
              <Mentions universeId={universeId} />
            </Suspense>
          </Card>

          {game.description && (
            <Card>
              <CardHeader title="Açıklama" />
              <p className="line-clamp-[12] whitespace-pre-line text-sm leading-relaxed text-muted">{game.description}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
