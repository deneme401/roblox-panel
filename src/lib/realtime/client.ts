"use client";

// Supabase Realtime: yalnızca "broadcast" (değişiklik bildirimi) ve "presence" (kim çevrimiçi).
// Tablo verisi bu kanaldan geçmez; değişiklik gelince sayfa sunucudan yenilenir (router.refresh).
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

type Listener = (topic: string) => void;
type PresenceListener = (online: string[]) => void;

let channel: RealtimeChannel | null = null;
const listeners = new Set<Listener>();
const presenceListeners = new Set<PresenceListener>();
let online: string[] = [];

function ensure(member: string) {
  if (channel) return channel;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  channel = supabase.channel("rr-workspace", { config: { presence: { key: member }, broadcast: { self: false } } });
  channel
    .on("broadcast", { event: "changed" }, ({ payload }) => listeners.forEach((l) => l(String(payload?.topic ?? ""))))
    .on("presence", { event: "sync" }, () => {
      online = Object.keys(channel!.presenceState());
      presenceListeners.forEach((l) => l(online));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") channel!.track({ member, at: Date.now() });
    });
  return channel;
}

export function connectRealtime(member: string) {
  ensure(member);
}

/** Diğer kullanıcıya "şu konu değişti" haberi gönderir. */
export function notifyChange(topic: string) {
  channel?.send({ type: "broadcast", event: "changed", payload: { topic } });
}

export function onChange(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function onPresence(l: PresenceListener) {
  presenceListeners.add(l);
  l(online);
  return () => void presenceListeners.delete(l);
}
