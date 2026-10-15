# Geliştirme Günlüğü

En yeni giriş en üstte.

---

## 2026-10-15 — Oturum 2 (devam 3): Tümünü güncelle, yeni oyunlar, toplu ve otomatik takip

**İstek:** "Bütün verileri güncelle" düğmesi; yeni oyunları görebilmek; yeni trend oyunların hepsini takip edebilmek.

**Yapılanlar**
- `0006_auto_track.sql`: `app_settings` (key → jsonb, RLS kapalı kapı) + `games.tracked_auto`. Varsayılan `auto_track = {enabled:false, sorts:[top-trending, up-and-coming]}`.
- **Tümünü güncelle** (`components/layout/refresh-all.tsx`, her sayfanın üst barında): saatlik işi hemen çalıştırır (listeler + tüm oyunların snapshot'ı + yeni oyunlar + otomatik takip), sonucu bildirimde gösterir.
- `collectHourly`: mesajda "N yeni oyun" (bu çalışmada `first_seen_at` alan oyunlar, DB saatiyle); otomatik takip açıksa seçili listelerdeki takipsiz oyunlar `tracked=true, tracked_auto=true`.
- **Trendler:** "Yeni (N)" filtresi (`?new=1` ile de açılır) ve satırda YENİ rozeti: son 72 saatte ilk kez görülen, ilk toplamadaki toplu giriş hariç. Satır seçimi (onay kutuları, başlıkta tümünü seç), "Seçilenleri takibe al / Takipten çıkar", "Görünenlerin hepsini takibe al (N)" (filtreyle birlikte: ör. Yükselen listesi + Yeni → hepsini takibe al). Otomatik takiptekiler içi boş ☆.
- `setTrackedMany` (en fazla 1000), `saveAutoTrackAction` Server Action'ları; elle takip `tracked_auto=false` yapar.
- **Ayarlar → Takip listesi:** otomatik takip anahtarı + hangi listeler; liste sayılı, oyuncuya göre sıralı, kaydırılabilir, "☆ otomatik / ★ kişi".

---

## 2026-10-15 — Oturum 2 (devam 2): Gemini model zinciri güncellendi

- Kullanıcı Gemini anahtarını ekledi; tüm modeller 404 verdi ("no longer available to new users").
- `models.list` + deneme çağrılarıyla doğrulandı: 3.5-flash ve 3.5-flash-lite cevap veriyor, 3.8/3.7/3.6-flash mevcut ama o an 503 (yoğunluk).
- `DEFAULT_MODELS` → `gemini-3.8-flash, gemini-3.5-flash, gemini-3.5-flash-lite`; zincirin sonuna `gemini-flash-latest`, `gemini-flash-lite-latest` takma adları otomatik eklenir. `.env.example` güncellendi.
- Uçtan uca test: Blox Fruits oyun analizi → 3.8 (503) → 3.5 (503) → **3.5-flash-lite ✓**, toplam ~20 sn. Faz 7 ✅.
- Not: Vercel'de `GEMINI_MODELS` girilirse yeni değerler kullanılmalı (ya da boş bırakılmalı).

---

## 2026-10-15 — Oturum 2 (devam): Güncel oyuncu sayıları (pg_net aktarımı)

**Sorun:** Oyun sayıları ~1 gün eskiydi (son toplama 14 Ekim 19:00 UTC); bu makineden Roblox'a erişilemediği için toplama çalışmıyordu.

**Yapılanlar**
- Test: Supabase'in `pg_net` uzantısıyla (`net.http_get`) DB sunucusundan Roblox'a istek → 200. Sidney'den erişim var.
- `src/lib/roblox/relay.ts`: `ROBLOX_RELAY=pgnet` ise `client.ts`'deki tüm Roblox GET'leri pg_net üzerinden (istek → `net._http_response` artan aralıklarla yoklanır). `.env.local`'a eklendi; canlıda boş bırakılır (ADR #14).
- `src/lib/roblox/sorts.ts`: `SORT_IDS`/`SORT_LABELS` ayrıldı (istemci bileşeni `trends-table` artık DB'li modülü dolaylı import etmiyor). `client.ts` yeniden dışa aktarır.
- Toplayıcı hatası düzeltildi: Roblox bir listede aynı oyunu iki kez döndürünce `sort_presence` upsert'i "ON CONFLICT ... a second time" veriyordu → liste ve detaylar tekilleştiriliyor.
- `games.last_snapshot_at` artık gerçek ölçüm anı (snapshot `ts` saat başına yuvarlı kalır).
- Oyun sayfasına **Güncelle** düğmesi (`refreshGame` Server Action): o oyunun değerlerini anında çekip bu saatin snapshot'ına yazar; yanında "son ölçüm x dk önce".
- Saatlik iş relay ile lokal çalıştırıldı: 284 listede oyun, 385 snapshot, ~36 sn. Blox Fruits 155.252 → 211.084 oyuncu.

- Masaüstü kısayolları: `RoRadar Baslat` / `RoRadar Kapat` → `scripts/baslat.cmd`, `scripts/kapat.cmd` (bkz. 07).

**Not:** Otomatik saatlik toplama hâlâ Vercel deploy + `setup-cron.mjs` bekliyor. O zamana kadar Ayarlar → "Saatlik çalıştır" veya `npx tsx --env-file=.env.local scripts/run-job.mts hourly` ile elle.

---

## 2026-10-15 — Oturum 2: Oyun sayfası hatası + yavaşlık

**Sorun:** Trendler'den oyuna girince hata (digest), Pano/Trendler/Oyun ~10–15 sn.

**Teşhis**
- Bu makineden Roblox API'lerine (`apis.roblox.com`, `games.roblox.com`, `thumbnails.roblox.com`) **hiç bağlanılamıyor** (TCP connect timeout; Türkiye'de Roblox erişim engeli). Önceki oturumda toplama çalışmıştı (o sırada farklı ağ/VPN olabilir).
- `game_metrics` view'ı yalnızca **son 3 saatte** snapshot'ı olan oyunları gösteriyordu. Cron henüz kurulmadığı için veri ~1 gün eskiydi → view boş → sayfalar canlı Roblox'a düştü → 10 sn zaman aşımı → hata.
- DB gecikmesi (TR → Sidney): sorgu başına ~360 ms, yeni bağlantı 2,7 sn (ilk soğuk bağlantı 18 sn). Doğrudan DB adresi (`db.<ref>.supabase.co`, IPv6) bu ağdan çözülmüyor.

**Yapılanlar**
- `0005_metrics_relative.sql`: view her oyunun **en son** snapshot'ını kullanır, büyüme pencereleri o snapshot'ın zamanına göre. Veri eskise de panel dolu kalır (ADR #13).
- Sayfalar artık önce DB'den okur: `getGameBase()` (`lib/data/game.ts`) oyun sayfasının temel bilgisini DB'den verir; canlı API yalnızca oyun DB'de yoksa `tryLive()` ile (5 sn sınır, hata → null) denenir. Trendler/Kıyasla yedekleri de `tryLive`.
- `client.ts` fetch'lerine 15 sn `AbortSignal.timeout`.
- `market.ts`: 4 ardışık sorgu → 3 paralel sorgu; "son 2 gün"/"48 saat" filtreleri `now()` yerine en son veri zamanına göre. `getPulse` sorguları paralel.
- Migration bu ağda pooler üzerinden çalıştırıldı: `DATABASE_URL_DIRECT=<pooler url> node scripts/migrate.mjs`.

**Ölçüm (lokal prod, `next start`):** ilk açılış 2–12 sn (soğuk bağlantı + önbellek boş), sonraki açılışlar 0,4–0,9 sn (oyun sayfası ilk kez 2,6–4,4 sn).

**Not:** Lokal yavaşlığın kalıcı çözümü Vercel `syd1` deploy'u (DB ile aynı bölge). Saatlik toplama da bu makineden Roblox'a erişilemediği için ancak canlıda (pg_cron → Vercel) çalışır.

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
