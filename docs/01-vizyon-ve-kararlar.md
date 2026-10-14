# 01 — Vizyon ve Kararlar

## Amaç
İki kişilik ekip Roblox için oyun geliştirecek. Panel, şu üç soruyu veriye dayalı cevaplamamızı sağlamalı:
1. **Neyi yapmalıyız?** Yükselen türler/nişler ve yeni çıkan başarılı oyunlar.
2. **Kime karşı yarışacağız?** Rakiplerin metrikleri, monetizasyonu ve güncelleme sıklığı.
3. **Bu fikir tutar mı?** Puanlama, rakip bağlama ve AI değerlendirmesi.

Bunun yanında iki kişinin birlikte not aldığı, fikir geliştirdiği ortak bir çalışma alanı (workspace) olacak.

## Kullanıcıyla netleşen kararlar (2026-10-14)

| Konu | Karar |
|---|---|
| Barındırma | **Bulut**: Vercel (Next.js) + Supabase (Postgres, Auth, Realtime). İki kişi URL'den giriş yapar. |
| Kod deposu | https://github.com/deneme401/roblox-panel.git — Vercel bu repoya bağlanacak. |
| Tema | **Açık + koyu**, geçiş düğmesiyle. Açık tema referans 1-2'den, koyu tema referans 3'ten esinlenir. |
| Cihaz | **Masaüstü öncelikli**; mobilde de düzgün çalışır. |
| Özellikler | Hepsi: trend/yükselen oyunlar, rakip kıyaslama, fikir değerlendirme + AI, dış sinyaller (YouTube/TikTok/Reddit). |
| Veri sıklığı | Roblox resmi API'leri **saatlik** (ücretsiz), Apify **günlük**. |
| AI | **Gemini** (ücretsiz katman). 3 güncel ücretsiz model sırayla denenir; limit dolarsa veya zaman aşımı olursa sıradakine geçilir. |
| Tür odağı | Henüz yok. **Veri karar versin**: panel türleri sınıflandırır ve en hızlı büyüyen nişleri gösterir. |
| Apify | Kullanıcının key'i mevcut, `.env.local` içinde. Roblox dışı veri için de kullanılabilir. |

## Kapsam dışı (şimdilik)
- Roblox Studio entegrasyonu / oyun içi analitik (kendi oyunumuz yayına girince ayrıca düşünülecek).
- 2'den fazla kullanıcı, rol yönetimi.

## Güvenlik notu
Apify key sohbette düz metin olarak paylaşıldı. Proje stabil olduğunda Apify konsolundan key'in yenilenmesi önerilir.
