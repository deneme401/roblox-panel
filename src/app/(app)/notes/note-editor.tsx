"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Bold, CheckSquare, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Strikethrough, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** TipTap zengin metin editörü. İçerik JSON olarak saklanır (notes.content). */
export function NoteEditor({ initial, remote, onChange }: { initial: unknown; remote?: unknown; onChange: (content: unknown, plain: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: true, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Yazmaya başla… (Markdown kısayolları çalışır: #, -, [ ], >)" }),
    ],
    content: (initial as object) ?? "",
    editorProps: { attributes: { class: "prose-note min-h-[50vh] outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText().slice(0, 5000)),
  });

  // Diğer kullanıcıdan gelen sürüm (yalnızca biz kaydedilmiş durumdayken iletilir)
  useEffect(() => {
    if (editor && remote && !editor.isFocused) editor.commands.setContent(remote as object, { emitUpdate: false });
  }, [editor, remote]);

  return (
    <div>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      title={label}
      aria-label={label}
      className={cn("grid size-8 place-items-center rounded-lg transition", active ? "bg-fg text-bg dark:bg-accent dark:text-accent-fg" : "text-muted hover:bg-inset hover:text-fg")}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="sticky top-2 z-10 mb-3 flex flex-wrap gap-0.5 rounded-xl bg-inset/90 p-1 backdrop-blur">
      <ToolButton label="Başlık" active={s.h2} on={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolButton>
      <ToolButton label="Alt başlık" active={s.h3} on={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolButton>
      <ToolButton label="Kalın" active={s.bold} on={() => c().toggleBold().run()}><Bold className="size-4" /></ToolButton>
      <ToolButton label="İtalik" active={s.italic} on={() => c().toggleItalic().run()}><Italic className="size-4" /></ToolButton>
      <ToolButton label="Üstü çizili" active={s.strike} on={() => c().toggleStrike().run()}><Strikethrough className="size-4" /></ToolButton>
      <ToolButton label="Kod" active={s.code} on={() => c().toggleCode().run()}><Code className="size-4" /></ToolButton>
      <ToolButton label="Madde listesi" active={s.bullet} on={() => c().toggleBulletList().run()}><List className="size-4" /></ToolButton>
      <ToolButton label="Numaralı liste" active={s.ordered} on={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolButton>
      <ToolButton label="Yapılacaklar" active={s.task} on={() => c().toggleTaskList().run()}><CheckSquare className="size-4" /></ToolButton>
      <ToolButton label="Alıntı" active={s.quote} on={() => c().toggleBlockquote().run()}><Quote className="size-4" /></ToolButton>
      <ToolButton
        label="Bağlantı"
        active={s.link}
        on={() => {
          if (s.link) return c().unsetLink().run();
          const url = window.prompt("Bağlantı adresi");
          if (url) c().setLink({ href: url }).run();
        }}
      >
        <Link2 className="size-4" />
      </ToolButton>
      <span className="mx-1 w-px bg-line" />
      <ToolButton label="Geri al" on={() => c().undo().run()}><Undo2 className="size-4" /></ToolButton>
      <ToolButton label="Yinele" on={() => c().redo().run()}><Redo2 className="size-4" /></ToolButton>
    </div>
  );
}
