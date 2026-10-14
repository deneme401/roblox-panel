import { Suspense } from "react";
import { connection } from "next/server";
import { Topbar } from "@/components/layout/topbar";
import { getNote, listNotes } from "@/lib/data/workspace";
import { getMember } from "@/lib/auth/session";
import { NotesWorkspace } from "./notes-workspace";

export default function NotesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <>
      <Topbar title="Notlar" subtitle="Ortak not defteri: otomatik kaydedilir, diğer kişi anında görür" />
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <Notes searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Notes({ searchParams }: { searchParams: PageProps<"/notes">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : null;
  const [notes, note, me] = await Promise.all([listNotes(), id ? getNote(id) : null, getMember()]);
  return (
    <NotesWorkspace
      notes={JSON.parse(JSON.stringify(notes))}
      note={note ? JSON.parse(JSON.stringify(note)) : null}
      me={me?.id ?? ""}
      autoNew={sp.new === "1"}
    />
  );
}
