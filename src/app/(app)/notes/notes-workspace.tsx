"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, Lightbulb, NotebookPen, Pin, Plus, Search, Trash2 } from "lucide-react";
import { createNote, deleteNote, saveNote } from "@/lib/actions";
import { toast, useAction } from "@/components/ui/toast";
import { notifyChange } from "@/lib/realtime/client";
import { memberName } from "@/lib/auth/members";
import { cn, timeAgo } from "@/lib/utils";
import { NoteEditor } from "./note-editor";

type ListItem = {
  id: string;
  title: string;
  plain: string;
  entityType: "general" | "game" | "idea";
  entityId: string | null;
  entityLabel: string | null;
  pinned: boolean;
  tags: string[];
  updatedBy: string | null;
  updatedAt: string;
};
type FullNote = Omit<ListItem, "entityLabel"> & { content: unknown; createdBy: string | null; createdAt: string };

export function NotesWorkspace({ notes, note, me, autoNew }: { notes: ListItem[]; note: FullNote | null; me: string; autoNew: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const { pending, run } = useAction();
  const created = useRef(false);

  const newNote = () =>
    run(() => createNote({}), { topic: "notes", onDone: (d) => d && router.push(`/notes?id=${d.id}`) });

  useEffect(() => {
    if (autoNew && !created.current) {
      created.current = true;
      newNote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca ilk açılışta
  }, [autoNew]);

  const tags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].sort(), [notes]);
  const filtered = notes.filter((n) => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return (!tag || n.tags.includes(tag)) && (!needle || `${n.title} ${n.plain} ${n.entityLabel ?? ""}`.toLocaleLowerCase("tr").includes(needle));
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-3">
        <div className="flex gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-4 shadow-card dark:border dark:border-line">
            <Search className="size-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Notlarda ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <button onClick={newNote} disabled={pending} className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg shadow-card" aria-label="Yeni not">
            <Plus className="size-5" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t} onClick={() => setTag(tag === t ? null : t)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tag === t ? "bg-accent text-accent-fg" : "bg-surface text-muted shadow-card")}>
                #{t}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[calc(100dvh-260px)] space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="rounded-2xl bg-surface p-4 text-sm text-muted">Not yok. + ile başla.</p>}
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={`/notes?id=${n.id}`}
              className={cn(
                "block rounded-[var(--radius-inset)] p-3.5 transition",
                note?.id === n.id ? "bg-fg text-bg dark:bg-accent dark:text-accent-fg" : "bg-surface shadow-card hover:brightness-[0.98] dark:border dark:border-line",
              )}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {n.pinned && <Pin className="size-3.5 shrink-0" />}
                <span className="truncate">{n.title}</span>
              </div>
              {n.plain && <p className="mt-1 line-clamp-2 text-xs opacity-70">{n.plain}</p>}
              <div className="mt-2 flex items-center gap-2 text-[11px] opacity-70">
                {n.entityType === "game" && <Gamepad2 className="size-3" />}
                {n.entityType === "idea" && <Lightbulb className="size-3" />}
                {n.entityLabel && <span className="max-w-32 truncate">{n.entityLabel}</span>}
                <span className="ml-auto shrink-0">
                  {memberName(n.updatedBy)} · {timeAgo(n.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        {note ? (
          <NotePane key={note.id} note={note} me={me} />
        ) : (
          <div className="grid h-[60vh] place-items-center rounded-[var(--radius-card)] bg-surface text-center shadow-card dark:border dark:border-line">
            <div>
              <NotebookPen className="mx-auto size-10 text-muted" />
              <p className="mt-3 text-sm text-muted">Soldan bir not seç ya da yeni not oluştur.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function NotePane({ note, me }: { note: FullNote; me: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const [remote, setRemote] = useState<FullNote | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [seenVersion, setSeenVersion] = useState(note.updatedAt);
  const pendingPatch = useRef<Parameters<typeof saveNote>[1]>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { run } = useAction();

  // Sunucudan farklı bir sürüm gelirse (diğer kullanıcı kaydetti): biz kaydedilmiş durumdaysak al,
  // yazıyorsak uyarı göster (son kaydeden kazanır).
  if (note.updatedAt !== seenVersion) {
    setSeenVersion(note.updatedAt);
    if (note.updatedBy !== me) {
      if (status === "saved") {
        setTitle(note.title);
        setTags(note.tags);
        setRemote(note);
        setConflict(null);
      } else {
        setConflict(memberName(note.updatedBy));
      }
    }
  }

  async function flush() {
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (!Object.keys(patch).length) return;
    setStatus("saving");
    const r = await saveNote(note.id, patch);
    if (!r.ok) {
      toast("error", r.error);
      setStatus("dirty");
      return;
    }
    setStatus(Object.keys(pendingPatch.current).length ? "dirty" : "saved");
    notifyChange(`note:${note.id}`);
  }

  function queue(patch: Parameters<typeof saveNote>[1], delay = 900) {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }

  // Sayfadan çıkarken bekleyen kaydı gönder
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addTag() {
    const t = tagInput.trim().toLocaleLowerCase("tr").replace(/^#/, "");
    setTagInput("");
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    queue({ tags: next }, 0);
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card dark:border dark:border-line">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {note.entityType !== "general" && note.entityId && (
          <Link href={note.entityType === "game" ? `/games/${note.entityId}` : `/ideas/${note.entityId}`} className="inline-flex items-center gap-1 rounded-full bg-inset px-2.5 py-1 font-medium text-fg">
            {note.entityType === "game" ? <Gamepad2 className="size-3" /> : <Lightbulb className="size-3" />}
            {note.entityType === "game" ? "Oyun notu" : "Fikir notu"}
          </Link>
        )}
        <span>
          {memberName(note.createdBy)} oluşturdu · son: {memberName(note.updatedBy)} {timeAgo(note.updatedAt)}
        </span>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 font-semibold", status === "saved" ? "bg-pos-soft text-pos" : "bg-inset")}>
          {status === "saved" ? "Kaydedildi" : status === "saving" ? "Kaydediliyor…" : "Değişiklik var"}
        </span>
        <button
          onClick={() => run(() => saveNote(note.id, { pinned: !note.pinned }), { topic: "notes", onDone: () => router.refresh() })}
          className={cn("grid size-8 place-items-center rounded-full", note.pinned ? "bg-warn text-white" : "bg-inset hover:text-fg")}
          aria-label={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
          title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
        >
          <Pin className="size-4" />
        </button>
        <DeleteButton onConfirm={() => run(() => deleteNote(note.id), { topic: "notes", onDone: () => router.push("/notes") })} />
      </div>

      {conflict && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-warn/15 px-4 py-2 text-sm">
          <span>{conflict} bu notu sen yazarken değiştirdi. Kaydettiğinde onun değişikliğinin üzerine yazılır.</span>
          <button onClick={() => setConflict(null)} className="text-xs font-semibold">
            Tamam
          </button>
        </div>
      )}
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          queue({ title: e.target.value });
        }}
        placeholder="Başlık"
        className="mt-4 w-full bg-transparent text-2xl font-bold tracking-tight outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => {
              const next = tags.filter((x) => x !== t);
              setTags(next);
              queue({ tags: next }, 0);
            }}
            className="rounded-full bg-inset px-2.5 py-0.5 text-xs font-medium hover:bg-neg-soft hover:text-neg"
            title="Kaldır"
          >
            #{t}
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ etiket"
          className="w-24 bg-transparent text-xs outline-none placeholder:text-muted"
        />
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <NoteEditor
          initial={note.content}
          remote={remote?.content}
          onChange={(content, plain) => queue({ content, plain })}
        />
      </div>
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={cn("inline-flex h-8 items-center gap-1 rounded-full px-2.5", armed ? "bg-neg text-white" : "bg-inset hover:text-neg")}
      aria-label="Notu sil"
    >
      <Trash2 className="size-4" />
      {armed && <span className="text-xs font-semibold">Emin misin?</span>}
    </button>
  );
}
