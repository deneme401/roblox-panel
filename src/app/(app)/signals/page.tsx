import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader } from "@/components/ui/card";
import { ListRow } from "@/components/ui/primitives";
import { GameIcon } from "@/components/game/game-bits";
import { SignalItem, SOURCE_META } from "@/components/signals/signal-item";
import { listSignals, signalCounts, topMentioned } from "@/lib/data/signals";
import { cn, formatCompact, timeAgo } from "@/lib/utils";

export default function SignalsPage({ searchParams }: PageProps<"/signals">) {
  return (
    <>
      <Topbar title="Sinyaller" subtitle="YouTube, TikTok ve Reddit'te Roblox konuşmaları; oyun adlarıyla otomatik eşleşir (günlük, Apify)" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <Signals searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition", active ? "bg-accent text-accent-fg shadow-card" : "bg-surface text-muted hover:text-fg dark:border dark:border-line")}>
      {children}
    </Link>
  );
}

async function Signals({ searchParams }: { searchParams: PageProps<"/signals">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const source = typeof sp.source === "string" && sp.source in SOURCE_META ? sp.source : undefined;
  const matched = sp.matched === "1";
  const [rows, top, counts] = await Promise.all([listSignals({ source, matchedOnly: matched, limit: 80 }), topMentioned(10), signalCounts()]);
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { source, matched: matched ? "1" : undefined, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/signals?${s}` : "/signals";
  };
  const last = counts.reduce<Date | null>((m, c) => (c.lastFetched && (!m || c.lastFetched > m) ? c.lastFetched : m), null);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Tab href={q({ source: undefined })} active={!source}>
            Tümü
          </Tab>
          {Object.entries(SOURCE_META).map(([k, m]) => (
            <Tab key={k} href={q({ source: k })} active={source === k}>
              {m.label} · {counts.find((c) => c.source === k)?.n ?? 0}
            </Tab>
          ))}
          <Tab href={q({ matched: matched ? undefined : "1" })} active={matched}>
            🎮 Yalnızca oyun eşleşenler
          </Tab>
        </div>
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Henüz sinyal yok. Günlük toplama Apify ile çalışır; Ayarlar sayfasından elle de tetikleyebilirsin (yaklaşık 0,12 $ kredi harcar).
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((s) => (
              <SignalItem key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-5 lg:col-span-4">
        <Card>
          <CardHeader title="En çok bahsedilen oyunlar" subtitle="Son 14 gün" />
          {top.length === 0 ? (
            <p className="text-sm text-muted">Eşleşme yok.</p>
          ) : (
            <div className="space-y-2">
              {top.map((g) => (
                <ListRow
                  key={g.universeId}
                  href={`/games/${g.universeId}`}
                  icon={<GameIcon src={g.iconUrl} name={g.name} size={44} className="shadow-none" />}
                  title={g.name}
                  subtitle={g.views ? `${formatCompact(g.views)} görüntülenme` : undefined}
                  value={g.mentions}
                  valueSub="bahsedilme"
                />
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Kaynaklar" subtitle={`Son toplama: ${timeAgo(last)}`} />
          <ul className="space-y-1.5 text-sm text-muted">
            <li>YouTube: &quot;roblox new game&quot; araması, en yeniler</li>
            <li>TikTok: #robloxgame etiketi</li>
            <li>Reddit: r/roblox ve r/robloxgamedev popüler</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
