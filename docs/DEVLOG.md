# Geliştirme Günlüğü

En yeni giriş en üstte.

---

## 2026-10-14 — Oturum 1 (devam 2): Faz 2–8 + Faz 9 hazırlığı

**Kullanıcıdan gelenler:** Supabase bilgileri (URL, publishable key, DB bağlantısı). "Mail gerek yok, isimler Yusuf ve Mertcan." "Fazlar bitene kadar durma."

**Yapılanlar**
- **Faz 2:** Şema (`supabase/migrations/0001–0004`), `scripts/migrate.mjs`, sunucu tarafı `postgres` istemcisi (ADR #8). İsim seçimli giriş + imzalı çerez + `proxy.ts` (ADR #9). Üst barda ekip avatarları + Realtime presence.
- **Faz 3:** `lib/collect/jobs.ts` (saatlik liste+snapshot, gamepass, rollup), `/api/cron/[job]` (Bearer CRON_SECRET), `game_metrics` view + yükseliş skoru. İlk toplama: 301 oyun, 303 gamepass.
- **Faz 4:** Pano (nabız grafiği, yeni girenler, sinyal ve aktivite akışı), Trendler (24s/7g/skor/sparkline, niş ısı tablosu, link ile oyun ekleme), Oyun Detay (Gün/Hafta/Ay grafiği, günlük ziyaret, liste/güncelleme geçmişi, takip, notlar, yorumlar, AI).
- **Faz 5:** Kıyaslama (çoklu çizgi ham/endeks, radar, metrik tablosu, monetizasyon, kayıtlı setler).
- **Faz 6:** Fikir kanbanı (sürükle-bırak), fikir detayı (puan matrisi, rakip bağlama), TipTap notlar (otomatik kayıt, etiket, sabitleme), yorumlar, aktivite, Realtime broadcast ile anlık yenileme (ADR #10).
- **Faz 7:** Gemini zinciri (`lib/ai/gemini.ts`), fikir değerlendirme, oyun analizi, toplu etiketleme, `ai_calls` istatistiği. **Anahtar yok → gerçek çağrı test edilmedi.**
- **Faz 8:** Apify actor'leri seçildi ve denendi (`docs/03`), `lib/collect/signals.ts`, Sinyaller sayfası. İlk gerçek çalışma: 24 sinyal.
- **Faz 9 (hazırlık):** `vercel.json` (syd1), `scripts/setup-cron.mjs` (pg_cron + pg_net + Vault), pg_cron/pg_net uzantıları açıldı. Deploy kullanıcı hesabı gerektirdiği için bekliyor.

**Doğrulama**
- `tsc`, `eslint`, `next build` temiz.
- Prod sunucu (3124) ile: giriş, Pano, Trendler, Oyun Detay ekran görüntüsüyle; tüm sayfalar oturum çereziyle curl → 200 ve içerik var.
- Takibe alma, fikir oluşturma, puanlama, yorum, not otomatik kaydı DB'de doğrulandı. Realtime broadcast + presence Node'dan iki istemciyle doğrulandı. Cron route'u 401/200 doğru.
- Test sırasında oluşturulanlar: "Blox Fruits benzeri" fikri (yorum + puanlar), bir test notu, Blox Fruits takipte. İsterseniz silebilirsiniz.

**Öğrenilenler / tuzaklar**
- Supabase doğrudan bağlantı yalnızca IPv6; Vercel için transaction pooler (`aws-0-ap-southeast-2…:6543`, kullanıcı `postgres.<ref>`) şart.
- `postgres.camel` jsonb anahtarlarını da camelCase'e çeviriyor → AI JSON anahtarları camelCase.
- Cache Components: `"use cache"` ve prerender içinde `Date.now()` yasak; `getMember()` içinde `connection()` olmadan oturum süresi kontrolü bile hataya düşüyor ve Server Action sonrası yenilemeyi bozuyordu.
- İstemci bileşeni DB'li modülden sabit import edince build `perf_hooks` hatası verir → `workspace-shared.ts`.
- Reddit JSON API'si bu IP'den engelli; Apify ile alınıyor.
- Chrome sekmesi arka plandayken (`visibilityState=hidden`) ekran görüntüsü/tıklama takılıyor; test JS ile yapıldı.
- Port 3123'te kullanıcının başlattığı bozuk bir `next dev` süreci var (Jest worker hatası); dokunulmadı.

**Sıradaki (kullanıcı adımları)**
1. Vercel'e import + env değişkenleri + `APP_PASSWORD` (docs/07).
2. `node scripts/setup-cron.mjs https://<adres>` ile zamanlama.
3. Gemini anahtarı → `.env.local` ve Vercel; Ayarlar'dan model doğrulama.

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
