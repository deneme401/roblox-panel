import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronRight, GitCompareArrows, Lightbulb, NotebookPen, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, HeroCard, InsetCard, SectionTitle } from "@/components/ui/card";
import { ListRow, ProgressBar, RoundAction, StatBadge } from "@/components/ui/primitives";
import { GameGoalCard, GameIcon, ageLabel } from "@/components/game/game-bits";
import { HeroSparkline } from "@/components/charts/hero-sparkline";
import { ActivityFeed } from "@/components/workspace/activity-feed";
import { SignalItem } from "@/components/signals/signal-item";
import { genreStats, getMarketRows, getNewEntrants, getPulse } from "@/lib/data/market";
import { listSignals } from "@/lib/data/signals";
import type { GameRow } from "@/lib/roblox/queries";
import { formatCompact, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

function bySort(games: GameRow[], sort: keyof GameRow["sorts"]) {
  return games.filter((g) => g.sorts[sort] != null).sort((a, b) => a.sorts[sort]! - b.sorts[sort]!);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-inset ${className ?? "h-40"}`} />;
}

async function NewEntrants() {
  const rows = await getNewEntrants(6);
  if (!rows.length)
    return <p className="rounded-2xl bg-inset p-4 text-sm text-muted">Son 72 saatte Yükselen listesine yeni giren yok (ya da veri toplama yeni başladı).</p>;
  return (
    <div className="space-y-2">
      {rows.map((g) => (
        <ListRow
          key={g.universeId}
          href={`/games/${g.universeId}`}
          icon={<GameIcon src={g.iconUrl} name={g.name} size={44} className="shadow-none" />}
          title={g.name}
          subtitle={`${g.genre ?? "—"} · ${timeAgo(g.firstSeenAt)} girdi`}
          value={formatCompact(g.playing)}
          valueSub={`en iyi #${g.bestRank}`}
        />
      ))}
    </div>
  );
}

