# 07 — Kurulum ve Deploy

## Lokal geliştirme
```bash
npm install
cp .env.example .env.local    # değerleri doldur
node scripts/migrate.mjs      # supabase/migrations/*.sql'i uygular (idempotent)
npm run dev                   # http://localhost:3000
```
**Masaüstü kısayolları (Windows):** `RoRadar Baslat` → `scripts/baslat.cmd` (build yoksa derler, sunucuyu küçültülmüş pencerede `next start -p 3124` ile açar, tarayıcıyı açar; zaten açıksa sadece tarayıcıyı açar). `RoRadar Kapat` → `scripts/kapat.cmd` (3124 ve 3123 portlarındaki sunucuları kapatır). Kısayollar masaüstünde; kod değişince önce `npx next build` gerekir.

Gereksinim: Node 20.9+ (geliştirme makinesinde Node 24.14).

**Toplayıcıları elle çalıştırma** (deploy olmadan da veri doldurur):
```bash
npx tsx --env-file=.env.local scripts/run-job.mts hourly    # listeler + snapshot (~20 sn)
npx tsx --env-file=.env.local scripts/run-job.mts daily     # gamepass + günlük özet (+AI etiket)
npx tsx --env-file=.env.local scripts/run-job.mts signals   # Apify (~0,12 $ kredi)
```
Ayarlar sayfasındaki "çalıştır" düğmeleri de aynı işi yapar.

## Ortam değişkenleri
Şablon: `.env.example`. Gerçek değerler yalnızca `.env.local` (git'e girmez) ve Vercel → Environment Variables içinde.

| Değişken | Nereden / ne | Zorunlu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API. Yalnızca Realtime (presence/broadcast) için; tablolara erişemez | ✅ |
| `DATABASE_URL` | **Transaction pooler**: `postgres.<ref>@aws-0-ap-southeast-2.pooler.supabase.com:6543` | ✅ |
| `DATABASE_URL_DIRECT` | `db.<ref>.supabase.co:5432` (yalnızca IPv6; scriptler için) | scriptler |
| `SESSION_SECRET` | Rastgele 64 hex; giriş çerezini imzalar | ✅ |
| `APP_PASSWORD` | Canlıda ekip şifresi. Boşsa giriş sadece isim seçimi | canlıda ✅ |
| `CRON_SECRET` | Rastgele; `/api/cron/*` yetkisi | ✅ |
| `APIFY_TOKEN`, `SIGNAL_ITEMS` | Apify → Settings → Integrations | sinyaller |
| `ROBLOX_RELAY` | `pgnet`: Roblox isteklerini Supabase pg_net üzerinden yap (Roblox'a erişilemeyen ağ, ör. TR lokal). **Canlıda boş** | lokal TR |
| `GEMINI_API_KEY`, `GEMINI_MODELS` | https://aistudio.google.com/apikey | AI |

## Vercel'e deploy (Faz 9)
1. https://vercel.com → **Add New → Project → Import** `deneme401/roblox-panel` (Framework: Next.js, ayarlar varsayılan).
2. **Environment Variables**: proje kökündeki `.env.vercel` (git dışı, `.env.local`'dan üretildi) içeriğinin tamamı Vercel'in env ekranına yapıştırılabilir. `DATABASE_URL_DIRECT` ve `ROBLOX_RELAY` canlıda **yok**. yukarıdaki tabloyu `.env.local`'daki değerlerle doldur. `APP_PASSWORD` için ikinizin bileceği bir şifre belirleyin.
3. Deploy. `vercel.json` fonksiyonları **syd1** (Sidney) bölgesine sabitler; veritabanı ap-southeast-2'de olduğundan sorgular hızlı olur.
4. Zamanlamayı kur (bir kez, lokalden):
   ```bash
   node scripts/setup-cron.mjs https://<proje>.vercel.app
   ```
   Bu script pg_cron + pg_net'i açar, adresi ve `CRON_SECRET`'ı **Supabase Vault**'a yazar ve işleri planlar:
   | İş | Cron (UTC) | Türkiye saati |
   |---|---|---|
   | `rr-hourly` → `/api/cron/hourly` | `5 * * * *` | her saat :05 |
   | `rr-daily` → `/api/cron/daily` | `10 3 * * *` | 06:10 |
   | `rr-signals` → `/api/cron/signals` | `0 9 * * *` | 12:00 |
   | `rr-cleanup` (pg_net/cron geçmişi) | `30 4 * * *` | 07:30 |
5. Kontrol: Ayarlar → "Veri toplama işleri" son çalışmaları gösterir. Supabase SQL: `select * from cron.job_run_details order by start_time desc limit 10;`

Vercel adresi değişirse 4. adımı yeni adresle tekrar çalıştırmak yeterli.

## Git
- Remote: `https://github.com/deneme401/roblox-panel.git`, branch `main`.
- Her faz sonunda commit + push.
