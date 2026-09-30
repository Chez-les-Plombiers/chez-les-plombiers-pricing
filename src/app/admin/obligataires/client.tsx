"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiUrl } from "@/lib/base-path";
import type { Porteur } from "@/lib/obligataires";

/**
 * L'écran où Étienne saisit ses porteurs d'OCA et récupère leurs liens.
 *
 * 🔴 C'EST LE SEUL ENDROIT OÙ LES NOMS EXISTENT. Le dépôt GitHub est public :
 * la liste ne doit jamais passer dans le code. Elle est saisie ici, rangée en
 * KV, et n'en sort que pour la page du porteur concerné. Voir l'en-tête de
 * `@/lib/obligataires`.
 */

interface PorteurAffiche extends Porteur {
  jeton: string | null;
  vuLe: string | null;
  ouvertures: number;
}

const VIDE: PorteurAffiche = {
  id: "",
  nom: "",
  type: "morale",
  montant: 0,
  conteste: false,
  jeton: null,
  vuLe: null,
  ouvertures: 0,
};

/** `Nadra Bouhri Gervais` → `nadra-bouhri-gervais`. */
function identifiantDepuis(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function AdminObligatairesClient() {
  return (
    <AdminShell titre="Obligataires">
      {(token) => <Contenu token={token} />}
    </AdminShell>
  );
}

function Contenu({ token }: { token: string }) {
  const [porteurs, setPorteurs] = useState<PorteurAffiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetch(apiUrl("/api/admin/obligataires"), {
        headers: { Authorization: token },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Chargement impossible");
      setPorteurs(j.porteurs ?? []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setChargement(false);
    }
  }, [token]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function modifier(i: number, champ: keyof PorteurAffiche, valeur: unknown) {
    setPorteurs((liste) => {
      const copie = [...liste];
      copie[i] = { ...copie[i], [champ]: valeur };
      // L'identifiant se déduit du nom tant qu'aucun accès n'a été ouvert.
      // Une fois le lien envoyé, le changer casserait le lien : on le fige.
      if (champ === "nom" && !copie[i].jeton) {
        copie[i].id = identifiantDepuis(String(valeur));
      }
      return copie;
    });
  }

  async function enregistrer() {
    setMessage(null);
    setErreur(null);
    const charge = porteurs.map(({ id, nom, type, montant, conteste }) => ({
      id,
      nom,
      type,
      montant,
      conteste,
    }));
    const r = await fetch(apiUrl("/api/admin/obligataires"), {
      method: "PUT",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ porteurs: charge }),
    });
    const j = await r.json();
    if (!r.ok) return setErreur(j.error ?? "Enregistrement impossible");
    setMessage("Liste enregistrée.");
    await charger();
  }

  async function ouvrir(id: string) {
    setErreur(null);
    const r = await fetch(apiUrl("/api/admin/obligataires"), {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (!r.ok) return setErreur(j.error ?? "Création impossible");
    await charger();
  }

  async function revoquer(id: string, nom: string) {
    if (
      !confirm(
        `Révoquer le lien de ${nom} ?\n\nSon lien actuel cessera immédiatement de fonctionner. Les autres porteurs ne sont pas affectés.`
      )
    )
      return;
    const r = await fetch(
      apiUrl(`/api/admin/obligataires?id=${encodeURIComponent(id)}`),
      { method: "DELETE", headers: { Authorization: token } }
    );
    if (!r.ok) return setErreur("Révocation impossible");
    await charger();
  }

  const lien = (jeton: string) =>
    `https://www.chezlesplombiers.fr/obligataires/${jeton}`;

  const total = porteurs.reduce((s, p) => s + (Number(p.montant) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded border border-border bg-card p-4 text-xs leading-relaxed text-muted">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          Ce que voit le porteur
        </p>
        <p>
          Les comptes de la société — encaissé, charges, solde, mois par mois —
          et le prévisionnel des mois à venir. <strong>Aucun montant
          individuel</strong> : ni son nominal, ni ses intérêts, ni ce qu&apos;on
          lui doit. Tant que la cession de février, le brut/net et les intérêts
          de retard ne sont pas tranchés, un chiffre affiché ici vaudrait
          reconnaissance de dette.
        </p>
      </div>

      {erreur && (
        <p className="border border-[#d95f5f] bg-[#d95f5f]/10 px-3 py-2 text-sm text-[#d95f5f]">
          {erreur}
        </p>
      )}
      {message && (
        <p className="border border-[#5cb87c] bg-[#5cb87c]/10 px-3 py-2 text-sm text-[#5cb87c]">
          {message}
        </p>
      )}

      {chargement ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Chargement…
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Nom", "Type", "Nominal", "Statut", "Lien", ""].map((t) => (
                    <th
                      key={t}
                      className="border-b border-border px-2 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-muted"
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porteurs.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 align-top">
                    <td className="px-2 py-2">
                      <input
                        value={p.nom}
                        onChange={(e) => modifier(i, "nom", e.target.value)}
                        placeholder="Nom du porteur"
                        className="w-52 border border-border bg-background px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={p.type}
                        onChange={(e) => modifier(i, "type", e.target.value)}
                        className="border border-border bg-background px-2 py-1 text-xs"
                      >
                        <option value="morale">Société</option>
                        <option value="physique">Personne physique</option>
                      </select>
                      {p.type === "physique" && (
                        <p className="mt-1 w-32 text-[10px] leading-tight text-accent">
                          retenue 30 % à la source
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={p.montant || ""}
                        onChange={(e) =>
                          modifier(i, "montant", Number(e.target.value))
                        }
                        className="w-28 border border-border bg-background px-2 py-1 text-right font-mono text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-muted">
                        <input
                          type="checkbox"
                          checked={p.conteste ?? false}
                          onChange={(e) =>
                            modifier(i, "conteste", e.target.checked)
                          }
                        />
                        contesté
                      </label>
                    </td>
                    <td className="px-2 py-2">
                      {p.jeton ? (
                        <div className="space-y-1">
                          <input
                            readOnly
                            value={lien(p.jeton)}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-72 border border-border bg-background px-2 py-1 font-mono text-[10px]"
                          />
                          <p className="text-[10px] text-muted">
                            {p.ouvertures > 0
                              ? `ouvert ${p.ouvertures} fois — dernière le ${new Date(
                                  p.vuLe!
                                ).toLocaleString("fr-FR")}`
                              : "jamais ouvert"}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => ouvrir(p.id)}
                          disabled={!p.id}
                          className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                        >
                          Créer le lien
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {p.jeton && (
                        <button
                          onClick={() => revoquer(p.id, p.nom)}
                          className="font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-[#d95f5f]"
                        >
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="px-2 py-3">Total</td>
                  <td />
                  <td className="px-2 py-3 text-right font-mono tabular-nums">
                    {new Intl.NumberFormat("fr-FR").format(total)} €
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPorteurs((l) => [...l, { ...VIDE }])}
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + Ajouter un porteur
            </button>
            <button
              onClick={enregistrer}
              className="border border-accent bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
            >
              Enregistrer la liste
            </button>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            ⚠️ Créer le lien d&apos;un porteur <strong>fige son
            identifiant</strong> : corriger son nom ensuite n&apos;y touchera
            plus, pour ne pas casser un lien déjà envoyé. Révoquer puis recréer
            donne un lien neuf — l&apos;ancien meurt.
          </p>
        </>
      )}
    </div>
  );
}
