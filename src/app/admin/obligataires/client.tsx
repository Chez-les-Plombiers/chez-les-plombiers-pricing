"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiUrl } from "@/lib/base-path";
import type { Porteur } from "@/lib/obligataires";
import type { Position } from "@/lib/oca";

/**
 * L'écran où Étienne tient ses porteurs d'OCA et leurs liens.
 *
 * 🔴 C'EST LE SEUL ENDROIT OÙ LES NOMS EXISTENT. Le dépôt GitHub est public :
 * la liste ne doit jamais passer dans le code. Elle est saisie ici, rangée en
 * KV, et n'en sort que pour la page du porteur concerné.
 *
 * ⚠️ UNE FICHE PAR PORTEUR, PAS UNE LIGNE DE TABLEAU. Depuis les cessions de
 * février 2026, un porteur peut cumuler plusieurs lignes d'obligations à des
 * dates de départ différentes, et porte une liste de versements. Ça ne tient
 * pas dans une ligne.
 */

interface PorteurAffiche extends Porteur {
  jeton: string | null;
  vuLe: string | null;
  ouvertures: number;
  position?: Position | null;
}

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

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

  function maj(i: number, patch: Partial<PorteurAffiche>) {
    setPorteurs((l) => {
      const c = [...l];
      c[i] = { ...c[i], ...patch };
      // L'identifiant suit le nom tant qu'aucun lien n'a été créé. Une fois le
      // lien envoyé, le changer le casserait : on le fige.
      if (patch.nom !== undefined && !c[i].jeton) {
        c[i].id = identifiantDepuis(patch.nom);
      }
      return c;
    });
  }

  async function enregistrer() {
    setMessage(null);
    setErreur(null);
    const charge = porteurs.map(({ id, nom, type, lignes, versements, conteste }) => ({
      id,
      nom,
      type,
      lignes,
      versements,
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
        `Révoquer le lien de ${nom} ?\n\nSon lien cessera immédiatement de fonctionner. Les autres porteurs ne sont pas affectés.`
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

  // ⚠️ ON NE COMPTE QUE LES LIGNES VIVANTES. Une ligne cédée reste inscrite
  // chez son ancien porteur — elle a produit des intérêts qu'on lui doit
  // encore — mais elle vit désormais aussi chez le cessionnaire. L'additionner
  // des deux côtés ferait afficher 270 000 € pour une émission de 220 000.
  const nominalTotal = porteurs.reduce(
    (s, p) =>
      s +
      (p.lignes ?? [])
        .filter((l) => !l.jusqua)
        .reduce((t, l) => t + (l.nominal || 0), 0),
    0
  );
  const resteTotal = porteurs.reduce(
    (s, p) => s + (p.position?.resteDuAvecRetard ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded border border-border bg-card p-4 text-xs leading-relaxed text-muted">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          Ce que voit le porteur
        </p>
        <p>
          Les comptes de la société — encaissé, charges, solde, mois par mois —
          et <strong>sa position</strong> : ce qui lui est dû, ce qu&apos;il a
          reçu, ce qui reste, intérêts de retard compris. Il ne voit jamais les
          autres porteurs.
        </p>
        <p className="mt-2">
          ⚠️ Cocher <strong>« en discussion »</strong> masque la position de ce
          porteur, sans masquer les comptes de la société.
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
          <div className="flex flex-wrap gap-6 border-y border-border py-3 text-sm">
            <span>
              <span className="text-muted">Nominal total </span>
              <strong className="font-mono tabular-nums">
                {euros(nominalTotal)}
              </strong>
            </span>
            <span>
              <span className="text-muted">Reste dû, tous porteurs </span>
              <strong className="font-mono tabular-nums text-[#d98080]">
                {euros(resteTotal)}
              </strong>
            </span>
            <span className="text-muted">{porteurs.length} porteurs</span>
          </div>

          <div className="space-y-4">
            {porteurs.map((p, i) => (
              <Fiche
                key={i}
                p={p}
                onMaj={(patch) => maj(i, patch)}
                onSupprimer={() =>
                  setPorteurs((l) => l.filter((_, j) => j !== i))
                }
                onOuvrir={() => ouvrir(p.id)}
                onRevoquer={() => revoquer(p.id, p.nom)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setPorteurs((l) => [
                  ...l,
                  {
                    id: "",
                    nom: "",
                    type: "morale",
                    lignes: [{ nominal: 0 }],
                    versements: [],
                    jeton: null,
                    vuLe: null,
                    ouvertures: 0,
                  },
                ])
              }
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + Ajouter un porteur
            </button>
            <button
              onClick={enregistrer}
              className="border border-accent bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
            >
              Enregistrer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Fiche({
  p,
  onMaj,
  onSupprimer,
  onOuvrir,
  onRevoquer,
}: {
  p: PorteurAffiche;
  onMaj: (patch: Partial<PorteurAffiche>) => void;
  onSupprimer: () => void;
  onOuvrir: () => void;
  onRevoquer: () => void;
}) {
  const lien = p.jeton
    ? `https://www.chezlesplombiers.fr/obligataires/${p.jeton}`
    : null;

  return (
    <div className="border border-border bg-card p-4">
      {/* Identité */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={p.nom}
          onChange={(e) => onMaj({ nom: e.target.value })}
          placeholder="Nom du porteur"
          className="min-w-56 flex-1 border border-border bg-background px-2 py-1.5 text-sm"
        />
        <select
          value={p.type}
          onChange={(e) =>
            onMaj({ type: e.target.value as "physique" | "morale" })
          }
          className="border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="morale">Société</option>
          <option value="physique">Personne physique</option>
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={p.conteste ?? false}
            onChange={(e) => onMaj({ conteste: e.target.checked })}
          />
          en discussion
        </label>
        <button
          onClick={onSupprimer}
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-[#d95f5f]"
        >
          Retirer
        </button>
      </div>

      {p.type === "physique" && (
        <p className="mt-1.5 text-[11px] text-accent">
          ⚠️ Retenue à la source de 30 % — à vérifier sur son bulletin de
          souscription avant d&apos;envoyer le lien.
        </p>
      )}

      {/* Lignes d'obligations */}
      <div className="mt-4">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
          Lignes d&apos;obligations
        </p>
        <div className="mt-1.5 space-y-1.5">
          {(p.lignes ?? []).map((l, k) => (
            <div key={k} className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="number"
                value={l.nominal || ""}
                onChange={(e) => {
                  const lignes = [...p.lignes];
                  lignes[k] = { ...l, nominal: Number(e.target.value) };
                  onMaj({ lignes });
                }}
                placeholder="nominal"
                className="w-28 border border-border bg-background px-2 py-1 text-right font-mono tabular-nums"
              />
              <span className="text-muted">€ · intérêts du</span>
              <input
                type="date"
                value={l.depuis ?? ""}
                onChange={(e) => {
                  const lignes = [...p.lignes];
                  lignes[k] = { ...l, depuis: e.target.value || undefined };
                  onMaj({ lignes });
                }}
                className="border border-border bg-background px-2 py-1"
              />
              <span className="text-muted">au</span>
              <input
                type="date"
                value={l.jusqua ?? ""}
                onChange={(e) => {
                  const lignes = [...p.lignes];
                  lignes[k] = { ...l, jusqua: e.target.value || undefined };
                  onMaj({ lignes });
                }}
                className="border border-border bg-background px-2 py-1"
              />
              <button
                onClick={() =>
                  onMaj({ lignes: p.lignes.filter((_, j) => j !== k) })
                }
                className="text-muted transition-colors hover:text-[#d95f5f]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onMaj({ lignes: [...(p.lignes ?? []), { nominal: 0 }] })}
          className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          + ligne
        </button>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          Dates vides = souscription d&apos;origine (24/09/2024), sans fin. Une
          ligne <strong>cédée</strong> porte une date de fin ; une quote-part
          <strong> reçue</strong> porte une date de début.
        </p>
      </div>

      {/* Versements */}
      <div className="mt-4">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
          Versements reçus
        </p>
        <div className="mt-1.5 space-y-1.5">
          {(p.versements ?? []).map((v, k) => (
            <div key={k} className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                value={v.date}
                onChange={(e) => {
                  const versements = [...p.versements];
                  versements[k] = { ...v, date: e.target.value };
                  onMaj({ versements });
                }}
                className="border border-border bg-background px-2 py-1"
              />
              <input
                type="number"
                value={v.montant || ""}
                onChange={(e) => {
                  const versements = [...p.versements];
                  versements[k] = { ...v, montant: Number(e.target.value) };
                  onMaj({ versements });
                }}
                placeholder="montant"
                className="w-28 border border-border bg-background px-2 py-1 text-right font-mono tabular-nums"
              />
              <input
                value={v.libelle ?? ""}
                onChange={(e) => {
                  const versements = [...p.versements];
                  versements[k] = { ...v, libelle: e.target.value };
                  onMaj({ versements });
                }}
                placeholder="libellé bancaire (facultatif)"
                className="min-w-48 flex-1 border border-border bg-background px-2 py-1"
              />
              <button
                onClick={() =>
                  onMaj({ versements: p.versements.filter((_, j) => j !== k) })
                }
                className="text-muted transition-colors hover:text-[#d95f5f]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            onMaj({
              versements: [
                ...(p.versements ?? []),
                { date: "", montant: 0 },
              ],
            })
          }
          className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          + versement
        </button>
      </div>

      {/* Ce que ça donne */}
      {p.position && !p.conteste && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs">
          <span>
            <span className="text-muted">Dû à ce jour </span>
            <strong className="font-mono tabular-nums">
              {euros(p.position.totalNet)}
            </strong>
          </span>
          <span>
            <span className="text-muted">Reçu </span>
            <strong className="font-mono tabular-nums">
              {euros(p.position.totalVerse)}
            </strong>
          </span>
          {p.position.totalInteretsDeRetard > 0.5 && (
            <span>
              <span className="text-muted">Retard </span>
              <strong className="font-mono tabular-nums">
                {euros(p.position.totalInteretsDeRetard)}
              </strong>
            </span>
          )}
          <span>
            <span className="text-muted">Reste </span>
            <strong
              className={`font-mono tabular-nums ${
                p.position.resteDuAvecRetard > 0.5
                  ? "text-[#d98080]"
                  : "text-[#5cb87c]"
              }`}
            >
              {euros(p.position.resteDuAvecRetard)}
            </strong>
          </span>
          {p.position.tropVerse > 0.5 && (
            <span className="text-accent">
              trop-versé {euros(p.position.tropVerse)}, imputé sur la suite
            </span>
          )}
        </div>
      )}

      {/* Le lien */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {lien ? (
          <>
            <input
              readOnly
              value={lien}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-72 flex-1 border border-border bg-background px-2 py-1 font-mono text-[10px]"
            />
            <span className="text-[10px] text-muted">
              {p.ouvertures > 0
                ? `ouvert ${p.ouvertures}× — ${new Date(p.vuLe!).toLocaleString("fr-FR")}`
                : "jamais ouvert"}
            </span>
            <button
              onClick={onRevoquer}
              className="font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-[#d95f5f]"
            >
              Révoquer
            </button>
          </>
        ) : (
          <button
            onClick={onOuvrir}
            disabled={!p.id}
            className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Créer le lien
          </button>
        )}
      </div>
    </div>
  );
}
