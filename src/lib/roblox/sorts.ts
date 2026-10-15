// Keşif listesi kimlikleri ve etiketleri (istemci bileşenleri de kullanır; DB/ağ kodu içermez).
export const SORT_IDS = ["top-trending", "up-and-coming", "top-playing-now", "fun-with-friends", "top-revisited"] as const;
export type SortId = (typeof SORT_IDS)[number];

export const SORT_LABELS: Record<SortId, string> = {
  "top-trending": "En Trend",
  "up-and-coming": "Yükselen (son 28 gün)",
  "top-playing-now": "Şu An En Çok Oynanan",
  "fun-with-friends": "Arkadaşlarla",
  "top-revisited": "En Çok Geri Dönülen",
};
