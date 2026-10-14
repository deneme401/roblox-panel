# 07 — Kurulum ve Deploy

## Lokal geliştirme
```bash
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev                  # http://localhost:3000
```
Gereksinim: Node 20.9+ (geliştirme makinesinde Node 24.14 kurulu).

## Ortam değişkenleri
`.env.example` dosyasına bakın. Gerçek değerler yalnızca `.env.local` (git'e girmez) ve Vercel Project Settings → Environment Variables içinde tutulur.

| Değişken | Nereden | Faz |
|---|---|---|
| `APIFY_TOKEN` | Apify Console → Settings → Integrations | 8 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (gizli!) | 2 |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | 7 |
| `GEMINI_MODELS` | Virgülle ayrılmış model listesi (öncelik sırasıyla) | 7 |
| `CRON_SECRET` | Rastgele uzun bir string | 3 |

## Git
- Remote: `https://github.com/deneme401/roblox-panel.git`, branch `main`.
- Her faz sonunda commit + push yapılır.

## Deploy (Faz 9'da detaylanacak)
1. Vercel → Import Git Repository → `deneme401/roblox-panel`.
2. Env değişkenlerini gir.
3. Supabase SQL editöründe `pg_cron` + `pg_net` ile saatlik/günlük çağrıları kur.
