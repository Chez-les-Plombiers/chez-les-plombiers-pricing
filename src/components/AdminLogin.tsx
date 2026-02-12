"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de connexion");
      }

      const { token } = await res.json();
      onLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 border border-border bg-card p-8"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-accent" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Admin
          </h2>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          autoFocus
        />

        {error && <p className="text-xs text-tier-premium">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="flex items-center justify-center gap-2 border border-accent bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Connexion
        </button>
      </form>
    </div>
  );
}
