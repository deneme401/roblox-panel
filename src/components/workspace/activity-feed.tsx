import Link from "next/link";
import { activityHref, listActivity } from "@/lib/data/workspace";
import { MEMBERS, isMemberId } from "@/lib/auth/members";
import { timeAgo } from "@/lib/utils";

export async function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const items = await listActivity(limit);
  if (!items.length) return <p className="rounded-2xl bg-inset p-4 text-sm text-muted">Henüz aktivite yok. Bir fikir ya da not ekleyerek başlayın.</p>;
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const m = isMemberId(a.actor) ? MEMBERS[a.actor] : null;
        const href = activityHref(a);
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-2xl bg-inset p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color ?? "var(--muted)" }}>
              {m?.name[0] ?? "?"}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{m?.name ?? "Sistem"}</span> <span className="text-muted">{a.verb}</span>{" "}
              {a.label &&
                (href ? (
                  <Link href={href} className="font-medium underline-offset-2 hover:underline">
                    {a.label}
                  </Link>
                ) : (
                  <span className="font-medium">{a.label}</span>
                ))}
              <div className="text-xs text-muted">{timeAgo(a.createdAt)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
