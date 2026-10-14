// AI görevleri: fikir değerlendirme, oyun analizi, otomatik tür etiketleme. Çıktılar Türkçe ve JSON.
// JSON anahtarları camelCase: db.ts (postgres.camel) okurken jsonb anahtarlarını da camelCase yapar.
import { Type, type Schema } from "@google/genai";
import { sql } from "@/lib/db";
import { generateJson } from "./gemini";
import type { JobResult } from "@/lib/collect/jobs";

const SYSTEM =
  "Sen Roblox pazarını veriyle analiz eden kıdemli bir oyun tasarımcısı ve ürün stratejistisin. " +
  "İki kişilik küçük bir ekibe danışmanlık veriyorsun: gerçekçi, kısa ve uygulanabilir ol. " +
  "Verilen metriklere dayan; veri yoksa bunu açıkça söyle. Tüm metinler Türkçe olsun.";

const str = { type: Type.STRING };
const strArr = { type: Type.ARRAY, items: str };
const int = { type: Type.INTEGER };

export type IdeaEval = {
  verdict: "güçlü" | "orta" | "zayıf";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  similarGames: string[];
  mvp: string[];
  monetization: string[];
  risks: string[];
  riskScore: number;
  demandScore: number;
  competitionScore: number;
};

const ideaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING, enum: ["güçlü", "orta", "zayıf"] },
    summary: str,
    strengths: strArr,
    weaknesses: strArr,
    similarGames: strArr,
    mvp: { ...strArr, description: "2-4 haftada yapılabilecek MVP adımları" },
    monetization: strArr,
    risks: strArr,
    riskScore: { ...int, description: "1 (düşük risk) - 10 (çok riskli)" },
    demandScore: { ...int, description: "1-5 talep" },
    competitionScore: { ...int, description: "1-5 rekabet doygunluğu (5 = çok doygun)" },
  },
  required: ["verdict", "summary", "strengths", "weaknesses", "similarGames", "mvp", "monetization", "risks", "riskScore", "demandScore", "competitionScore"],
};

type CompetitorRow = {
  name: string;
  genre: string | null;
  playing: number | null;
  growth24h: number | null;
  growth7d: number | null;
  ageDays: number | null;
  likeRatio: number | null;
  passCount: number;
  avgPrice: number | null;
};

async function competitorContext(ids: number[]) {
  if (!ids.length) return [];
  return sql<CompetitorRow[]>`
    select g.name, g.genre, m.playing, m.growth_24h, m.growth_7d, round(m.age_days) as age_days, round(m.like_ratio, 3) as like_ratio,
      (select count(*) from game_passes p where p.universe_id = g.universe_id and p.is_for_sale)::int as pass_count,
      (select round(avg(price)) from game_passes p where p.universe_id = g.universe_id and p.is_for_sale and price > 0) as avg_price
    from games g left join game_metrics m using (universe_id)
    where g.universe_id in ${sql(ids)}`;
}

async function marketContext() {
  return sql<{ genre: string; games: number; playing: number; avgRise: number }[]>`
    select coalesce(genre, 'Türsüz') as genre, count(*)::int as games, sum(playing)::int as playing, round(avg(rise_score), 1) as avg_rise
    from game_metrics m
    where m.universe_id in (select universe_id from sort_presence where sort_id = 'up-and-coming' and last_seen_at > now() - interval '2 days')
    group by 1 order by 3 desc limit 12`;
}

export async function evaluateIdea(ideaId: string) {
  const [idea] = await sql<{ title: string; pitch: string; genre: string | null; scores: Record<string, number> }[]>`
    select title, pitch, genre, scores from ideas where id = ${ideaId}`;
  if (!idea) throw new Error("Fikir bulunamadı");
  const links = await sql<{ universeId: number }[]>`select universe_id from idea_games where idea_id = ${ideaId}`;
  const [competitors, market] = await Promise.all([competitorContext(links.map((l) => l.universeId)), marketContext()]);
  const prompt = [
    `## Fikir\nBaşlık: ${idea.title}\nTür: ${idea.genre ?? "belirtilmedi"}\nAçıklama: ${idea.pitch || "(boş)"}`,
    `Ekibin kendi puanları (1-5): ${JSON.stringify(idea.scores)}`,
    `## Bağlı rakipler (canlı metrikler; growth oran, 0.1 = %10)\n${competitors.length ? JSON.stringify(competitors) : "Rakip bağlanmadı."}`,
    `## Pazar: son 28 günde çıkıp yükselen oyunların tür dağılımı\n${JSON.stringify(market)}`,
    "Bu fikri değerlendir. Benzer oyunlara Roblox'ta bilinen örnekleri yaz. MVP adımları 2 kişilik ekip için gerçekçi olsun.",
  ].join("\n\n");
  const res = await generateJson<IdeaEval>("idea-eval", prompt, ideaSchema, SYSTEM);
  await sql`
    update ideas set ai_eval = ${sql.json(res.data)}, ai_model = ${res.model}, ai_evaluated_at = now(), updated_at = now()
    where id = ${ideaId}`;
  return res;
}

