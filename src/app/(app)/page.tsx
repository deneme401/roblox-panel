import Link from "next/link";
import { ChevronRight, GitCompareArrows, Lightbulb, NotebookPen, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, HeroCard, InsetCard, SectionTitle } from "@/components/ui/card";
import { ListRow, ProgressBar, RoundAction } from "@/components/ui/primitives";
import { GameGoalCard, GameIcon, ageLabel } from "@/components/game/game-bits";
import { getDiscoverGames, type GameRow } from "@/lib/roblox/queries";
import { formatCompact, formatNumber } from "@/lib/utils";

function bySort(games: GameRow[], sort: keyof GameRow["sorts"]) {
  return games.filter((g) => g.sorts[sort] != null).sort((a, b) => a.sorts[sort]! - b.sorts[sort]!);
}

/** Yükselen listesindeki oyunları türe göre toplar: niş keşfi için. */
function nicheBreakdown(games: GameRow[]) {
  const map = new Map<string, { genre: string; count: number; playing: number }>();
  for (const g of games) {
    const key = g.genre ?? "Diğer";
    const e = map.get(key) ?? { genre: key, count: 0, playing: 0 };
    e.count++;
    e.playing += g.playing;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.playing - a.playing);
}

export default async function DashboardPage() {
  const { games, fetchedAt } = await getDiscoverGames();
  const rising = bySort(games, "up-and-coming");
  const topNow = bySort(games, "top-playing-now");
  const totalPlaying = games.reduce((s, g) => s + g.playing, 0);
  const niches = nicheBreakdown(rising);
  const maxNiche = niches[0]?.playing ?? 1;
  const risingMax = Math.max(...rising.slice(0, 6).map((g) => g.playing), 1);
  const time = new Date(fetchedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

  return (
    <>
      <Topbar />
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Hero: Pazar Nabzı */}
        <HeroCard className="lg:col-span-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-[#22c55e] dark:bg-white" />
              Canlı · {time}
            </span>
          </div>
          <p className="mt-5 text-center text-sm text-hero-muted">Keşif listelerinde anlık oyuncu</p>
          <p className="mt-1 text-center text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{formatNumber(totalPlaying)}</p>
          <p className="mt-2 text-center text-xs text-hero-muted">
            {games.length} oyun · {rising.length} tanesi son 28 günde çıktı
          </p>
          <div className="mt-7 grid grid-cols-4 gap-2">
            <RoundAction href="/trends" icon={<TrendingUp className="size-5" />} label="Trendler" />
            <RoundAction href="/compare" icon={<GitCompareArrows className="size-5" />} label="Kıyasla" />
            <RoundAction href="/ideas" icon={<Lightbulb className="size-5" />} label="Yeni Fikir" />
            <RoundAction href="/notes" icon={<NotebookPen className="size-5" />} label="Not" />
          </div>
        </HeroCard>

        {/* Niş haritası */}
        <Card className="lg:col-span-7">
          <CardHeader
            title="Yükselen nişler"
            subtitle="Son 28 günde çıkıp büyüyen oyunlar, türe göre toplam oyuncu"
            action={
              <Link href="/trends" className="text-xs font-semibold text-muted hover:text-fg">
                Tümü
              </Link>
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {niches.slice(0, 8).map((n) => (
              <InsetCard key={n.genre} className="space-y-2 p-3.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-semibold">{n.genre}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{n.count} oyun</span>
                </div>
                <ProgressBar value={n.playing / maxNiche} color="accent" />
                <div className="text-xs tabular-nums text-muted">{formatCompact(n.playing)} oyuncu</div>
              </InsetCard>
            ))}
          </div>
        </Card>
      </div>

      {/* Yükselenler */}
      <section className="mt-8">
        <SectionTitle
          title="Yükselen oyunlar"
          action={
            <Link href="/trends?sort=up-and-coming" className="flex items-center gap-1 text-sm font-medium">
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

      <div className="mt-8 grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Şu an en çok oynanan" subtitle="Roblox keşif listesi, anlık" />
          <div className="space-y-2">
            {topNow.slice(0, 8).map((g) => (
              <ListRow
                key={g.universeId}
                href={`/games/${g.universeId}`}
                icon={<GameIcon src={g.icon} name={g.name} size={44} className="shadow-none" />}
                title={g.name}
                subtitle={`${g.genre ?? "—"} · ${ageLabel(g.ageDays)}`}
                value={formatCompact(g.playing)}
                valueSub="oyuncu"
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
              .slice(0, 6)
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
          <p className="mt-4 rounded-2xl bg-inset p-3 text-xs text-muted">
            Büyüme yüzdeleri ve geçmiş grafikleri, saatlik veri toplama (Supabase) devreye girince burada görünecek.
          </p>
        </Card>
      </div>
    </>
  );
}
