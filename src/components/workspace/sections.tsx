// Sayfalarda <Suspense> içinde kullanılan, önbelleksiz okuma yapan sunucu bileşenleri.
import { getMember } from "@/lib/auth/session";
import { listComments, listNotes, type EntityType } from "@/lib/data/workspace";
import { CommentThread } from "./comment-thread";
import { EntityNotes } from "./entity-notes";

export async function CommentsSection({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [comments, me] = await Promise.all([listComments(entityType, entityId), getMember()]);
  return <CommentThread entityType={entityType} entityId={entityId} comments={comments} me={me?.id ?? null} />;
}

export async function NotesSection({ entityType, entityId, label }: { entityType: Exclude<EntityType, "general">; entityId: string; label: string }) {
  const notes = await listNotes({ entityType, entityId });
  return <EntityNotes entityType={entityType} entityId={entityId} label={label} notes={notes} />;
}

export function SectionSkeleton({ h = "h-24" }: { h?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-inset ${h}`} />;
}
