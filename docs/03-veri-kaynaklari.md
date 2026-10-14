# 03 — Veri Kaynakları

## Roblox resmi (herkese açık, auth gerektirmez)
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
- Apify'ın kullanım alanı: **sosyal sinyaller** (Faz 8'de actor seçimi yapılıp buraya yazılacak):
  - YouTube arama ("roblox new game", "roblox update" vb.)
  - TikTok hashtag (#roblox, #robloxgame)
  - Reddit (r/roblox, r/robloxgamedev)
- Maliyet kontrolü: her çalıştırmada `maxItems` sınırı uygulanır, günde 1 çalışır.

## Gemini
Faz 7'de doldurulacak: `models.list` ile doğrulanan ücretsiz modeller ve zincir sırası.
