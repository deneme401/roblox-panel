# 04 — Veritabanı (Supabase)

> Durum: **tasarım**. SQL migration'ları Faz 2'de `supabase/migrations/` altına yazılacak.

## Tablolar

### Oyun verisi
| Tablo | Alanlar | Not |
|---|---|---|
| `games` | `universe_id` PK, `place_id`, `name`, `creator_name`, `creator_type`, `genre`, `genre_l1`, `genre_l2`, `created_at_rbx`, `updated_at_rbx`, `icon_url`, `ai_tags text[]`, `tracked bool`, `first_seen_at` | `tracked` = ekibin elle takibe aldığı oyunlar |
| `game_snapshots` | `universe_id`, `ts`, `playing`, `visits`, `favorites`, `up_votes`, `down_votes` | Saatlik. **30 gün** saklanır. |
| `game_daily` | `universe_id`, `day`, `avg_playing`, `peak_playing`, `visits`, `favorites`, `up_votes`, `down_votes` | Günlük özet, kalıcı |
| `sort_appearances` | `ts`, `sort_id`, `universe_id`, `rank` | Listeye ilk giriş zamanını yakalamak için |
| `game_passes` | `universe_id`, `pass_id`, `name`, `price`, `is_for_sale`, `first_seen_at`, `last_seen_at` | |
| `game_metrics` (view) | CCU Δ24s %, Δ7g %, visits/gün, like oranı, yaş (gün), **rise_score** | |
| `signals` | `id`, `source`, `url`, `title`, `author`, `views`, `published_at`, `matched_universe_id` | |
| `job_runs` | `job`, `started_at`, `finished_at`, `ok`, `message`, `rows` | Ayarlar sayfasındaki iş durumu |

### Workspace
| Tablo | Alanlar |
|---|---|
| `allowed_users` | `email` PK, `display_name` |
| `ideas` | `id`, `title`, `pitch`, `status` (idea/research/prototype/dropped), `scores jsonb`, `ai_eval jsonb`, `owner`, timestamps |
| `idea_games` | `idea_id`, `universe_id` (rakip bağlantısı) |
| `notes` | `id`, `title`, `content jsonb` (TipTap), `entity_type` (general/game/idea), `entity_id`, `pinned`, `tags text[]`, `updated_by`, timestamps |
| `comments` | `id`, `entity_type`, `entity_id`, `body`, `author`, `created_at` |
| `activity` | `id`, `actor`, `verb`, `entity_type`, `entity_id`, `meta jsonb`, `created_at` |
| `compare_sets` | `id`, `name`, `universe_ids bigint[]` |

## Yükseliş Skoru (rise_score) — taslak
```
rise_score = 0.40 * norm(ccu_growth_24h)
           + 0.25 * norm(ccu_growth_7d)
           + 0.15 * new_in_up_and_coming (son 72 saat, 0/1)
           + 0.10 * youth (oyun yaşı < 90 gün ise azalan)
           + 0.10 * like_ratio
```
Küçük oyunların yüzdesel patlamasını dengelemek için CCU < 200 olanlar skorda cezalandırılır.

## RLS
Tüm tablolarda RLS açık. Politika: `auth.jwt() ->> 'email'` değeri `allowed_users` içinde olmalı. Toplayıcılar `service_role` key ile yazar.
