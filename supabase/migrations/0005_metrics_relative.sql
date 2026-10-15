-- game_metrics: "son 3 saat" şartı kaldırıldı. Her oyunun en son snapshot'ı kullanılır ve büyüme
-- pencereleri now()'a değil o snapshot'ın zamanına göre hesaplanır. Böylece toplayıcı bir süre
-- çalışmasa da panel boşalmaz (ve canlı API'ye düşmez). Formül: docs/04-veritabani.md
drop view if exists game_metrics;
create view game_metrics as
with latest as (
  select distinct on (universe_id) universe_id, ts, playing, visits, favorites, up_votes, down_votes
  from game_snapshots
  order by universe_id, ts desc
),
ago24 as (
  select l.universe_id, avg(s.playing)::numeric as playing, min(s.visits) as visits
  from latest l
  join game_snapshots s on s.universe_id = l.universe_id
    and s.ts between l.ts - interval '26 hours' and l.ts - interval '22 hours'
  group by l.universe_id
),
ago7 as (
  select l.universe_id, avg(s.playing)::numeric as playing
  from latest l
  join game_snapshots s on s.universe_id = l.universe_id
    and s.ts between l.ts - interval '171 hours' and l.ts - interval '165 hours'
  group by l.universe_id
),
ago7d as (
  select l.universe_id, d.avg_playing::numeric as playing
  from latest l
  join game_daily d on d.universe_id = l.universe_id and d.day = (l.ts at time zone 'UTC')::date - 7
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
    + 0.15 * (case when b.uac_first_seen > b.snapshot_ts - interval '72 hours' then 1 else 0 end)
    + 0.10 * greatest(0, 1 - coalesce(b.age_days, 999) / 90)
    + 0.10 * coalesce(b.like_ratio, 0.5)
  ) * (case when b.playing < 200 then 0.5 else 1 end))::numeric, 1) as rise_score
from base b;
