# 02 — Mimari

## Teknoloji yığını

| Katman | Seçim | Not |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, TypeScript, Turbopack, **Cache Components** açık) | Plan Next 15 diyordu; `create-next-app@latest` 16.4 kurdu. `middleware` → `proxy`, request API'leri yalnızca async. |
| UI | React 19.3, **Tailwind v4**, kendi bileşenlerimiz (`src/components/ui`) | shadcn kurulmadı, ihtiyaç duydukça elle eklenir |
| Grafik | **Recharts 3** | Taralı bar, yumuşak alan, donut, radar |
| Tema | `next-themes` | `class` stratejisi, `data-theme` yok |
| İkon | `lucide-react` | |
| Not editörü | **TipTap 3** (`@tiptap/react`, `starter-kit`) | İçerik JSON olarak saklanır |
| Veritabanı | **Supabase** Postgres + Auth + Realtime | `@supabase/ssr` ile cookie tabanlı oturum |
| AI | **Gemini** `@google/genai` | Model zinciri ile otomatik geçiş |
| Kazıma | **Apify** REST API (`run-sync-get-dataset-items`) | Sosyal sinyaller |
| Zamanlama | Supabase `pg_cron` + `pg_net`, Vercel route'larını çağırır | Vercel Hobby cron'u günde 1 ile sınırlı |
| Deploy | Vercel ← GitHub `deneme401/roblox-panel` | |

## Klasör yapısı (hedef)
```
src/
  app/
    (app)/               # giriş gerektiren sayfalar (sidebar layout)
      page.tsx           # Pano
      trends/  games/[id]/  compare/  ideas/  notes/  signals/  settings/
    dev/ui/              # bileşen vitrini (geliştirme için)
    login/
    api/cron/*           # toplayıcılar (CRON_SECRET korumalı)
    api/ai/*             # Gemini çağrıları
  components/
    ui/                  # tasarım sistemi bileşenleri
    charts/              # grafik bileşenleri
    layout/              # sidebar, topbar, tema düğmesi
  lib/
    roblox/              # Roblox API istemcisi
    apify/               # Apify istemcisi
    ai/gemini.ts         # model zinciri
    supabase/            # server/client istemcileri
    metrics.ts           # yükseliş skoru vb.
supabase/migrations/     # SQL şema
docs/                    # bu klasör
```

## Önbellekleme (Cache Components)
- `next.config.ts` içinde `cacheComponents: true`. Sayfalar Roblox'u doğrudan çağırmaz; `src/lib/roblox/queries.ts` içindeki `"use cache"` + `cacheLife("minutes")` fonksiyonları üzerinden okur (yaklaşık 1 dakikada bir tazelenir).
- `src/lib/roblox/client.ts` önbelleksizdir; toplayıcılar (cron) doğrudan bunu kullanır.
- Runtime veri okuyan istemci hook'ları (`usePathname`, `useSearchParams`) ve `params` `<Suspense>` içinde olmalıdır; aksi halde build hata verir.

## Veri akışı
```
pg_cron (saatlik) ──HTTP──▶ /api/cron/collect-sorts      ──▶ Roblox explore-api ──▶ games, sort_appearances
                   ──HTTP──▶ /api/cron/collect-snapshots  ──▶ games + votes API   ──▶ game_snapshots
pg_cron (günlük)  ──HTTP──▶ /api/cron/collect-passes     ──▶ game-passes API     ──▶ game_passes
                   ──HTTP──▶ /api/cron/collect-signals    ──▶ Apify actor'leri    ──▶ signals
                   ──HTTP──▶ /api/cron/rollup             ──▶ game_daily, eski saatlik veriyi sil
Tarayıcı ──▶ Server Components (Supabase okuma) ──▶ sayfalar
Tarayıcı ◀──Realtime── notes / ideas / comments
```
