# 05 — Tasarım Sistemi

## Referans analizi
Görseller: [referans/1.png](referans/1.png), [referans/2.png](referans/2.png), [referans/3.png](referans/3.png)

| Referans | Öne çıkanlar |
|---|---|
| **1** (açık, finans hedefleri) | Açık gri zemin. Koyu degrade "bakiye" kartı ve içinde yuvarlak beyaz aksiyon butonları. Hedef kartları: ikon kutusu + başlık + ok butonu, içinde beyaz alt kartta ilerleme çubuğu. Alt kısımda siyah hap menü, aktif öğe beyaz daire. Detay sayfasında `+112%` yeşil hap rozet ve taralı koyu yuvarlak barlar. |
| **2** (açık, neumorfik) | Çok açık mavi-gri zemin. İnce/kalın font karışımıyla başlık ("Ghulam / Welcome Back!"). Segment kontrol (Income/Outcome). Siyah çizgili yumuşak alan grafiği, altta açık gri degrade. Ay seçici, aktif ay siyah hap. Koyu kartta donut yüzde göstergesi. |
| **3** (koyu, mercan) | Kömür zemin. Kartlar hafif açık ton, ince kenarlıklı. Mercan/turuncu degrade vurgu kartı ve glow gölge. Alan grafiği mercan çizgi ve koyu degrade dolguyla. Değer etiketi hap şeklinde. |

**Ortak dil:**
- Büyük radius (20–28px).
- Kart içinde kart (inset) yapısı.
- Ekranda tek bir yüksek kontrastlı "hero" kart.
- Hap şeklinde kontroller.
- Büyük, kalın rakamlar ve küçük gri etiketler.
- Bol boşluk, gölgeler çok yumuşak.

## Masaüstü uyarlaması
- **Sidebar:** solda yüzen dikey siyah hap. Yalnızca ikon gösterir; aktif öğe beyaz daire içinde (referans 1'deki alt menünün dikey hali). Mobilde aynı bileşen altta yatay hap olur.
- **Topbar:** "Hoş geldin, {isim}" (referans 2'deki ince/kalın karışımı), tema düğmesi, ekip avatarları.
- **Pano:** 12 kolon grid. Hero kart sol üstte geniş yer kaplar (açık temada siyah degrade, koyu temada mercan degrade).

## Token'lar
`src/app/globals.css` içinde CSS değişkenleri olarak tanımlıdır. Tailwind'de `bg-surface`, `text-muted` gibi sınıflarla kullanılır.

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--bg` | `#ECECEE` | `#1C1D21` | Sayfa zemini |
| `--surface` | `#F7F7F8` | `#26272C` | Kart |
| `--inset` | `#FFFFFF` | `#2E2F35` | Kart içi kart |
| `--line` | `#E4E4E7` | `#34353B` | Kenarlık |
| `--fg` | `#18181B` | `#F4F4F5` | Ana metin |
| `--muted` | `#8A8A92` | `#8A8A92` | İkincil metin |
| `--hero-from / --hero-to` | `#2B2B2F → #0E0E10` | `#FF6B5B → #FF8A65` | Hero kart |
| `--accent` | `#18181B` | `#FF6B5B` | Birincil buton, aktif öğe |
| `--pos` | `#22C55E` | `#4ADE80` | Pozitif değişim |
| `--neg` | `#EF4444` | `#F87171` | Negatif değişim |
| `--warn` | `#F97316` | `#FB923C` | Turuncu ilerleme |
| `--info` | `#3B82F6` | `#60A5FA` | Mavi ilerleme |

- **Font:** Plus Jakarta Sans (`next/font/google`). Rakamlarda `tabular-nums`.
- **Radius:** kart `28px`, inset `20px`, buton/hap `9999px`.
- **Gölge:** açık temada `0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .04)`; koyu temada vurgu glow `0 12px 32px rgb(255 107 91 / .35)`.

## Bileşenler
Hepsi uygulandı (Faz 1). Dosyalar: `src/components/ui/card.tsx` (Card, InsetCard, HeroCard, CardHeader, SectionTitle), `ui/primitives.tsx` (StatBadge, ProgressBar, IconTile, RoundAction, ListRow, ChevronButton, Button), `ui/segmented-control.tsx`, `charts/charts.tsx` (SmoothAreaChart, HatchedBarChart, DonutGauge, Sparkline), `layout/pill-nav.tsx`, `layout/topbar.tsx`, `layout/theme-toggle.tsx`, `game/game-bits.tsx` (GameIcon, GameGoalCard). Canlı örnekler: `/dev/ui`.

**Grafik notları:** Grafikler CSS değişkenlerini (`--chart-ink`, `--chart-grid`, `--series-1..5`) kullanır, tema değişince kendiliğinden uyum sağlar. Kıyaslama için kategorik sıra dataviz referans paletinden alındı (mavi, turuncu, aqua, sarı, magenta); en fazla 5 seri. Eksen etiketleri 10.000 altında tam sayı, üstünde kısaltma gösterir.

| Bileşen | Açıklama |
|---|---|
| `Card`, `InsetCard` | Kart ve içindeki alt kart |
| `HeroCard` | Degrade vurgu kartı |
| `PillNav` | Dikey (masaüstü) / yatay (mobil) hap menü |
| `StatBadge` | `+12.4%` hap rozet (pozitif/negatif) |
| `ProgressBar` | Renkli ince ilerleme çubuğu |
| `SegmentedControl` | Gün / Hafta / Ay |
| `RoundAction` | Hero kart içi yuvarlak buton + etiket |
| `ListRow` | İkon kutusu + başlık/alt başlık + sağda değer |
| `IconTile` | Yuvarlak köşeli ikon kutusu |
| Grafikler | `HatchedBarChart`, `SmoothAreaChart`, `DonutGauge`, `Sparkline` |
