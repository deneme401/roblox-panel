import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Ticket } from "lucide-react";
import { Card, CardHeader, InsetCard } from "@/components/ui/card";
import { ListRow } from "@/components/ui/primitives";
import { DonutGauge, HatchedBarChart } from "@/components/charts/charts";
import { GameIcon, ageLabel } from "@/components/game/game-bits";
import { getGameDetail } from "@/lib/roblox/queries";
import { formatCompact, formatNumber } from "@/lib/utils";

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <InsetCard className="p-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </InsetCard>
  );
}

async function GameDetail({ params }: { params: PageProps<"/games/[id]">["params"] }) {
  const { id } = await params;
  const universeId = Number(id);
  if (!Number.isSafeInteger(universeId)) notFound();
  const game = await getGameDetail(universeId);
  if (!game) notFound();

  const passes = [...game.passes].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const priced = passes.filter((p) => p.price != null);
  const avgPrice = priced.length ? priced.reduce((s, p) => s + p.price!, 0) / priced.length : null;

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label="Geri">
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
          <div className="flex items-start gap-4">
            <GameIcon src={game.iconLarge ?? game.icon} name={game.name} size={72} className="rounded-3xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{game.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {[game.genre, game.subgenre].filter(Boolean).join(" · ") || "Tür yok"} · {game.creator} · {ageLabel(game.ageDays)}
              </p>
            </div>
          </div>

          <Card>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{formatNumber(game.playing)}</span>
              <span className="text-sm text-muted">anlık oyuncu</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Toplam ziyaret" value={formatCompact(game.visits)} />
              <Stat label="Favori" value={formatCompact(game.favorites)} />
              <Stat label="Sunucu kapasitesi" value={`${game.maxPlayers} kişi`} />
              <Stat
                label="Son güncelleme"
                value={game.updatedDaysAgo === 0 ? "bugün" : `${game.updatedDaysAgo} gün önce`}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Gamepass fiyatları"
              subtitle={
                priced.length
                  ? `${priced.length} satıştaki pass · ortalama ${formatNumber(Math.round(avgPrice!))} Robux`
                  : "Satışta gamepass yok"
              }
            />
            {priced.length > 0 && (
              <HatchedBarChart data={priced.map((p) => ({ label: p.name.slice(0, 10), value: p.price! }))} unit="R$" height={260} />
            )}
          </Card>

          <Card>
            <CardHeader title="Oyuncu geçmişi" subtitle="Saatlik CCU grafiği" />
            <InsetCard className="grid h-40 place-items-center text-center text-sm text-muted">
              Geçmiş verisi Supabase bağlanınca saatlik olarak toplanmaya başlayacak.
            </InsetCard>
          </Card>
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

          <Card>
            <CardHeader title="Gamepass listesi" subtitle="Ucuzdan pahalıya" />
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {passes.length === 0 && <p className="text-sm text-muted">Gamepass bulunamadı.</p>}
              {passes.map((p) => (
                <ListRow
                  key={p.id}
                  icon={<Ticket className="size-5" />}
                  title={p.name}
                  value={p.price != null ? `${formatNumber(p.price)} R$` : "—"}
                />
              ))}
            </div>
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
