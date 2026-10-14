"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/lib/actions";
import { useAction } from "@/components/ui/toast";
import { MEMBERS, isMemberId } from "@/lib/auth/members";
import { timeAgo } from "@/lib/utils";

type C = { id: string; body: string; author: string | null; createdAt: Date | string };

/** Oyun/fikir altındaki kısa yorumlaşma alanı. */
export function CommentThread({ entityType, entityId, comments, me }: { entityType: string; entityId: string; comments: C[]; me: string | null }) {
  const [text, setText] = useState("");
  const { pending, run } = useAction();
  return (
    <div className="space-y-3">
      {comments.length === 0 && <p className="text-sm text-muted">Henüz yorum yok.</p>}
      <ul className="space-y-2">
        {comments.map((c) => {
          const m = isMemberId(c.author) ? MEMBERS[c.author] : null;
          return (
            <li key={c.id} className="group flex gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: m?.color ?? "var(--muted)" }}>
                {m?.name[0] ?? "?"}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl bg-inset px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{m?.name ?? "—"}</span>
                  <span className="text-muted">{timeAgo(c.createdAt)}</span>
                  {c.author === me && (
                    <button
                      onClick={() => run(() => deleteComment(c.id))}
                      className="ml-auto text-muted opacity-0 transition group-hover:opacity-100 hover:text-neg"
                      aria-label="Yorumu sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          run(() => addComment(entityType, entityId, text), { onDone: () => setText("") });
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
          }}
          rows={2}
          placeholder="Yorum yaz… (Ctrl+Enter gönderir)"
          className="min-h-11 flex-1 resize-y rounded-2xl bg-inset px-4 py-2.5 text-sm outline-none ring-accent focus:ring-2"
        />
        <button disabled={pending || !text.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40" aria-label="Gönder">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
