import { Wrench } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-accent" />
          <span className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Chez Les Plombiers
          </span>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Tarifs 2026
        </span>
      </div>
    </nav>
  );
}
