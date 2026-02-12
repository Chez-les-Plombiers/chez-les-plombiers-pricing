import Image from "next/image";

export function Navbar() {
  return (
    <nav className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Image
          src="/logo.png"
          alt="Chez Les Plombiers"
          width={160}
          height={48}
          className="h-8 w-auto sm:h-10"
          priority
        />
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Tarifs 2026
        </span>
      </div>
    </nav>
  );
}
