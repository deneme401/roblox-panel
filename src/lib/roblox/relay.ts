// Roblox'a doğrudan erişilemeyen ağlar için (ör. Türkiye'deki geliştirme makinesi) GET isteklerini
// Supabase'in pg_net uzantısı üzerinden yapar: istek Sidney'deki DB sunucusundan çıkar.
// Açmak için .env.local: ROBLOX_RELAY=pgnet. Canlıda (Vercel syd1) gerek yok. ADR #14.
import { sql } from "@/lib/db";

export function relayEnabled() {
  return process.env.ROBLOX_RELAY === "pgnet";
}

export async function relayGet(url: string, timeoutMs = 20_000): Promise<{ status: number; body: string }> {
  const [{ id }] = await sql<{ id: number }[]>`
    select net.http_get(${url}, headers := ${sql.json({ accept: "application/json" })}::jsonb,
      timeout_milliseconds := ${timeoutMs}) as id`;
  const deadline = Date.now() + timeoutMs + 10_000;
  let wait = 300;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, wait));
    wait = Math.min(wait * 1.5, 1500);
    const [r] = await sql<{ statusCode: number | null; content: string | null; errorMsg: string | null; timedOut: boolean | null }[]>`
      select status_code, content, error_msg, timed_out from net._http_response where id = ${id}`;
    if (!r) continue;
    if (r.errorMsg || r.timedOut || r.statusCode == null) throw new Error(`pg_net: ${r.errorMsg ?? "zaman aşımı"} (${url})`);
    return { status: r.statusCode, body: r.content ?? "" };
  }
  throw new Error(`pg_net: yanıt gelmedi (${url})`);
}
