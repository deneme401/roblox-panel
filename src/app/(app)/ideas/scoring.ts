// Fikir puan matrisi. Talep ve rekabet veriden (bağlı rakipler) otomatik, diğerleri ekip tarafından 1-5.
export const SCORE_FIELDS = [
  { key: "demand", label: "Talep", hint: "Veriden: bağlı rakiplerin oyuncu sayısı ve büyümesi", auto: true, invert: false },
  { key: "competition", label: "Rekabet doygunluğu", hint: "Veriden: büyük rakip sayısı (yüksek = kötü)", auto: true, invert: true },
  { key: "effort", label: "Efor", hint: "2 kişiyle yapım zorluğu (yüksek = kötü)", auto: false, invert: true },
  { key: "monetization", label: "Monetizasyon", hint: "Gamepass/ürün potansiyeli", auto: false, invert: false },
  { key: "virality", label: "Viralite", hint: "TikTok/YouTube'da paylaşılabilirlik", auto: false, invert: false },
] as const;

export type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];

/** 0-100 toplam puan; eksik alanlar hesaba katılmaz. */
export function totalScore(scores: Partial<Record<string, number | null>>) {
  let sum = 0;
  let n = 0;
  for (const f of SCORE_FIELDS) {
    const v = scores[f.key];
    if (v == null) continue;
    sum += f.invert ? 6 - v : v;
    n++;
  }
  return n ? Math.round(((sum / n - 1) / 4) * 100) : null;
}
