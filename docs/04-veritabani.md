# 04 — Veritabanı (Supabase)

> Durum: **uygulandı** (2026-10-14). Proje ref `ttsbfpzpgujvplciiczx`, bölge **ap-southeast-2 (Sidney)**, Postgres 17.
> Şema: `supabase/migrations/*.sql`, uygulama: `node scripts/migrate.mjs` (doğrudan adres çözülmezse `DATABASE_URL_DIRECT=<pooler url>` ile) (uygulananlar `_migrations` tablosunda).

## Erişim modeli (ADR #8)
- Uygulama veritabanına **yalnızca sunucudan** `postgres` (porsager) istemcisiyle bağlanır: `src/lib/db.ts`, transaction pooler (6543, `prepare: false`).
- **Tüm tablolarda RLS açık, hiç politika yok.** Böylece tarayıcıdaki publishable key ile PostgREST'ten hiçbir tablo okunamaz/yazılamaz. `postgres` rolü RLS'i bypass eder.
- Supabase Auth kullanılmıyor; kimlik `members` + imzalı çerez (bkz. 02-mimari).
- `postgres.camel` dönüşümü açık: kolonlar **ve jsonb anahtarları** camelCase okunur. Bu yüzden jsonb'ye yazılan AI çıktılarının anahtarları baştan camelCase (`riskScore`, `whyRising`...).
- `bigint`/`numeric` JS `number` olarak döner (`types` ayarı).

## Tablolar

### Oyun verisi
| Tablo | Alanlar | Not |
|---|---|---|
| `games` | `universe_id` PK, `place_id`, `name`, `description`, `creator_name/type`, `genre`, `subgenre`, `max_players`, `created_at_rbx`, `updated_at_rbx`, `icon_url`, `ai_tags[]`, `ai_analysis jsonb`, `ai_model`, `ai_analyzed_at`, `tracked`, `tracked_by`, `first_seen_at`, `last_seen_in_sort_at`, `last_snapshot_at` | `tracked` = elle takip |
| `game_snapshots` | PK (`universe_id`, `ts`), `playing`, `visits`, `favorites`, `up_votes`, `down_votes` | Saatlik (ts saat başına yuvarlanır). **30 gün** |
| `game_daily` | PK (`universe_id`, `day`), `avg_playing`, `peak_playing`, `visits`, `favorites`, oylar, `samples` | Kalıcı günlük özet (UTC gün) |
| `sort_appearances` | PK (`sort_id`, `universe_id`, `ts`), `rank` | Saatlik liste sırası, 30 gün |
| `sort_presence` | PK (`sort_id`, `universe_id`), `first_seen_at`, `last_seen_at`, `best_rank`, `last_rank` | Listeye ilk giriş (kalıcı) |
| `game_passes` | PK (`universe_id`, `pass_id`), `name`, `price`, `is_for_sale`, `first_seen_at`, `last_seen_at` | "yeni pass" tespiti |
| `game_updates` | PK (`universe_id`, `updated_at_rbx`), `seen_at` | Güncelleme geçmişi |
| `signals` | `source`, `external_id` (unique ikili), `url`, `title`, `author`, `views`, `likes`, `comments`, `thumbnail`, `published_at`, `query`, `matched_universe_id` | |
| `job_runs` | `job`, `started_at`, `finished_at`, `ok`, `rows`, `message` | 30 gün |
| `ai_calls` | `kind`, `model`, `ok`, `error`, `ms` | Model zinciri istatistiği, 30 gün |

### Workspace
| Tablo | Alanlar |
|---|---|
| `members` | `id` ('yusuf', 'mertcan'), `display_name`, `color` — `src/lib/auth/members.ts` ile aynı |
| `ideas` | `id` uuid, `title`, `pitch`, `genre`, `status` (idea/research/prototype/dropped), `position` (kanban sırası, float), `scores jsonb` {demand, competition, effort, monetization, virality}, `ai_eval jsonb`, `ai_model`, `ai_evaluated_at`, `owner`, timestamps |
| `idea_games` | (`idea_id`, `universe_id`) rakip bağlantısı |
| `notes` | `id`, `title`, `content jsonb` (TipTap), `plain` (arama/önizleme), `entity_type` (general/game/idea), `entity_id`, `pinned`, `tags[]`, `created_by`, `updated_by`, timestamps |
| `comments` | `entity_type`, `entity_id`, `body`, `author` |
| `activity` | `actor`, `verb`, `entity_type`, `entity_id`, `label`, `meta` |
| `compare_sets` | `name`, `universe_ids bigint[]`, `created_by` |

## `game_metrics` view (0002 → 0005_metrics_relative.sql)
Her oyunun **en son** snapshot'ı için; büyüme pencereleri `now()`'a değil o snapshot'ın zamanına göre (veri eskise de boşalmaz, ADR #13):
- `growth_24h` = (şimdi − 22–26 saat önceki ort.) / o ortalama
- `growth_7d` = (şimdi − 165–171 saat önceki ort., yoksa 7 gün önceki `game_daily.avg_playing`) / o değer
- `visits_24h`, `like_ratio`, `age_days`, `uac_first_seen`

### Yükseliş Skoru (rise_score, 0–100)
```
100 × ( 0.40 · tanh( Δ24s / max(oyuncu_24s_önce, 50) )
      + 0.25 · tanh( Δ7g  / max(oyuncu_7g_önce, 50) / 2 )
      + 0.15 · [Up-and-Coming'e son 72 saatte ilk kez girdi]
      + 0.10 · max(0, 1 − yaş_gün / 90)
      + 0.10 · beğeni_oranı )
× (oyuncu < 200 ise 0.5)
```
- Paydadaki `max(…, 50)` küçük oyunların %1000'lik patlamalarını sınırlar; `tanh` uç değerleri bastırır.
- Geçmiş veri yokken büyüme terimleri 0 sayılır, skor yaş + beğeni + yeni girişten oluşur (ilk gün ~30-35 civarı).

## Fikir puanı (`src/app/(app)/ideas/scoring.ts`)
- Talep ve rekabet bağlı rakiplerden otomatik (`autoScores` — `lib/data/workspace-shared.ts`): talep = log10(toplam oyuncu) − 1 ± büyüme; rekabet = 1 + (10B+ oyunculu rakip sayısı) + (toplam > 200B ise 1).
- Efor, monetizasyon, viralite elle 1–5. Toplam = ortalama (rekabet ve efor ters) → 0–100.

## Boyut tahmini
~300 oyun × 24 snapshot × 30 gün ≈ 216k satır (~25–30 MB, indekslerle). İlk gün DB 12 MB. Ayarlar sayfası 500 MB sınırına göre doluluk gösterir.

## Zamanlama
`pg_cron` + `pg_net` + Vault: `scripts/setup-cron.mjs` (bkz. 07-kurulum-ve-deploy). Uzantılar açıldı (pg_cron 1.6.4, pg_net 0.20.4); işler Vercel adresi belli olunca kurulacak.