export type GameAnalysis = {
  whyRising: string;
  coreLoop: string;
  monetization: string;
  audience: string;
  lessons: string[];
  tags: string[];
};

const gameSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    whyRising: { ...str, description: "Neden ilgi görüyor / yükseliyor (veriye dayanarak)" },
    coreLoop: { ...str, description: "Tahmini çekirdek oyun döngüsü" },
    monetization: { ...str, description: "Gamepass yapısı ve fiyatlandırma yorumu" },
    audience: str,
    lessons: { ...strArr, description: "Ekibimizin bu oyundan çıkarabileceği 3-5 ders" },
    tags: { ...strArr, description: "3-6 kısa alt tür etiketi, Türkçe, küçük harf" },
  },
  required: ["whyRising", "coreLoop", "monetization", "audience", "lessons", "tags"],
};

export async function analyzeGame(universeId: number) {
  const [g] = await sql<{ name: string; description: string | null; genre: string | null; subgenre: string | null; maxPlayers: number | null }[]>`
    select name, description, genre, subgenre, max_players from games where universe_id = ${universeId}`;
  if (!g) throw new Error("Oyun veritabanında yok");
  const [metrics] = await competitorContext([universeId]);
  const passes = await sql<{ name: string; price: number | null }[]>`
    select name, price from game_passes where universe_id = ${universeId} and is_for_sale order by price nulls last limit 30`;
  const history = await sql<{ day: string; avgPlaying: number }[]>`
    select day::text, avg_playing from game_daily where universe_id = ${universeId} order by day desc limit 14`;
  const prompt = [
    `## Oyun: ${g.name}\nTür: ${g.genre ?? "-"} / ${g.subgenre ?? "-"} · Sunucu kapasitesi: ${g.maxPlayers ?? "-"}`,
    `Açıklama:\n${(g.description ?? "").slice(0, 2500)}`,
    `Metrikler: ${JSON.stringify(metrics ?? {})}`,
    `Günlük ortalama oyuncu (yeniden eskiye): ${JSON.stringify(history)}`,
    `Gamepass'ler (Robux): ${JSON.stringify(passes)}`,
  ].join("\n\n");
  const res = await generateJson<GameAnalysis>("game-analysis", prompt, gameSchema, SYSTEM);
  await sql`
    update games set ai_analysis = ${sql.json(res.data)}, ai_model = ${res.model}, ai_analyzed_at = now(),
      ai_tags = ${res.data.tags.slice(0, 6)}
    where universe_id = ${universeId}`;
  return res;
}

/** Açıklamasından alt tür etiketi çıkarılmamış oyunları toplu etiketler (günlük iş). */
export async function tagGames(limit: number): Promise<JobResult> {
  const games = await sql<{ universeId: number; name: string; genre: string | null; description: string | null }[]>`
    select g.universe_id, g.name, g.genre, g.description
    from games g join game_metrics m using (universe_id)
    where cardinality(g.ai_tags) = 0 and g.description is not null
    order by m.rise_score desc nulls last limit ${limit}`;
  if (!games.length) return { rows: 0, message: "etiketlenecek oyun yok" };
  const schema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.OBJECT, properties: { id: int, tags: strArr }, required: ["id", "tags"] },
  };
  const prompt =
    "Her oyun için 2-4 kısa alt tür etiketi üret (Türkçe, küçük harf; ör. 'tycoon', 'korku', 'anime dövüş', 'evcil hayvan toplama', 'obby').\n\n" +
    JSON.stringify(games.map((g) => ({ id: g.universeId, name: g.name, genre: g.genre, description: (g.description ?? "").slice(0, 400) })));
  const res = await generateJson<{ id: number; tags: string[] }[]>("tag-games", prompt, schema, SYSTEM);
  let rows = 0;
  for (const t of res.data) {
    if (!games.some((g) => g.universeId === t.id) || !t.tags?.length) continue;
    await sql`update games set ai_tags = ${t.tags.slice(0, 4).map((x) => x.toLowerCase())} where universe_id = ${t.id}`;
    rows++;
  }
  return { rows, message: `${rows} oyun etiketlendi (${res.model})` };
}
