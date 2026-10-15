# 03 — Veri Kaynakları

## Roblox resmi (herkese açık, auth gerektirmez)

> **Erişim notu (2026-10-15):** Türkiye'deki geliştirme makinesinden bu API'lere bağlanılamıyor (TCP zaman aşımı). Toplayıcılar canlıda Vercel syd1 üzerinden çalışır; lokal toplama için `.env.local`'da `ROBLOX_RELAY=pgnet` (istekler Supabase pg_net üzerinden, ADR #14) veya VPN. Sayfalar canlı API'ye bağımlı değildir (ADR #13).
2026-10-14 tarihinde test edildi ✅

| Amaç | Endpoint | Not |
|---|---|---|
| Keşif listeleri | `GET https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=<uuid>&device=computer` | `sorts[]` döner. Kullanılanlar: `top-trending` (94), `up-and-coming` (83), `top-playing-now` (97), `fun-with-friends` (86), `top-revisited` (85). İlk öğe `filters_v5` (oyun içermez). Her oyunda `universeId`, `rootPlaceId`, `name`, `playerCount`, `totalUpVotes/DownVotes` gelir. |
| Oyun detayları | `GET https://games.roblox.com/v1/games?universeIds=1,2,3` | Batch (≤100). `playing`, `visits`, `favoritedCount`, `created`, `updated`, `genre`, `genre_l1/l2`, `creator`, `price`, `maxPlayers`. |
| Oylar | `GET https://games.roblox.com/v1/games/votes?universeIds=...` | `upVotes`, `downVotes` |
| Gamepass'ler | `GET https://apis.roblox.com/game-passes/v1/universes/{universeId}/game-passes?passView=Full&pageSize=100` | `gamePasses[]`: `id`, `name`, `price`, `isForSale`. **Eski `games.roblox.com/v1/games/{id}/game-passes` artık hata veriyor.** |
| İkonlar | `GET https://thumbnails.roblox.com/v1/games/icons?universeIds=...&size=150x150&format=Png` | `imageUrl` |
| Place → Universe | `GET https://apis.roblox.com/universes/v1/places/{placeId}/universe` | Kullanıcı oyun linki yapıştırdığında |

Rate limit: Resmi bir sayı yok. Batch'ler arasında kısa bekleme yapılır, 429 gelirse geri çekilinir (backoff).

## Apify
- Key doğrulandı (`/v2/users/me` → 200). `.env.local` içinde `APIFY_TOKEN` olarak tutulur.
- Store'daki Roblox actor'leri (ör. `moving_beacon-owner1/roblox-games-users-scraper`, `s_actors/roblox-game-stats-tracker`) düşük kullanımlı ve PAY_PER_EVENT fiyatlı. Resmi API aynı veriyi ücretsiz verdiği için **Roblox verisinde Apify kullanılmıyor.**
- Apify'ın kullanım alanı: **sosyal sinyaller** (`src/lib/collect/signals.ts`). Seçilen actor'ler (2026-10-14, store'da en çok kullanılanlar, hepsi PAY_PER_EVENT):

  | Kaynak | Actor | Girdi | Ücret | Notlar |
  |---|---|---|---|---|
  | YouTube | `streamers/youtube-scraper` (16k kullanıcı/30g) | `searchQueries: ["roblox new game"]`, `sortingOrder: "date"`, shorts/stream 0 | 0,004 $/sonuç | `dateFilter` ayrıca ücretli, kullanılmıyor |
  | TikTok | `clockworks/tiktok-scraper` (29k) | `hashtags: ["robloxgame"]`, `resultsPerPage` | 0,0037 $/sonuç + 0,001 $/başlatma | indirme seçenekleri kapalı |
  | Reddit | `trudax/reddit-scraper-lite` (8k) | r/roblox ve r/robloxgamedev `hot`, `skipComments` | 0,004 $/sonuç + 0,02 $/başlatma | Reddit'in kendi JSON API'si bizim IP'den engelli (HTML döndü), bu yüzden Apify |
- Hesap **FREE plan, aylık 5 $ kredi**. `SIGNAL_ITEMS=8` (kaynak başına) ile günlük ≈ 0,12 $ → ayda ≈ 3,5 $.
- İlk gerçek çalışma (2026-10-14): 24 sinyal, 75 sn. Oyun adı eşleşmesi 0 (başlıklar çoğunlukla genel); eşleştirme: oyun adı normalize edilip (`[..]`, emoji, noktalama silinir, ≥5 karakter) metinde tam kelime olarak aranır.
- Çıktı alanları: YouTube `id,url,title,channelName,viewCount,likes,commentsCount,date,thumbnailUrl`; TikTok `id,text,webVideoUrl,playCount,diggCount,commentCount,createTimeISO,authorMeta.name,videoMeta.coverUrl`; Reddit `id,url,title,username,upVotes,numberOfComments,createdAt,dataType`.

## Gemini
- `src/lib/ai/gemini.ts`: `GEMINI_MODELS` sırayla denenir; 429/404/5xx/zaman aşımı (45 sn) → sıradaki model. Her çağrı `ai_calls` tablosuna yazılır, Ayarlar'da 24 saatlik başarı/hata görünür.
- **Varsayılan zincir (2026-10-15, anahtarla doğrulandı):** `gemini-3.8-flash` → `gemini-3.5-flash` → `gemini-3.5-flash-lite`, sonuna her zaman `gemini-flash-latest` ve `gemini-flash-lite-latest` takma adları eklenir (modeller kapatılsa da çalışsın). 2.x modelleri yeni kullanıcılara 404 veriyor. 3.x flash modelleri yoğun saatlerde sık 503 dönüyor; zincir otomatik geçiyor (test: 3.8 ve 3.5 → 503, 3.5-flash-lite ile oyun analizi ~5 sn). Ayarlar → "Anahtarın erişebildiği modelleri listele" ile güncel liste görülür, `GEMINI_MODELS` ile değiştirilir.
- Görevler (`src/lib/ai/tasks.ts`, JSON şemalı çıktı): fikir değerlendirme, oyun analizi, günlük toplu tür etiketleme (25 oyun).