async function SignalFeed() {
  const rows = await listSignals({ limit: 5 });
  if (!rows.length) return <p className="rounded-2xl bg-inset p-4 text-sm text-muted">Sinyal yok. Günlük Apify toplaması çalışınca burada görünür.</p>;
  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <SignalItem key={s.id} s={s} compact />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  await connection();
  const [{ games, source, updatedAt }, pulse] = await Promise.all([getMarketRows(), getPulse()]);
  const db = source === "db";
  const rising = db
    ? games.filter((g) => g.riseScore != null).sort((a, b) => (b.riseScore ?? 0) - (a.riseScore ?? 0))
    : bySort(games, "up-and-coming");
  const uac = games.filter((g) => g.sorts["up-and-coming"] != null);
  const topNow = bySort(games, "top-playing-now");
  const total = pulse.total ?? games.reduce((s, g) => s + g.playing, 0);
  const niches = genreStats(uac.length ? uac : games).slice(0, 8);
  const maxNiche = Math.max(...niches.map((n) => n.playing), 1);
  const risingMax = Math.max(...rising.slice(0, 6).map((g) => g.playing), 1);
  const time = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })
    : "—";

  return (
    <>
      <Topbar />
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Hero: Pazar Nabzı */}
        <HeroCard className="lg:col-span-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-[#22c55e] dark:bg-white" />
              {db ? `Son ölçüm · ${time}` : `Canlı · ${time}`}
            </span>
          </div>
          <p className="mt-5 text-center text-sm text-hero-muted">İzlenen {pulse.games || games.length} oyunda anlık oyuncu</p>
          <p className="mt-1 text-center text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{formatNumber(total)}</p>
          <div className="mt-2 flex justify-center">
            {pulse.change24h != null ? (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tabular-nums">{formatPercent(pulse.change24h)} · 24 saat</span>
            ) : (
              <span className="text-xs text-hero-muted">24 saatlik değişim için veri birikiyor ({pulse.hoursOfData} saat)</span>
            )}
          </div>
          {pulse.series.length > 2 && (
            <div className="mt-4 -mx-2">
              <HeroSparkline data={pulse.series} />
            </div>
          )}
          <div className="mt-6 grid grid-cols-4 gap-2">
            <RoundAction href="/trends" icon={<TrendingUp className="size-5" />} label="Trendler" />
            <RoundAction href="/compare" icon={<GitCompareArrows className="size-5" />} label="Kıyasla" />
            <RoundAction href="/ideas?new=1" icon={<Lightbulb className="size-5" />} label="Yeni Fikir" />
            <RoundAction href="/notes?new=1" icon={<NotebookPen className="size-5" />} label="Not" />
          </div>
        </HeroCard>

        {/* Niş haritası */}
        <Card className="lg:col-span-7">
          <CardHeader
            title="Yükselen nişler"
            subtitle="Son 28 günde çıkıp Yükselen listesine giren oyunlar, türe göre"
            action={
              <Link href="/trends#nisler" className="text-xs font-semibold text-muted hover:text-fg">
                Niş tablosu
              </Link>
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {niches.map((n) => (
              <InsetCard key={n.genre} className="space-y-2 p-3.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-semibold">{n.genre}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{n.games} oyun</span>
                </div>
                <ProgressBar value={n.playing / maxNiche} color="accent" />
                <div className="flex items-center justify-between text-xs tabular-nums text-muted">
                  <span>{formatCompact(n.playing)} oyuncu</span>
                  {n.avgGrowth != null && <StatBadge value={n.avgGrowth} className="py-0.5" />}
                </div>
              </InsetCard>
            ))}
          </div>
        </Card>
      </div>

      {/* Yükselenler */}
      <section className="mt-8">
        <SectionTitle
          title={db ? "Bugün yükselenler (yükseliş skoru)" : "Yükselen oyunlar"}
          action={
            <Link href="/trends?order=rise" className="flex items-center gap-1 text-sm font-medium">
              Tümünü gör <ChevronRight className="size-4" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rising.slice(0, 6).map((g, i) => (
            <GameGoalCard key={g.universeId} game={g} max={risingMax} rank={i + 1} color={(["pos", "warn", "info"] as const)[i % 3]} />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Yükselen listesine yeni girenler" subtitle="Son 72 saat · Roblox Up-and-Coming" />
          <Suspense fallback={<Skeleton />}>
            <NewEntrants />
          </Suspense>
        </Card>
        <Card>
          <CardHeader
            title="Sosyal sinyaller"
            subtitle="YouTube, TikTok, Reddit"
            action={
              <Link href="/signals" className="text-xs font-semibold text-muted hover:text-fg">
                Tümü
              </Link>
            }
          />
          <Suspense fallback={<Skeleton />}>
            <SignalFeed />
          </Suspense>
        </Card>
        <Card>
          <CardHeader title="Ekip aktivitesi" subtitle="Yusuf ve Mertcan" />
          <Suspense fallback={<Skeleton />}>
            <ActivityFeed limit={6} />
          </Suspense>
        </Card>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Şu an en çok oynanan" subtitle="Roblox keşif listesi" />
          <div className="space-y-2">
            {topNow.slice(0, 8).map((g) => (
              <ListRow
                key={g.universeId}
                href={`/games/${g.universeId}`}
                icon={<GameIcon src={g.icon} name={g.name} size={44} className="shadow-none" />}
                title={g.name}
                subtitle={`${g.genre ?? "—"} · ${ageLabel(g.ageDays)}`}
                value={formatCompact(g.playing)}
                valueSub={g.growth24h != null ? formatPercent(g.growth24h) : "oyuncu"}
              />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="En taze güncellemeler" subtitle="Listelerde olup son 3 günde güncellenenler" />
          <div className="space-y-2">
            {games
              .filter((g) => g.updatedDaysAgo <= 3)
              .sort((a, b) => b.playing - a.playing)
              .slice(0, 7)
              .map((g) => (
                <ListRow
                  key={g.universeId}
                  href={`/games/${g.universeId}`}
                  icon={<GameIcon src={g.icon} name={g.name} size={44} className="shadow-none" />}
                  title={g.name}
                  subtitle={g.updatedDaysAgo === 0 ? "bugün güncellendi" : `${g.updatedDaysAgo} gün önce güncellendi`}
                  value={formatCompact(g.playing)}
                  valueSub="oyuncu"
                />
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
