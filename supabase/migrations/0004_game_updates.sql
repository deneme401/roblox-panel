-- Oyun güncelleme geçmişi: Roblox'un 'updated' zamanı her değiştiğinde bir satır
create table game_updates (
  universe_id bigint not null references games(universe_id) on delete cascade,
  updated_at_rbx timestamptz not null,
  seen_at timestamptz not null default now(),
  primary key (universe_id, updated_at_rbx)
);
alter table game_updates enable row level security;
insert into game_updates (universe_id, updated_at_rbx) select universe_id, updated_at_rbx from games where updated_at_rbx is not null;
