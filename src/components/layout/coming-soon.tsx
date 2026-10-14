import { Topbar } from "./topbar";
import { Card } from "@/components/ui/card";

export function ComingSoon({ title, phase, items }: { title: string; phase: number; items: string[] }) {
  return (
    <>
      <Topbar title={title} />
      <Card className="max-w-2xl">
        <span className="inline-block rounded-full bg-inset px-3 py-1 text-xs font-semibold text-muted">Faz {phase}</span>
        <h2 className="mt-3 text-lg font-semibold">Bu sayfa yapım aşamasında</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          {items.map((i) => (
            <li key={i}>• {i}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
