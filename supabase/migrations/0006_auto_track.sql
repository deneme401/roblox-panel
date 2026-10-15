-- Uygulama ayarları (anahtar → jsonb) ve otomatik takip.
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_by text references members(id),
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- Otomatik takibe alınan oyunları elle takipten ayırmak için
alter table games add column if not exists tracked_auto boolean not null default false;

-- Varsayılan: kapalı; açılınca seçili listelere giren her oyun takibe alınır
insert into app_settings (key, value)
values ('auto_track', '{"enabled": false, "sorts": ["top-trending", "up-and-coming"]}')
on conflict (key) do nothing;
