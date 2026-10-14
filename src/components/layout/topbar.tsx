import { ThemeToggle } from "./theme-toggle";

/** Referans 2'deki ince/kalın karışık selamlama başlığı. */
export function Topbar({ name, title }: { name?: string; title?: string }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div>
        {title ? (
          <h1 className="text-2xl font-bold tracking-tight lg:text-[28px]">{title}</h1>
        ) : (
          <h1 className="text-2xl tracking-tight lg:text-[28px]">
            <span className="font-light text-muted">Hoş geldin, </span>
            <span className="font-bold">{name ?? "ekip"}</span>
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
