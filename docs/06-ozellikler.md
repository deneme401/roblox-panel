# 06 — Özellikler ve Sayfalar

Durum: ✅ çalışıyor ve test edildi · 🟡 yazıldı, tam test edilemedi · ⏳ veri biriktikçe dolacak

| Sayfa | İçerik | Durum |
|---|---|---|
| `/login` | Yusuf / Mertcan seçimi; `APP_PASSWORD` tanımlıysa ekip şifresi. 60 gün geçerli imzalı çerez. | ✅ |
| `/` **Pano** | Hero "Pazar Nabzı": izlenen oyunlarda toplam oyuncu, 24s değişim (aynı oyun kümesiyle), 48 saatlik beyaz alan grafiği, hızlı aksiyonlar. Yükselen nişler (Up-and-Coming türleri + medyan büyüme). Yükseliş skoruna göre ilk 6 oyun. Yükselen listesine yeni girenler (72 saat). Sosyal sinyal akışı. Ekip aktivitesi. En çok oynanan, taze güncellemeler. | ✅ (24s değişim ⏳) |
| `/trends` | Liste/tür/yaş/takip filtresi, arama, sütun sıralama (`?sort=`, `?order=rise`). Sütunlar: oyuncu, 48s sparkline, 24s, 7g, skor, ziyaret, beğeni, yaş, güncelleme. Niş tablosu (ısı haritası: büyüme diverging, skor sequential). Link/ID ile oyun ekleme. | ✅ (büyüme ⏳) |
| `/games/[id]` | Başlık + 24s rozet + AI etiketleri. **Güncelle** (anlık değerleri Roblox'tan çeker, son ölçüm zamanı). Takibe al / Kıyasla / Fikre dönüştür. Metrik kartları (24s, 7g, skor, ziyaret/24s…). Oyuncu grafiği Gün/Hafta/Ay + günlük ziyaret barları. Gamepass grafiği ve listesi ("yeni" pass işareti). Gemini analizi. Notlar, yorumlar. Beğeni donut'u, bağlı fikirler, liste geçmişi, güncelleme geçmişi, sosyal bahsedilmeler, açıklama. DB'de olmayan oyun canlı API'den gösterilir. | ✅ (AI 🟡) |
| `/compare` | 2–5 oyun (arama ile ekle, `?ids=`), çoklu çizgi (Ham / Endeks=100, 7 gün saatlik / 30 gün günlük), radar (6 eksen, gruba göre 0–100), metrik tablosu (en iyi kalın), monetizasyon (pass sayısı, min/medyan/max). Kayıtlı kıyas setleri (`?set=`). | ✅ (sayfa yükleme curl ile; grafik etkileşimi gizli sekme yüzünden görsel test edilemedi) |
| `/ideas` | Kanban (Fikir → Araştırma → Prototip → Elendi), HTML5 sürükle-bırak + sıralama, iyimser güncelleme. Kartta puan, rakip ikonları, not/yorum sayısı, AI işareti. `?new=1` yeni fikir penceresi. | ✅ (sürükle-bırak elle test edilmeli) |
| `/ideas/[id]` | Başlık/tür/açıklama (alandan çıkınca kayıt), aşama düğmeleri, silme (çift tık onayı). Puan matrisi (hero kart): talep & rekabet veriden, efor/monetizasyon/viralite 1–5, toplam 0–100. Rakip bağlama (arama veya Roblox linki). Gemini değerlendirmesi (karar, risk, talep, rekabet, güçlü/zayıf, MVP, monetizasyon, riskler, benzer oyunlar). Notlar, yorumlar. | ✅ (AI 🟡) |
| `/notes` | Sol liste (arama, etiket filtresi, sabitlenenler üstte, oyun/fikir bağlantısı), sağda TipTap editör (başlık, alt başlık, kalın, italik, üstü çizili, kod, listeler, yapılacaklar, alıntı, link, geri al). 900 ms otomatik kayıt, "kaydedildi" durumu, etiket ekle/kaldır, sabitle, sil. Diğer kullanıcının değişikliği anlık yansır; çakışmada uyarı. | ✅ |
| `/signals` | Kaynak sekmeleri, "yalnızca eşleşenler", kartlar (küçük resim, görüntülenme/beğeni/yorum, eşleşen oyun). En çok bahsedilen oyunlar (14 gün). | ✅ |
| `/settings` | İş durumları + elle çalıştır (saatlik/günlük/sinyal), son 15 çalışma. Takip listesi (ekle/çıkar). Gemini zinciri + 24s istatistik + model doğrulama. Ekip. DB doluluk (500 MB). Kurulum kontrol listesi. | ✅ |
| `/dev/ui` | Bileşen vitrini. | ✅ |

**Üst bar:** "Hoş geldin, {isim}", tema düğmesi, iki avatar (Realtime presence ile çevrimiçi noktası), çıkış/kullanıcı değiştir.

## AI özellikleri (Gemini)
- **Fikir değerlendirme:** fikir + rakip metrikleri + Up-and-Coming tür dağılımı → yapılandırılmış JSON.
- **Oyun analizi:** açıklama, metrikler, 14 günlük geçmiş, gamepass'ler → neden yükseliyor, çekirdek döngü, monetizasyon, kitle, dersler, etiketler.
- **Otomatik tür etiketleme:** günlük işte en yüksek skorlu, etiketsiz 25 oyun.
- Kullanılan model ve zaman her sonucun altında gösterilir.
