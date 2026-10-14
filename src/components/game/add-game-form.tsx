"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addGame } from "@/lib/actions";
import { useAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Roblox linki / ID ile oyunu takibe alır ve detay sayfasına götürür. */
export function AddGameForm({ className, navigate = true }: { className?: string; navigate?: boolean }) {
  const [value, setValue] = useState("");
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <form
      className={cn("flex h-11 items-center gap-1 rounded-full bg-surface pl-4 pr-1 shadow-card dark:border dark:border-line", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        run(() => addGame(value), {
          success: "Oyun takibe alındı",
          onDone: (d) => {
            setValue("");
            if (navigate && d) router.push(`/games/${d.universeId}`);
          },
        });
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Roblox linki veya ID ile oyun ekle"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <button
        disabled={pending || !value.trim()}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40"
        aria-label="Ekle"
      >
        <Plus className={cn("size-4", pending && "animate-spin")} />
      </button>
    </form>
  );
}
