# Mimari Karar Kayıtları (ADR)

Format: **#No — Başlık** (tarih). Bağlam → Karar → Sonuç.

### #1 — Bulut barındırma: Vercel + Supabase (2026-10-14)
- **Bağlam:** İki kişinin ortak veriye her yerden erişmesi gerekiyor.
- **Karar:** Next.js Vercel'de, veri/auth/realtime Supabase'de (ikisinin de ücretsiz katmanı).
- **Sonuç:** Supabase free 500MB sınırı nedeniyle saatlik snapshot'lar 30 gün tutulur, sonrası günlük özete aktarılır.

### #2 — Roblox verisi resmi API'den, Apify sosyal sinyaller için (2026-10-14)
- **Bağlam:** Resmi explore/games/votes/game-passes endpoint'leri test edildi ve auth'suz çalışıyor. Apify store'daki Roblox actor'leri az kullanılıyor ve ücretli.
- **Karar:** Roblox metrikleri resmi API'den çekilir. Apify YouTube/TikTok/Reddit için kullanılır.
- **Sonuç:** Roblox verisi ücretsiz ve saatlik toplanabiliyor.

### #3 — Zamanlama Supabase pg_cron ile (2026-10-14)
- **Bağlam:** Vercel Hobby cron'u günde 1 çalışmayla sınırlı; saatlik veri gerekiyor.
- **Karar:** Supabase `pg_cron` + `pg_net`, `CRON_SECRET` header'ı ile Vercel route'larını çağırır.

### #4 — AI: Gemini model zinciri (2026-10-14)
- **Bağlam:** Kullanıcı Claude API yerine ücretsiz Gemini istedi; limit dolarsa diğer modele geçilmeli.
- **Karar:** `GEMINI_MODELS` env listesi sırayla denenir. 429, 5xx veya zaman aşımında sonrakine geçilir. Kullanılan model arayüzde gösterilir.

### #5 — Next.js 16.4 (2026-10-14)
- **Bağlam:** Plan Next 15 diyordu, `create-next-app@latest` 16.4 kurdu.
- **Karar:** 16.4 ile devam. `proxy.ts` (eski middleware), async `params`/`cookies`.

### #7 — DB gelmeden canlı API ile sayfa (2026-10-14)
- **Bağlam:** Supabase bilgileri henüz yok, ama anlık veri (listeler, oyuncu, oy, gamepass) DB gerektirmiyor.
- **Karar:** Pano, Trendler ve Oyun Detay sayfaları şimdiden canlı Roblox API'sinden besleniyor (`lib/roblox/queries.ts`). Büyüme yüzdeleri ve geçmiş grafikler DB bağlanınca eklenecek.

### #6 — shadcn yerine kendi küçük bileşen setimiz (2026-10-14)
- **Bağlam:** Referans tasarım çok özgün (hap menü, inset kartlar, taralı barlar); shadcn'in varsayılan görünümü uzak.
- **Karar:** `src/components/ui` altında Tailwind ile kendi bileşenlerimiz yazılır.

### #8 — DB'ye yalnızca sunucudan doğrudan Postgres bağlantısı (2026-10-14)
- **Bağlam:** Kullanıcı Supabase URL, publishable key ve veritabanı şifresini verdi; service_role key yok. Supabase JS + RLS politikaları ile tarayıcıdan erişim, publishable key herkese açık olduğu için verileri dışarı açardı.
- **Karar:** Tüm okuma/yazma Server Component ve Server Action'larda `postgres` istemcisiyle (transaction pooler, `prepare:false`). Tüm tablolarda RLS açık, politika yok → PostgREST'ten erişim kapalı.
- **Sonuç:** Service role key gerekmiyor. Supabase'in hazır Auth/RLS özellikleri kullanılmıyor; yetki kontrolü Server Action'larda `requireMember()`.

