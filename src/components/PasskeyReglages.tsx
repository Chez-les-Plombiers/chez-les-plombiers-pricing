"use client";
import { apiUrl } from "@/lib/base-path";

import { useCallback, useEffect, useState } from "react";
import { ScanFace, Loader2, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

interface ClefAffichee {
  id: string;
  libelle: string;
  rpId: string;
  creeeLe: string;
  vueLe: string | null;
  utilisableIci: boolean;
}

/**
 * Gestion des clefs d'acces (Face ID / Touch ID / Windows Hello).
 *
 * Une passkey identifie un APPAREIL : il en faut une par appareil, et c'est
 * voulu — c'est ce qui permet d'en retirer un sans toucher aux autres.
 */
export function PasskeyReglages({ token }: { token: string }) {
  const [clefs, setClefs] = useState<ClefAffichee[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [possible, setPossible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setPossible)
      .catch(() => setPossible(false));
  }, []);

  const charger = useCallback(async () => {
    const res = await fetch(apiUrl("/api/admin/passkey"), {
      headers: { Authorization: token },
    });
    if (res.ok) setClefs(await res.json());
  }, [token]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function ajouter() {
    setEnCours(true);
    setMessage(null);
    try {
      const libelle =
        window.prompt(
          "Nom de cet appareil (pour pouvoir le retirer plus tard) :",
          nomProbable()
        ) ?? "";
      if (!libelle.trim()) return;

      const rOpt = await fetch(apiUrl("/api/admin/passkey/options"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ mode: "enregistrer" }),
      });
      if (!rOpt.ok) throw new Error((await rOpt.json()).error || "Refusé");

      const reponse = await startRegistration({ optionsJSON: await rOpt.json() });

      const rVer = await fetch(apiUrl("/api/admin/passkey/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ mode: "enregistrer", reponse, libelle }),
      });
      if (!rVer.ok) throw new Error((await rVer.json()).error || "Refusé");

      setMessage("Clé enregistrée. Elle servira à la prochaine connexion.");
      await charger();
    } catch (err) {
      const nom = err instanceof Error ? err.name : "";
      if (nom !== "NotAllowedError" && nom !== "AbortError") {
        setMessage(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setEnCours(false);
    }
  }

  async function retirer(id: string, libelle: string) {
    if (!confirm(`Retirer « ${libelle} » ? Cet appareil ne pourra plus ouvrir l'administration.`))
      return;
    await fetch(apiUrl("/api/admin/passkey"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ id }),
    });
    await charger();
  }

  if (!possible && !clefs?.length) return null;

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Clés d&apos;accès — Face ID, Touch ID, Windows Hello
        </span>
        {possible && (
          <button
            onClick={ajouter}
            disabled={enCours}
            className="flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {enCours ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ScanFace className="h-3 w-3" />
            )}
            Ajouter cet appareil
          </button>
        )}
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        Une clé d&apos;accès remplace le mot de passe : votre visage ou votre
        empreinte déverrouille une clé qui ne quitte jamais l&apos;appareil, et
        le serveur n&apos;a aucun secret à se faire voler. Il en faut{" "}
        <strong className="text-foreground">une par appareil</strong>. Le mot de
        passe reste la voie de secours.
      </p>

      {clefs === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      ) : clefs.length === 0 ? (
        <p className="font-mono text-[11px] text-muted">Aucune clé enregistrée.</p>
      ) : (
        <ul className="space-y-1">
          {clefs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] py-1.5 font-mono text-[11px]"
            >
              <span className="text-foreground">
                {c.libelle}
                {!c.utilisableIci && (
                  <span
                    className="ml-2 text-[#c9a84c]"
                    title={`Enregistrée pour ${c.rpId} — inutilisable depuis ce domaine.`}
                  >
                    autre domaine
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3 text-muted">
                {c.vueLe
                  ? `vue le ${c.vueLe.slice(0, 10)}`
                  : `ajoutée le ${c.creeeLe.slice(0, 10)}`}
                <button
                  onClick={() => retirer(c.id, c.libelle)}
                  className="text-muted transition-colors hover:text-[#d95f5f]"
                  title="Retirer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="mt-2 text-[11px] text-accent">{message}</p>}
    </div>
  );
}

/** Un nom plausible par defaut, pour eviter « Appareil sans nom ». */
function nomProbable(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "PC Windows";
  return "Cet appareil";
}
