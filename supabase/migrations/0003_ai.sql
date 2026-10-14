-- Oyun bazlı AI analizi (Faz 7)
alter table games add column ai_analysis jsonb, add column ai_model text, add column ai_analyzed_at timestamptz;
