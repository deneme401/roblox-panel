"use client";

import { useState } from "react";
import { Plus, Rocket } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, HeroCard, InsetCard } from "@/components/ui/card";
import { Button, ListRow, ProgressBar, RoundAction, StatBadge } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DonutGauge, HatchedBarChart, SmoothAreaChart, Sparkline } from "@/components/charts/charts";

// Örnek veri — yalnızca bileşen vitrini için
const area = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem"].map((label, i) => ({ label, value: [42, 61, 38, 72, 55, 90, 68][i] * 1000 }));
const bars = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"].map((label, i) => ({ label, value: [820, 640, 450, 610, 980, 760][i] }));

export default function UiShowcase() {
  const [range, setRange] = useState<"d" | "w" | "m">("m");
  return (
    <>
      <Topbar title="Bileşen vitrini" />
      <div className="grid gap-5 lg:grid-cols-12">
        <HeroCard className="lg:col-span-5">
          <p className="text-center text-sm text-hero-muted">Hero kart</p>
          <p className="text-center text-5xl font-bold tabular-nums">23.400</p>
          <div className="mt-6 grid grid-cols-4">
            {["Ekle", "Gönder", "Çek", "Geçmiş"].map((l) => (
              <RoundAction key={l} icon={<Plus className="size-5" />} label={l} />
            ))}
          </div>
        </HeroCard>
        <Card className="lg:col-span-7">
          <CardHeader title="Rozetler, çubuklar, kontroller" action={<StatBadge value={1.12} />} />
          <InsetCard className="space-y-3">
            <div className="flex gap-2">
              <StatBadge value={0.084} />
              <StatBadge value={-0.031} />
              <StatBadge value={null} />
            </div>
            <ProgressBar value={0.4} />
            <ProgressBar value={0.62} color="warn" />
            <ProgressBar value={0.25} color="info" />
            <SegmentedControl
              value={range}
              onChange={setRange}
              options={[
                { value: "d", label: "Gün" },
                { value: "w", label: "Hafta" },
                { value: "m", label: "Ay" },
              ]}
            />
            <div className="flex gap-2">
              <Button>
                <Plus className="size-4" /> Birincil
              </Button>
              <Button variant="ghost">İkincil</Button>
            </div>
          </InsetCard>
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader title="Yumuşak alan grafiği" subtitle="Örnek veri" />
          <SmoothAreaChart data={area} unit="oyuncu" />
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader title="Taralı bar grafiği" subtitle="Örnek veri" />
          <HatchedBarChart data={bars} />
        </Card>
        <Card className="space-y-2 lg:col-span-7">
          <ListRow icon={<Rocket className="size-5" />} title="Liste satırı" subtitle="Alt başlık" value="+320" valueSub="12:00" />
          <ListRow icon={<Rocket className="size-5" />} title="Sparkline" subtitle="Tablo içi trend" value={<Sparkline values={[3, 5, 4, 7, 6, 9]} />} />
        </Card>
        <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-[#111113] p-6 text-white lg:col-span-5 dark:bg-inset">
          <div>
            <div className="text-xs text-white/60">Donut</div>
            <div className="text-lg font-semibold">Tamamlandı</div>
          </div>
          <DonutGauge value={0.75} />
        </div>
      </div>
    </>
  );
}
