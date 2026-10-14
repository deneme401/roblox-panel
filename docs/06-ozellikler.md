# 06 — Özellikler ve Sayfalar

| Sayfa | İçerik | Durum |
|---|---|---|
| `/` **Pano** 🟡 | Hero "Pazar Nabzı" (izlenen toplam CCU, 24s değişim) + hızlı aksiyonlar (Oyun Ekle, Kıyasla, Yeni Fikir, Not). "Bugün Yükselenler" kartları. Up-and-Coming'e yeni girenler. Sinyal akışı. Ekip aktivitesi. | 🟡 Canlı: hero (toplam oyuncu), yükselen nişler (türe göre), yükselen oyunlar, en çok oynanan, taze güncellemeler. Eksik: büyüme %, sinyal, aktivite. |
| `/trends` | Filtrelenebilir tablo (liste, tür, yaş, CCU, büyüme) + sparkline. Tür bazlı büyüme ısı haritası (niş keşfi). | 🟡 Canlı tablo: liste/tür/yaş filtresi, arama, sütun sıralama, `?sort=` parametresi. Eksik: sparkline, ısı haritası. |
| `/games/[id]` | Başlık + `+%` rozet. CCU alan grafiği (Gün/Hafta/Ay). Visits/gün taralı barlar. Like donut. Gamepass tablosu. Güncelleme geçmişi. Sosyal bahsedilmeler. Notlar. AI analiz. Takibe al / Kıyasla'ya ekle. | 🟡 Canlı: oyuncu, ziyaret, favori, kapasite, güncelleme, beğeni donut, gamepass bar grafiği + liste, açıklama. Eksik: CCU geçmişi, notlar, AI, takip. |
| `/compare` | 2–5 oyun. Üst üste çizgi grafik (ham/normalize). Metrik tablosu. Monetizasyon kıyası. Radar. Kayıtlı setler. | ⬜ |
| `/ideas` | Kanban (Fikir → Araştırma → Prototip → Elendi). Puan matrisi: talep ve rekabet veriden otomatik; efor, monetizasyon, viralite elle 1–5. Rakip bağlama. Gemini değerlendirmesi. | ⬜ |
| `/notes` | TipTap editör, etiket, sabitleme, oyun/fikir bağlantısı, realtime. | ⬜ |
| `/signals` | YouTube/TikTok/Reddit akışı, oyun eşleşmesi. | ⬜ |
| `/settings` | Takip listesi, iş durumları, AI model durumu, izinli kullanıcılar. | ⬜ |
| `/dev/ui` | Bileşen vitrini (geliştirme). | ✅ |

## AI özellikleri (Gemini)
- **Fikir değerlendirme:** fikir metni ve bağlı rakiplerin metrikleri modele verilir. Çıktı JSON: güçlü yanlar, zayıf yanlar, benzer oyunlar, MVP önerisi, monetizasyon fikirleri, risk puanı.
- **Oyun analizi:** neden yükseliyor, core loop tahmini, monetizasyon yapısı.
- **Otomatik tür etiketleme:** oyun açıklamasından alt tür etiketleri (`ai_tags`).
