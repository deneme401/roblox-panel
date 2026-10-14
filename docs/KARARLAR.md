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
