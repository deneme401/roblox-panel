# Geliştirme Günlüğü

En yeni giriş en üstte.

---

## 2026-10-14 — Oturum 1 (devam): Faz 1 + canlı sayfalar

**Yapılanlar**
- Tasarım token'ları (`globals.css`, açık/koyu), Plus Jakarta Sans, `next-themes` ile tema geçişi.
- Bileşen seti ve grafikler (bkz. [05-tasarim-sistemi.md](05-tasarim-sistemi.md)), vitrin `/dev/ui`.
- Layout: yüzen siyah hap menü (koyu temada mercan aktif öğe), topbar, içerik en fazla 1600px.
- `lib/roblox/client.ts` (explore sorts, games, votes, icons, game-passes, place→universe; 429/5xx backoff) ve `lib/roblox/queries.ts` (önbellekli birleşik veri).
- **Canlı sayfalar:** Pano, Trendler (filtreli tablo), Oyun Detay. Diğer menü sayfaları "yapım aşamasında" yer tutucusu.
- Doğrulama:
  - `tsc` ve `eslint` temiz, `next build` başarılı.
  - Chrome'da pano (açık/koyu), oyun detayı ve trendler kontrol edildi.
  - Mobil görünüm henüz tarayıcıda doğrulanmadı (pencere küçültülemedi).

**Öğrenilenler / tuzaklar**
- Next 16 şablonu `cacheComponents`, `partialPrefetching` ve Tailwind turbopack loader'ı ile geliyor; `next.config.ts` ezilirse CSS bozulur.
- `usePathname` Suspense dışında olursa dinamik route'ların prerender'ı kırılıyor; çözüm `PillNavView` fallback'i.
- Roblox bazı oyunlarda `genre_l1 = "All"` döndürüyor; "türsüz" sayılıyor.
- Up-and-Coming listesi Roblox'un tanımıyla "son 28 günde yayınlanan, kullanıcı büyümesine göre sıralı" oyunlar.

**Sıradaki:** Faz 2 (Supabase): kullanıcıdan proje bilgileri ve e-postalar bekleniyor.

---

## 2026-10-14 — Oturum 1: Planlama + Faz 0

**Yapılanlar**
- Kullanıcıyla gereksinimler netleştirildi (bkz. [01-vizyon-ve-kararlar.md](01-vizyon-ve-kararlar.md)).
- Roblox resmi API'leri test edildi:
  - explore-api sort'ları, games, votes çalışıyor.
  - Gamepass için yeni endpoint (`apis.roblox.com/game-passes/v1/...`) bulundu; eski endpoint ölü.
- Apify key doğrulandı. Store'daki Roblox actor'leri incelendi ve kullanılmamasına karar verildi (ADR #2).
- Next.js 16.4 + Tailwind v4 projesi kuruldu.
  - Bağımlılıklar: next-themes, recharts, lucide-react, clsx, tailwind-merge, @supabase/supabase-js, @supabase/ssr, @google/genai, @tiptap/*.
- `docs/` klasörü oluşturuldu, referans görseller `docs/referans/` altına kopyalandı.
- Git deposu başlatıldı, remote `deneme401/roblox-panel` eklendi.

**Sıradaki**
- Faz 1: tasarım token'ları, layout (sidebar + topbar + tema), bileşen vitrini `/dev/ui`.

**Kullanıcıdan beklenenler**
- Supabase projesi (URL, anon key, service role key).
- Gemini API key.
- İki kullanıcının e-postası ve görünen adları.
- Vercel hesabı (Faz 9).
