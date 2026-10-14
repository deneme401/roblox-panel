import { Suspense } from "react";
import { Radar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş · RoRadar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="hero-gradient grid size-14 place-items-center rounded-2xl text-hero-fg">
            <Radar className="size-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">RoRadar</h1>
            <p className="text-sm text-muted">Kim olarak çalışıyorsun?</p>
          </div>
        </div>
        <Suspense>
          <LoginForm needsPassword={Boolean(process.env.APP_PASSWORD)} />
        </Suspense>
      </Card>
    </main>
  );
}
