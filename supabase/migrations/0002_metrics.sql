-- Oyun metrikleri ve Yükseliş Skoru. Formül: docs/04-veritabani.md
create or replace view game_metrics as
with latest as (
  select distinct on (universe_id) universe_id, ts, playing, visits, favorites, up_votes, down_votes
  from game_snapshots
  where ts > now() - interval '3 hours'
  order by universe_id, ts desc
),
ago24 as (
  select universe_id, avg(playing)::numeric as playing, min(visits) as visits
  from game_snapshots
  where ts between now() - interval '26 hours' and now() - interval '22 hours'
  group by universe_id
),
ago7 as (
  select universe_id, avg(playing)::numeric as playing
  from game_snapshots
  where ts between now() - interval '171 hours' and now() - interval '165 hours'
  group by universe_id
),
ago7d as (
  select universe_id, avg_playing::numeric as playing
  from game_daily
  where day = current_date - 7
),
uac as (
  select universe_id, first_seen_at
  from sort_presence
  where sort_id = 'up-and-coming'
),
base as (
  select
    g.universe_id, g.name, g.genre, g.subgenre, g.icon_url, g.creator_name, g.tracked,
    g.created_at_rbx, g.updated_at_rbx, g.place_id,
    l.playing, l.visits, l.favorites, l.up_votes, l.down_votes, l.ts as snapshot_ts,
    a24.playing as playing_24h,
    coalesce(a7.playing, a7d.playing) as playing_7d,
    (l.visits - a24.visits) as visits_24h,
    case when (l.up_votes + l.down_votes) > 0
      then l.up_votes::numeric / (l.up_votes + l.down_votes) end as like_ratio,
    extract(epoch from now() - g.created_at_rbx) / 86400 as age_days,
    u.first_seen_at as uac_first_seen
  from games g
  join latest l using (universe_id)
  left join ago24 a24 using (universe_id)
  left join ago7 a7 using (universe_id)
  left join ago7d a7d using (universe_id)
  left join uac u using (universe_id)
)
select
  b.*,
  case when b.playing_24h > 0 then (b.playing - b.playing_24h) / b.playing_24h end as growth_24h,
  case when b.playing_7d > 0 then (b.playing - b.playing_7d) / b.playing_7d end as growth_7d,
  round((100 * (
      0.40 * tanh(coalesce((b.playing - b.playing_24h) / greatest(b.playing_24h, 50), 0))
    + 0.25 * tanh(coalesce((b.playing - b.playing_7d) / greatest(b.playing_7d, 50), 0) / 2)
    + 0.15 * (case when b.uac_first_seen > now() - interval '72 hours' then 1 else 0 end)
    + 0.10 * greatest(0, 1 - coalesce(b.age_days, 999) / 90)
    + 0.10 * coalesce(b.like_ratio, 0.5)
  ) * (case when b.playing < 200 then 0.5 else 1 end))::numeric, 1) as rise_score
from base b;
