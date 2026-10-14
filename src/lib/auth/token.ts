// İmzalı oturum çerezi: "<üye>.<bitiş-ms>.<hmac>". Web Crypto kullanır; proxy'de de çalışır.
import { isMemberId, type MemberId } from "./members";

export const SESSION_COOKIE = "rr_session";
export const SESSION_DAYS = 60;

const enc = new TextEncoder();

async function hmac(data: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET tanımlı değil");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(member: MemberId) {
  const payload = `${member}.${Date.now() + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token: string | undefined): Promise<MemberId | null> {
  if (!token) return null;
  const [member, exp, sig] = token.split(".");
  if (!isMemberId(member) || !exp || !sig || Number(exp) < Date.now()) return null;
  return (await hmac(`${member}.${exp}`)) === sig ? member : null;
}
