"use client";

import { useEffect, useState } from "react";
import type { Bilan } from "@/lib/bilan";

/**
 * La page que reçoit un porteur d'OCA.
 *
 * ── CE QU'ELLE DOIT ÊTRE ────────────────────────────────────────────────────
 * Lisible par quelqu'un qui n'est pas comptable, ouverte sur un téléphone, et
 * honnête. Le lecteur est un ami à qui la société doit de l'argent : il vient
 * chercher « est-ce que ça tourne ? ». Trois chiffres et un tableau répondent
 * mieux qu'un tableau de bord complet.
 *
 * ── CE QU'ELLE NE FAIT PAS, ET POURQUOI ─────────────────────────────────────
 * Elle n'affiche **aucune créance individuelle**. Voir l'en-tête de
 * `@/lib/obligataires` : la cession de février n'est pas tranchée, le brut
 * n'est pas le net pour une personne physique, les intérêts de retard courent,
 * et un montant est contesté. Un chiffre affiché ici vaudrait reconnaissance
 * de dette. Le bloc « votre position » viendra quand ces points seront réglés.
 */

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

interface Reponse {
  porteur: { nom: string };
  bilan: Bilan;
}

export function PageObligataire({ jeton }: { jeton: string }) {
  const [data, setData] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/tarifs/api/obligataires/${encodeURIComponent(jeton)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!vivant) return;
        if (!r.ok) setErreur(j.error ?? "Lien inconnu ou expiré");
        else setData(j);
      })
      .catch(() => vivant && setErreur("Connexion impossible"));
    return () => {
      vivant = false;
    };
  }, [jeton]);

  if (erreur) {
    return (
      <Cadre>
        <p className="text-sm text-foreground">{erreur}</p>
        <p className="mt-3 text-sm text-muted">
          Ce lien est personnel. S&apos;il ne fonctionne plus, demandez-en un
          nouveau à Étienne.
        </p>
      </Cadre>
    );
  }

  if (!data) {
    return (
      <Cadre>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Chargement…
        </p>
      </Cadre>
    );
  }

  const { porteur, bilan } = data;
  const arrete = new Date(bilan.arreteLe);
  const dernierEchu = [...bilan.mois].reverse().find((m) => m.statut !== "planned");

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        {/* ── En-tête ── */}
        <header className="border-b border-border pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            Chez les Plombiers · Suivi obligataire
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
            Bonjour {porteur.nom}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Voici où en est la société, arrêté au{" "}
            {arrete.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Cette page est mise à jour automatiquement à chaque fois que vous
            l&apos;ouvrez.
          </p>
        </header>

        {/* ── Les trois chiffres ── */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Chiffre
            libelle="Encaissé en 2026"
            valeur={euros(bilan.realise.caEncaisse)}
            detail={`sur ${bilan.realise.moisCouverts} mois`}
          />
          <Chiffre
            libelle="Charges"
            valeur={euros(bilan.realise.charges)}
            detail="même période"
          />
          <Chiffre
            libelle="Solde d'exploitation"
            valeur={euros(bilan.realise.solde)}
            detail={bilan.realise.solde >= 0 ? "excédent" : "déficit"}
            accentue={bilan.realise.solde >= 0 ? "positif" : "negatif"}
          />
        </section>

        {/* ── Mois par mois ── */}
        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Mois par mois
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr>
                  <Th className="text-left">Mois</Th>
                  <Th className="text-right">Encaissé</Th>
                  <Th className="text-right">Charges</Th>
                  <Th className="text-right">Solde</Th>
                </tr>
              </thead>
              <tbody>
                {bilan.mois
                  .filter((m) => m.statut !== "planned")
                  .map((m) => (
                    <tr key={m.mois} className="border-b border-border/60">
                      <td className="py-2.5 pr-3">
                        <span className="capitalize">{MOIS[m.mois - 1]}</span>
                        {m.statut === "in-progress" && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-accent">
                            en cours
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {euros(m.caEncaisse)}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-muted">
                        {euros(m.charges)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono tabular-nums ${
                          m.solde >= 0 ? "text-[#5cb87c]" : "text-[#d98080]"
                        }`}
                      >
                        {euros(m.solde)}
                      </td>
                    </tr>
                  ))}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-3 pr-3">Total</td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {euros(bilan.realise.caEncaisse)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-muted">
                    {euros(bilan.realise.charges)}
                  </td>
                  <td
                    className={`py-3 text-right font-mono tabular-nums ${
                      bilan.realise.solde >= 0 ? "text-[#5cb87c]" : "text-[#d98080]"
                    }`}
                  >
                    {euros(bilan.realise.solde)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {dernierEchu && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Le chiffre d&apos;affaires est compté <strong>au mois où
              l&apos;argent est encaissé</strong>, pas au mois de la facture.
              C&apos;est pour cette raison qu&apos;un mois peut être chargé en
              événements et léger en encaissements.
            </p>
          )}
        </section>

        {/* ── Le prévisionnel, nettement séparé ── */}
        {bilan.previsionnel.mois.length > 0 && (
          <section className="mt-10 rounded-lg border border-dashed border-border bg-card/40 p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Mois à venir — prévisionnel
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Ce ne sont <strong>pas</strong> des encaissements constatés. Chaque
              mois est estimé à partir du même mois de {bilan.previsionnel.anneeReference},
              majoré de {Math.round(bilan.previsionnel.croissance * 100)} %.
            </p>
            <table className="mt-4 w-full border-collapse text-sm">
              <tbody>
                {bilan.previsionnel.mois.map((p) => (
                  <tr key={p.mois} className="border-b border-border/40">
                    <td className="py-2 capitalize">{MOIS[p.mois - 1]}</td>
                    <td className="py-2 text-right font-mono text-xs tabular-nums text-muted">
                      {euros(p.reference)} en {bilan.previsionnel.anneeReference}
                    </td>
                    <td className="py-2 pl-4 text-right font-mono tabular-nums">
                      {euros(p.prevu)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2.5" colSpan={2}>
                    Total prévisionnel
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                    {euros(bilan.previsionnel.total)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm">
                  Projection {bilan.annee} — encaissé + prévisionnel
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums text-accent">
                  {euros(bilan.projectionAnnuelle)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── Ce que la page ne dit pas ── */}
        <section className="mt-10 rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Votre position
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Le détail de votre ligne — intérêts dus, versements, échéances — ne
            figure pas ici. Il est en cours de mise au propre avec le cabinet, et
            Étienne vous l&apos;adresse directement.
          </p>
        </section>

        <footer className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted">
          <p>
            Chiffres issus de la comptabilité de Chez les Plombiers SAS
            (Pennylane), hors taxes. Document d&apos;information, sans valeur
            contractuelle.
          </p>
          <p className="mt-2">
            Cette page vous est personnelle — merci de ne pas la transférer.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        {children}
      </div>
    </div>
  );
}

function Chiffre({
  libelle,
  valeur,
  detail,
  accentue,
}: {
  libelle: string;
  valeur: string;
  detail: string;
  accentue?: "positif" | "negatif";
}) {
  const couleur =
    accentue === "positif"
      ? "text-[#5cb87c]"
      : accentue === "negatif"
        ? "text-[#d98080]"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
        {libelle}
      </p>
      <p className={`mt-2 font-mono text-xl font-semibold tabular-nums ${couleur}`}>
        {valeur}
      </p>
      <p className="mt-1 text-[11px] text-muted">{detail}</p>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`border-b border-border pb-2 font-mono text-[9px] uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </th>
  );
}
