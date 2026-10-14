-- RoRadar şeması. Açıklama: docs/04-veritabani.md
-- Uygulama veritabanına yalnızca sunucudan (DATABASE_URL, postgres rolü) erişir.
-- RLS tüm tablolarda açık ve politika yok: publishable key ile PostgREST'ten hiçbir şey okunamaz.

-- ── Ekip ────────────────────────────────────────────────────────────────
create table members (
  id text primary key,                -- 'yusuf', 'mertcan'
  display_name text not null,
  color text not null default '#3B82F6'
);
insert into members (id, display_name, color) values
  ('yusuf', 'Yusuf', '#3B82F6'),
  ('mertcan', 'Mertcan', '#F97316');

-- ── Oyun verisi ─────────────────────────────────────────────────────────
create table games (
  universe_id bigint primary key,
  place_id bigint,
  name text not null,
  description text,
  creator_name text,
  creator_type text,
  genre text,
  subgenre text,
  max_players int,
  created_at_rbx timestamptz,
  updated_at_rbx timestamptz,
  icon_url text,
  ai_tags text[] not null default '{}',
  tracked boolean not null default false,
  tracked_by text references members(id),
  first_seen_at timestamptz not null default now(),
  last_seen_in_sort_at timestamptz,
  last_snapshot_at timestamptz
);
create index games_tracked_idx on games (tracked) where tracked;

create table game_snapshots (
  universe_id bigint not null references games(universe_id) on delete cascade,
  ts timestamptz not null,
  playing int not null,
  visits bigint not null,
  favorites bigint not null,
  up_votes bigint,
  down_votes bigint,
  primary key (universe_id, ts)
);
create index game_snapshots_ts_idx on game_snapshots (ts);

create table game_daily (
  universe_id bigint not null references games(universe_id) on delete cascade,
  day date not null,
  avg_playing int not null,
  peak_playing int not null,
  visits bigint not null,          -- gün sonu toplam ziyaret
  favorites bigint not null,
  up_votes bigint,
  down_votes bigint,
  samples int not null,
  primary key (universe_id, day)
);

create table sort_appearances (
  ts timestamptz not null,
  sort_id text not null,
  universe_id bigint not null references games(universe_id) on delete cascade,
  rank int not null,
  primary key (sort_id, universe_id, ts)
);
create index sort_appearances_ts_idx on sort_appearances (ts);
create index sort_appearances_game_idx on sort_appearances (universe_id, sort_id, ts);

-- Bir oyunun bir listeye ilk/son girişi (sort_appearances temizlense de kalır)
create table sort_presence (
  sort_id text not null,
  universe_id bigint not null references games(universe_id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  best_rank int not null,
  last_rank int not null,
  primary key (sort_id, universe_id)
);

create table game_passes (
  universe_id bigint not null references games(universe_id) on delete cascade,
  pass_id bigint not null,
  name text not null,
  price int,
  is_for_sale boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (universe_id, pass_id)
);

create table signals (
  id bigserial primary key,
  source text not null,              -- youtube | tiktok | reddit
  external_id text not null,
  url text not null,
  title text,
  author text,
  views bigint,
  likes bigint,
  comments bigint,
  thumbnail text,
  published_at timestamptz,
  query text,
  matched_universe_id bigint references games(universe_id) on delete set null,
  fetched_at timestamptz not null default now(),
  unique (source, external_id)
);
create index signals_published_idx on signals (published_at desc);
create index signals_game_idx on signals (matched_universe_id);

create table job_runs (
  id bigserial primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  rows int,
  message text
);
create index job_runs_job_idx on job_runs (job, started_at desc);

-- ── Workspace ───────────────────────────────────────────────────────────
create table ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pitch text not null default '',
  genre text,
  status text not null default 'idea' check (status in ('idea','research','prototype','dropped')),
  position double precision not null default 0,
  scores jsonb not null default '{}',     -- {effort, monetization, virality}: 1-5
  ai_eval jsonb,
  ai_model text,
  ai_evaluated_at timestamptz,
  owner text references members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table idea_games (
  idea_id uuid not null references ideas(id) on delete cascade,
  universe_id bigint not null references games(universe_id) on delete cascade,
  primary key (idea_id, universe_id)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Adsız not',
  content jsonb not null default '{"type":"doc","content":[]}',
  plain text not null default '',
  entity_type text not null default 'general' check (entity_type in ('general','game','idea')),
  entity_id text,
  pinned boolean not null default false,
  tags text[] not null default '{}',
  created_by text references members(id),
  updated_by text references members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_entity_idx on notes (entity_type, entity_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  body text not null,
  author text references members(id),
  created_at timestamptz not null default now()
);
create index comments_entity_idx on comments (entity_type, entity_id, created_at);

create table activity (
  id bigserial primary key,
  actor text references members(id),
  verb text not null,
  entity_type text,
  entity_id text,
  label text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_created_idx on activity (created_at desc);

create table compare_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  universe_ids bigint[] not null,
  created_by text references members(id),
  created_at timestamptz not null default now()
);

create table ai_calls (
  id bigserial primary key,
  kind text not null,
  model text,
  ok boolean not null,
  error text,
  ms int,
  created_at timestamptz not null default now()
);

-- ── RLS: hepsi kapalı kapı (sunucu postgres rolüyle bypass eder) ─────────
do $$
declare t text;
begin
  foreach t in array array['members','games','game_snapshots','game_daily','sort_appearances','sort_presence',
    'game_passes','signals','job_runs','ideas','idea_games','notes','comments','activity','compare_sets','ai_calls']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
