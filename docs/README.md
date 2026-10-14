# RoRadar — Proje Dokümantasyonu

> **Yeni bir oturuma başlıyorsan önce bunu oku**, sonra `DEVLOG.md`'nin son girişine bak.
> Proje ile ilgili her karar, değişiklik ve öğrenilen bilgi bu klasöre kaydedilir.

RoRadar, iki kişilik ekibimizin Roblox oyun geliştirme sürecinde kullandığı analiz paneli ve ortak çalışma alanıdır:
- Yükselen oyunları izler.
- Rakipleri kıyaslar.
- Fikirleri puanlar ve AI ile değerlendirir.
- Sosyal medya sinyallerini toplar.
- Ortak notları tutar.

## İçindekiler

| Dosya | İçerik |
|---|---|
| [01-vizyon-ve-kararlar.md](01-vizyon-ve-kararlar.md) | Amaç, kapsam, kullanıcıyla netleşen tüm kararlar |
| [02-mimari.md](02-mimari.md) | Teknoloji yığını, klasör yapısı, veri akışı |
| [03-veri-kaynaklari.md](03-veri-kaynaklari.md) | Roblox API endpoint'leri, Apify actor'leri, test sonuçları, maliyet |
| [04-veritabani.md](04-veritabani.md) | Supabase şeması, tablolar, RLS |
| [05-tasarim-sistemi.md](05-tasarim-sistemi.md) | Referans görsel analizi, renk/tipografi token'ları, bileşenler |
| [06-ozellikler.md](06-ozellikler.md) | Sayfalar ve özellikler, durumları |
| [07-kurulum-ve-deploy.md](07-kurulum-ve-deploy.md) | Lokal kurulum, env değişkenleri, Vercel/Supabase deploy |
| [KARARLAR.md](KARARLAR.md) | Mimari karar kayıtları (ADR) |
| [DEVLOG.md](DEVLOG.md) | Tarihli geliştirme günlüğü |
| [referans/](referans/) | UI referans görselleri |

## Faz durumu

| Faz | Konu | Durum |
|---|---|---|
| 0 | Proje iskeleti, docs, git | ✅ |
| 1 | Tasarım sistemi + layout + bileşen vitrini | ✅ |
| 2 | Supabase şema, auth, allowlist | ⬜ (Supabase bilgileri bekleniyor) |
| 3 | Roblox toplayıcıları + metrikler | ⬜ |
| 4 | Pano, Trendler, Oyun Detay | 🟡 canlı API ile çalışıyor; büyüme/geçmiş DB bekliyor |
| 5 | Kıyaslama | ⬜ |
| 6 | Workspace: notlar, fikirler, realtime | ⬜ |
| 7 | Gemini AI katmanı | ⬜ (Gemini key bekleniyor) |
| 8 | Apify sinyalleri | ⬜ |
| 9 | Deploy + zamanlama | ⬜ |

## Kurallar
- Gizli anahtarlar (API key, token, şifre) **asla** docs'a ya da git'e yazılmaz; yalnızca `.env.local` ve Vercel env içinde tutulur.
- Her anlamlı değişiklikten sonra:
  - `DEVLOG.md`'ye tarihli bir giriş eklenir.
  - İlgili docs dosyası güncellenir.
  - Bu README'deki faz tablosu güncellenir.
- Next.js 16 kullanılıyor; kod yazmadan önce `node_modules/next/dist/docs/` içindeki ilgili rehbere bakılır (bkz. `AGENTS.md`).
