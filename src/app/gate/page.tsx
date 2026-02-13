"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function GatePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Chez Les Plombiers"
            width={180}
            height={60}
            className="opacity-80"
          />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="Code d'accès"
            autoFocus
            className="border border-border bg-surface px-4 py-3 text-center font-mono text-lg tracking-widest text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          {error && (
            <p className="text-center text-xs text-red-400">Code incorrect</p>
          )}
          <button
            type="submit"
            disabled={loading || !code}
            className="flex items-center justify-center gap-2 border border-accent bg-accent px-4 py-3 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accéder"}
          </button>
        </form>
      </div>
    </div>
  );
}
