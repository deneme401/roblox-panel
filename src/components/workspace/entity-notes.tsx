"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotebookPen, Pin, Plus } from "lucide-react";
import { createNote } from "@/lib/actions";
import { useAction } from "@/components/ui/toast";
import { memberName } from "@/lib/auth/members";
import { timeAgo } from "@/lib/utils";

type N = { id: string; title: string; plain: string; pinned: boolean; updatedBy: string | null; updatedAt: Date | string };

/** Oyuna/fikre bağlı notların listesi ve "yeni not" düğmesi. Notlar /notes editöründe açılır. */
export function EntityNotes({ entityType, entityId, label, notes }: { entityType: "game" | "idea"; entityId: string; label: string; notes: N[] }) {
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <Link key={n.id} href={`/notes?id=${n.id}`} className="block rounded-2xl bg-inset p-3 transition hover:brightness-95 dark:hover:brightness-110">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {n.pinned ? <Pin className="size-3.5 text-warn" /> : <NotebookPen className="size-3.5 text-muted" />}
            <span className="truncate">{n.title}</span>
          </div>
          {n.plain && <p className="mt-1 line-clamp-2 text-xs text-muted">{n.plain}</p>}
          <p className="mt-1 text-[11px] text-muted">
            {memberName(n.updatedBy)} · {timeAgo(n.updatedAt)}
          </p>
        </Link>
      ))}
      <button
        disabled={pending}
        onClick={() =>
          run(() => createNote({ entityType, entityId, title: `${label} notu` }), {
            onDone: (d) => d && router.push(`/notes?id=${d.id}`),
          })
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-3 text-sm font-medium text-muted transition hover:text-fg"
      >
        <Plus className="size-4" /> Yeni not
      </button>
    </div>
  );
}
