"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { MEMBERS } from "@/lib/auth/members";
import { onPresence } from "@/lib/realtime/client";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";

export function TeamPresence({ me }: { me: string }) {
  const [online, setOnline] = useState<string[]>([]);
  useEffect(() => onPresence(setOnline), []);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Object.values(MEMBERS).map((m) => {
          const isOn = m.id === me || online.includes(m.id);
          return (
            <span
              key={m.id}
              title={`${m.name}${m.id === me ? " (sen)" : ""} · ${isOn ? "çevrimiçi" : "çevrimdışı"}`}
              className="relative grid size-9 place-items-center rounded-full border-2 border-bg text-xs font-bold text-white"
              style={{ background: m.color }}
            >
              {m.name[0]}
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-bg", isOn ? "bg-pos" : "bg-muted")} />
            </span>
          );
        })}
      </div>
      <form action={logout}>
        <button className="grid size-9 place-items-center rounded-full bg-surface text-muted shadow-card hover:text-fg" title="Çıkış / kullanıcı değiştir">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
