// Scriptler için .env.local okuyucu (process.env önceliklidir).
import fs from "node:fs";

export function loadEnv() {
  const out = {};
  if (fs.existsSync(".env.local")) {
    for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return { ...out, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^[A-Z0-9_]+$/.test(k))) };
}
