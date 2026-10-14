// Zamanlanmış işler. Supabase pg_cron + pg_net bu adresleri çağırır (bkz. supabase/migrations/0003_cron.sql).
// Yetki: "Authorization: Bearer <CRON_SECRET>" başlığı.
import { runScheduledJob, SCHEDULED_JOBS, type ScheduledJob } from "@/lib/collect/schedule";

export const maxDuration = 300;

async function handle(request: Request, ctx: RouteContext<"/api/cron/[job]">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "yetkisiz" }, { status: 401 });
  }
  const { job } = await ctx.params;
  if (!SCHEDULED_JOBS.includes(job as ScheduledJob)) {
    return Response.json({ error: "bilinmeyen iş" }, { status: 404 });
  }
  const results = await runScheduledJob(job as ScheduledJob);
  return Response.json({ results }, { status: results.every((r) => r.ok) ? 200 : 500 });
}

export const GET = handle;
export const POST = handle;
