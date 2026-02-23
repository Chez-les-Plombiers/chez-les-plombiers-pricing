import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="https://chezlesplombiers.fr"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
            title="Retour au site"
          >
            <ArrowLeft className="h-4 w-4" />
            <Image
              src="/logo.png"
              alt="Chez Les Plombiers"
              width={160}
              height={48}
              className="h-8 w-auto sm:h-10"
              priority
            />
          </a>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Tarifs 2026
        </span>
      </div>
    </nav>
  );
}
