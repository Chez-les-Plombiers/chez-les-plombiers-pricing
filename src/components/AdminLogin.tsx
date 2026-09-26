"use client";
import { apiUrl } from "@/lib/base-path";

import { useState, useEffect } from "react";
import { Lock, Loader2, ScanFace } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clefEnCours, setClefEnCours] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  // ⚠️ `PublicKeyCredential` n'existe pas partout (vieux navigateurs, contexte
  // non securise). On ne propose la clef que si la plateforme sait la tenir —
  // sinon le bouton echouerait sans que l'utilisateur comprenne pourquoi.
  const [clefPossible, setClefPossible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setClefPossible)
      .catch(() => setClefPossible(false));
  }, []);

  async function connexionParClef() {
    setClefEnCours(true);
    setError(null);
    try {
      const rOpt = await fetch(apiUrl("/api/admin/passkey/options"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "connecter" }),
      });
      if (!rOpt.ok) {
        const d = await rOpt.json().catch(() => ({}));
        throw new Error(
          d.error ||
            "Aucune clé enregistrée sur cet appareil — connectez-vous par mot de passe, puis ajoutez-la."
        );
      }
      const reponse = await startAuthentication({
        optionsJSON: await rOpt.json(),
      });

      const rVer = await fetch(apiUrl("/api/admin/passkey/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "connecter", reponse }),
      });
      if (!rVer.ok) {
        const d = await rVer.json().catch(() => ({}));
        throw new Error(d.error || "Connexion refusée");
      }
      const { token } = await rVer.json();
      onLogin(token);
    } catch (err) {
      // Une annulation par l'utilisateur n'est pas une erreur a afficher.
      const nom = err instanceof Error ? err.name : "";
      if (nom === "NotAllowedError" || nom === "AbortError") {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setClefEnCours(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/admin/auth"), {
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
      <div className="flex w-full max-w-sm flex-col gap-4 border border-border bg-card p-8">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-accent" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Admin
          </h2>
        </div>

        {clefPossible && (
          <button
            type="button"
            onClick={connexionParClef}
            disabled={clefEnCours}
            className="flex items-center justify-center gap-2 border border-accent bg-accent px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {clefEnCours ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanFace className="h-4 w-4" />
            )}
            Face ID / Touch ID
          </button>
        )}

        {error && <p className="text-xs text-tier-premium">{error}</p>}

        {clefPossible && !motDePasseVisible ? (
          <button
            type="button"
            onClick={() => setMotDePasseVisible(true)}
            className="text-center font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            Utiliser le mot de passe
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              autoFocus={motDePasseVisible}
            />
            <button
              type="submit"
              disabled={loading || !password}
              className={`flex items-center justify-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 ${
                clefPossible
                  ? "border-border text-muted hover:border-accent hover:text-accent"
                  : "border-accent bg-accent text-background hover:bg-accent-hover"
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
