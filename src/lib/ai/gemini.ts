// Gemini model zinciri (ADR #4). GEMINI_MODELS sırayla denenir; kota (429), sunucu hatası (5xx),
// bulunamayan model (404) veya zaman aşımında bir sonrakine geçilir. Kullanılan model sonuçla döner.
import { ApiError, GoogleGenAI, type Schema } from "@google/genai";
import { sql } from "@/lib/db";

export const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const TIMEOUT_MS = 45_000;

export function geminiModels() {
  const env = process.env.GEMINI_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  return env?.length ? env : DEFAULT_MODELS;
}

export function hasGemini() {
  return Boolean(process.env.GEMINI_API_KEY);
}

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY tanımlı değil. Ayarlar sayfasındaki adımlara bakın.");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

function shouldFallback(e: unknown) {
  if (e instanceof ApiError) return e.status === 429 || e.status === 404 || e.status >= 500;
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /abort|timeout|timed out|fetch failed|ECONNRESET/i.test(msg);
}

export type AiResult<T> = { data: T; model: string; tried: { model: string; error: string }[] };

/** JSON şemalı üretim; zincirdeki ilk başarılı modelin cevabını döndürür. */
export async function generateJson<T>(kind: string, prompt: string, schema: Schema, system?: string): Promise<AiResult<T>> {
  const tried: { model: string; error: string }[] = [];
  for (const model of geminiModels()) {
    const started = Date.now();
    try {
      const res = await ai().models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.4,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        },
      });
      const text = res.text;
      if (!text) throw new Error("boş cevap");
      const data = JSON.parse(text) as T;
      await logCall(kind, model, true, null, Date.now() - started);
      return { data, model, tried };
    } catch (e) {
      const error = e instanceof ApiError ? `${e.status}: ${e.message.slice(0, 160)}` : e instanceof Error ? e.message.slice(0, 160) : String(e);
      tried.push({ model, error });
      await logCall(kind, model, false, error, Date.now() - started);
      if (!shouldFallback(e) && !(e instanceof SyntaxError)) break;
    }
  }
  throw new Error(`Hiçbir model cevap vermedi: ${tried.map((t) => `${t.model} (${t.error})`).join("; ")}`);
}

async function logCall(kind: string, model: string, ok: boolean, error: string | null, ms: number) {
  await sql`insert into ai_calls (kind, model, ok, error, ms) values (${kind}, ${model}, ${ok}, ${error}, ${ms})`.catch(() => {});
}

/** Anahtarın erişebildiği modeller (Ayarlar → "Modelleri doğrula"). */
export async function listAvailableModels() {
  const out: string[] = [];
  const pager = await ai().models.list({ config: { pageSize: 100 } });
  for await (const m of pager) {
    if (m.name && m.supportedActions?.includes("generateContent")) out.push(m.name.replace(/^models\//, ""));
  }
  return out;
}
