import Image from "next/image";

export function VideoHero() {
  return (
    <header className="relative h-[50vh] min-h-[360px] overflow-hidden sm:h-[60vh]">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Navbar */}
        <nav className="px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Image
              src="/logo.png"
              alt="Chez Les Plombiers"
              width={160}
              height={48}
              className="h-8 w-auto sm:h-10"
              priority
            />
            <span className="font-mono text-xs uppercase tracking-wider text-white/70">
              Tarifs 2026
            </span>
          </div>
        </nav>

        {/* Hero text */}
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-white sm:text-4xl md:text-5xl">
              Chez Les Plombiers
            </h1>
            <p className="mt-3 text-sm tracking-widest text-white/60 sm:text-base">
              200m² — 39 rue des Bourdonnais, 75001 Paris
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
