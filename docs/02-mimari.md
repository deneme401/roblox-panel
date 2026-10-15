# 02 — Mimari

## Teknoloji yığını

| Katman | Seçim | Not |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, TypeScript, Turbopack, **Cache Components** açık) | `middleware` → `src/proxy.ts`, request API'leri yalnızca async |
| UI | React 19.3, **Tailwind v4**, kendi bileşenlerimiz (`src/components/ui`) | shadcn yok (ADR #6) |
| Grafik | **Recharts 3** | Alan, taralı bar, çoklu çizgi, radar, donut, sparkline |
| Tema | `next-themes` | `class` stratejisi |
| Not editörü | **TipTap 3** (starter-kit + task list + placeholder) | İçerik JSON |
| Veritabanı | **Supabase Postgres** — sunucudan `postgres` istemcisiyle | RLS kapalı kapı (ADR #8) |
| Kimlik | İsim seçimi + HMAC imzalı çerez (+ canlıda `APP_PASSWORD`) | ADR #9 |
| Anlık senkron | **Supabase Realtime** broadcast + presence | Veri kanaldan geçmez (ADR #10) |
| AI | **Gemini** `@google/genai`, model zinciri | ADR #4 |
| Kazıma | **Apify** `run-sync-get-dataset-items` | Sosyal sinyaller |
| Zamanlama | Supabase `pg_cron` + `pg_net` + Vault → `/api/cron/*` | ADR #3 |
| Deploy | Vercel (bölge **syd1**) ← GitHub `deneme401/roblox-panel` | DB Sidney'de |

## Klasör yapısı
```
src/
  proxy.ts                 # imzalı çerez yoksa /login'e yönlendirir (api/cron hariç)
  app/
    login/                 # isim seçimi (+ şifre), actions.ts: login/logout
    api/cron/[job]/        # hourly | daily | signals — Bearer CRON_SECRET
    (app)/                 # oturum gerektiren sayfalar; layout: hap menü + RealtimeBridge
      page.tsx             # Pano
      trends/ games/[id]/ compare/ ideas/ ideas/[id]/ notes/ signals/ settings/ dev/ui/
  components/
    ui/                    # Card, primitives, segmented-control, toast (+ useAction)
    charts/                # charts.tsx (Area, HatchedBar, MultiLine, Radar, Donut, Sparkline), hero-sparkline
    layout/                # pill-nav, topbar, theme-toggle, team-presence, realtime-bridge
    game/                  # game-bits, ccu-chart, game-actions, add-game-form
    workspace/             # activity-feed, comment-thread, entity-notes, sections (Suspense'li sunucu bileşenleri)
    signals/               # signal-item
  lib/
    db.ts                  # postgres istemcisi (pooler)
    actions.ts             # TÜM Server Action'lar (yazma işlemleri)
    auth/                  # members, token (HMAC, Web Crypto), session (getMember/requireMember)
    roblox/                # client.ts (önbelleksiz), relay.ts (pg_net aktarımı), sorts.ts (sabitler), queries.ts (canlı, "use cache")
    collect/               # jobs.ts (saatlik/gamepass/rollup), signals.ts (Apify), schedule.ts
    data/                  # okuma katmanı: market, game, compare, workspace(+shared), signals, settings
    ai/                    # gemini.ts (zincir), tasks.ts (değerlendirme/analiz/etiket)
    realtime/client.ts     # tek kanal, notifyChange / onChange / onPresence
scripts/                   # migrate.mjs, run-job.mts, setup-cron.mjs, env.mjs
supabase/migrations/       # 0001 şema, 0002 metrik view, 0003 AI kolonları, 0004 güncelleme geçmişi, 0005 metrikler son snapshot'a göre
```

## Önbellek ve render
- Oturum ve zamana bağlı içerik nedeniyle tüm `(app)` sayfaları **istek anında** render edilir: her sayfa (ya da Suspense içindeki async bileşeni) `await connection()` çağırır. `getMember()` da `connection()` çağırır (çerez süresi `Date.now()` kontrolü).
- Pazar verisi (`lib/data/market|game|compare`) `"use cache"` + `cacheLife({revalidate: 300})` + `cacheTag("market")`. Takip/oyun ekleme/iş çalıştırma `updateTag("market")` ile tazeler.
- **`"use cache"` içinde `Date.now()`/`new Date()` kullanılamaz** (çalışma anında "blocking-prerender-current-time" hatası). Yaş hesabı önbellek dışında `fillAges()` ile yapılır.
- Workspace okumaları (`lib/data/workspace.ts`, `signals.ts`, `settings.ts`) önbelleksiz, `connection()` ile başlar.
- İstemci bileşenleri DB modülü import etmemeli: paylaşılan tip/sabitler `workspace-shared.ts`'de.

## Yazma akışı
1. İstemci `useAction().run(() => serverAction(...))` çağırır.
2. Server Action `requireMember()` → SQL → `activity` kaydı → `refresh()` (ve gerekirse `updateTag`).
3. Başarılıysa istemci `notifyChange(topic)` ile Realtime broadcast yollar; diğer kullanıcının `RealtimeBridge`'i 400 ms sonra `router.refresh()` yapar.
4. Notlar 900 ms debounce ile otomatik kaydedilir; diğer kişinin sürümü, biz kaydedilmiş durumdaysak editöre yüklenir, yazıyorsak uyarı bandı çıkar (son kaydeden kazanır).

## Veri akışı
```
pg_cron :05 her saat ─▶ /api/cron/hourly  ─▶ explore-api sorts + games/votes/icons ─▶ games, sort_appearances, sort_presence, game_snapshots, game_updates
pg_cron 03:10 UTC    ─▶ /api/cron/daily   ─▶ game-passes (takip + top 60 skor + top 40 oyuncu) ─▶ game_passes
                                          ─▶ rollup → game_daily, 30 günden eski ham veri silinir
                                          ─▶ (Gemini varsa) 25 oyuna AI etiket
pg_cron 09:00 UTC    ─▶ /api/cron/signals ─▶ Apify YouTube/TikTok/Reddit ─▶ signals (+ oyun adı eşleştirme)
Tarayıcı ─▶ Server Components (lib/data/*) ─▶ sayfalar
Tarayıcı ◀─ Realtime broadcast/presence ─▶ router.refresh()
```
Lokal: `npx tsx --env-file=.env.local scripts/run-job.mts hourly|daily|signals`.

## Performans notu
Bu makineden (Türkiye) Sidney'deki pooler'a bağlantı kurulumu ~1,5 sn; 10 sn `connect_timeout` paralel sorgularda aşılıyordu → 30 sn yapıldı, `idle_timeout` 300 sn. Canlıda Vercel `syd1`'de çalıştığı için sorun değil.

2026-10-15 ölçümü: sorgu başına ~360 ms, bağlantı 2,7 sn (soğuk 18 sn). Bu yüzden veri katmanında sorgular mümkün olduğunca **paralel** (`Promise.all`). Bu ağdan Roblox API'lerine erişilemiyor; sayfalar yalnızca DB'den okur (ADR #13).
