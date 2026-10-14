"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { MEMBERS, type MemberId } from "@/lib/auth/members";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { login } from "./actions";

export function LoginForm({ needsPassword }: { needsPassword: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [member, setMember] = useState<MemberId | null>(null);
  const next = useSearchParams().get("next") ?? "/";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="member" value={member ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        {Object.values(MEMBERS).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMember(m.id)}
            aria-pressed={member === m.id}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-[var(--radius-inset)] bg-inset p-5 transition",
              member === m.id ? "ring-2 ring-accent" : "hover:brightness-95 dark:hover:brightness-110",
            )}
          >
            <span className="grid size-14 place-items-center rounded-full text-xl font-bold text-white" style={{ background: m.color }}>
              {m.name[0]}
            </span>
            <span className="text-sm font-semibold">{m.name}</span>
            {member === m.id && (
              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-accent text-accent-fg">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
      {needsPassword && (
        <input
          type="password"
          name="password"
          placeholder="Ekip şifresi"
          autoComplete="current-password"
          className="h-11 w-full rounded-full bg-inset px-5 text-sm outline-none ring-accent focus:ring-2"
        />
      )}
      {state?.error && <p className="text-center text-sm text-neg">{state.error}</p>}
      <Button type="submit" disabled={!member || pending} className="w-full">
        {pending ? "Giriliyor…" : "Devam et"}
      </Button>
    </form>
  );
}