### #9 — E-posta yerine isim seçimli giriş + ortak şifre (2026-10-14)
- **Bağlam:** Kullanıcı "maile şimdilik gerek yok, isimler Yusuf ile Mertcan" dedi.
- **Karar:** `/login`'de isim seçilir, HMAC-SHA256 (`SESSION_SECRET`) imzalı 60 günlük httpOnly çerez verilir. `proxy.ts` iyimser kontrol yapar. Canlıda `APP_PASSWORD` tanımlanınca şifre de istenir.
- **Sonuç:** Kurulum kolay. Şifre ortak olduğu için iki kişi birbirinin adıyla girebilir (güven ilişkisi varsayıldı). İleride Supabase Auth'a geçmek için `getMember()` tek nokta.

### #10 — Realtime: veri değil "değişti" sinyali (2026-10-14)
- **Bağlam:** RLS kapalı kapı olduğundan postgres_changes aboneliği publishable key ile veri alamaz/vermemeli.
- **Karar:** Supabase Realtime `broadcast` kanalı `rr-workspace` üzerinden yalnızca `{topic}` gönderilir; alan taraf `router.refresh()` yapar. `presence` ile kimin çevrimiçi olduğu gösterilir.
- **Sonuç:** Veri kanaldan sızmaz. Notlarda eş zamanlı düzenleme CRDT değil; son kaydeden kazanır, çakışmada uyarı gösterilir (2 kişi için yeterli).

### #11 — Vercel fonksiyon bölgesi syd1 (2026-10-14)
- **Bağlam:** Supabase projesi ap-southeast-2'de. Türkiye'den bağlantı kurulumu ~1,5 sn, paralel sorgular 10 sn zaman aşımına takıldı.
- **Karar:** `vercel.json` → `regions: ["syd1"]`; `db.ts` `connect_timeout: 30`, `idle_timeout: 300`.
- **Sonuç:** Canlıda DB gecikmesi düşük; tarayıcı ↔ Vercel arası uzak ama sayfalar akışla (Suspense) gelir.

### #12 — Tüm uygulama sayfaları istek anında render (2026-10-14)
- **Bağlam:** Cache Components ile prerender sırasında `Date.now()` ("x dk önce", yaş, çerez süresi) hata veriyor; `"use cache"` içinde de yasak.
- **Karar:** Sayfalar `await connection()` ile dinamik; pazar verisi yine `"use cache"` ile 5 dk önbellekli; yaşlar `fillAges()` ile önbellek dışında hesaplanır.

### #13 — Sayfalar canlı Roblox API'sine bağımlı değil (2026-10-15)
- **Bağlam:** Türkiye'den Roblox API'lerine erişilemiyor; view "son 3 saat" şartıyla veri eskiyince boşalıyor, sayfalar canlı API'ye düşüp 10 sn bekleyip çöküyordu.
- **Karar:** Metrikler en son snapshot'a göre (`0005`). Okuma her zaman DB'den; canlı API yalnızca DB'de olmayan oyun için `tryLive()` (5 sn, hata → null) ile. Toplayıcılar canlıda (syd1) çalışır.
- **Sonuç:** Toplama durursa panel son bilinen veriyi gösterir; ağ sorunu sayfayı kırmaz. "24s büyüme" son snapshot'a göredir — veri eskiyse Ayarlar'daki son çalışma zamanına bakılmalı.

### #14 — Roblox erişimi olmayan ağda pg_net aktarımı (2026-10-15)
- **Bağlam:** Türkiye'den Roblox API'lerine erişim yok; lokal toplama ve "Güncelle" çalışmıyordu. Supabase DB sunucusu (Sidney) Roblox'a erişebiliyor.
- **Karar:** `ROBLOX_RELAY=pgnet` ortam değişkeniyle tüm Roblox GET'leri `net.http_get` üzerinden yapılır (`src/lib/roblox/relay.ts`). Varsayılan doğrudan `fetch`.
- **Sonuç:** VPN gerekmeden lokal güncel veri. İstek başına ~1–3 sn ek gecikme; yanıtlar `net._http_response`'ta 6 saat tutulur (pg_net varsayılanı). Canlıda (syd1) kapalı tutulur.

