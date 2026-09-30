"use client";

import { useEffect, useState } from "react";
import type { Bilan } from "@/lib/bilan";
import type { Position } from "@/lib/oca";

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

const jourMois = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

interface Porteur {
  nom: string;
  nominal: number;
  conteste: boolean;
}

interface Reponse {
  porteur: Porteur;
  position: Position | null;
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

  const { porteur, position, bilan } = data;
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

          {/*
            ⚠️ CETTE MENTION N'EST PAS UNE PRÉCAUTION D'AVOCAT, C'EST UNE
            CORRECTION DE LECTURE. Le tableau montre les charges réellement
            décaissées par CLP. Or ARCHIBALD & ABRAHAM, sa société MÈRE, porte des
            charges dont CLP bénéficie — le fil COMPTA CLP en a relevé pour
            environ 66 000 € sur 2026 : honoraires du cabinet, rémunération
            administrative, télécoms, maintenance réseau. Sans convention de
            refacturation, et sans refacturation constatée. Un lecteur qui voit
            un compte d'exploitation sans la moindre ligne de comptabilité ni
            de personnel se demandera ce qu'on lui cache, et il aura raison.

            🔴 ON NE PUBLIE PAS LES 66 000 €. C'est un repérage par mots-clés
            sur les libellés bancaires, pas un audit : une partie des salaires
            relève peut-être d'AAA en propre, et les lignes télécoms couvrent
            les deux sociétés. Publier ce total donnerait une précision qu'il
            n'a pas. On publie le COMPTE COURANT, qui est au bilan et qui
            mesure l'accumulation.

            ⚠️ ET ON NE CHIFFRE PAS DE QUOTE-PART. Aucune clé n'est défendable :
            le cabinet lui-même n'a pas arbitré le sujet, qu'il a classé comme
            « problématique fiscale à traiter en 2026 » — le même sujet que le
            bail de L'APPARTEMENT. Un pourcentage inventé serait pire que le
            silence.
          */}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Certaines charges bénéficiant à Chez les Plombiers sont portées par{" "}
            <strong>Archibald &amp; Abraham</strong>, sa société mère : honoraires
            du cabinet comptable, rémunération administrative, une partie des
            frais de télécommunications et de maintenance réseau. Elles ne
            figurent pas dans les charges ci-dessus. Le compte courant entre les
            deux sociétés s&apos;élevait à environ 130 000 € au 31 décembre 2025,
            selon les comptes en cours d&apos;arrêté. La répartition définitive
            sera fixée avec le cabinet sur l&apos;exercice 2026.
          </p>

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

        {/* ── Votre position ── */}
        <VotrePosition porteur={porteur} position={position} />

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

/**
 * Le bloc « votre position ».
 *
 * 🔴 CE QUI EST AFFICHÉ ICI ENGAGE LA SOCIÉTÉ. Décision d'Étienne, 30/09/2026 :
 * « oui, et ça me va, je leur dois de l'argent ». Ne pas retirer ce bloc, ni
 * l'édulcorer, sans le lui redemander.
 *
 * ⚠️ ON MONTRE LE BRUT **ET** LE NET quand il y a retenue à la source. Afficher
 * le seul brut à une personne physique promettrait 30 % de plus qu'elle ne
 * touchera ; afficher le seul net masquerait un prélèvement qu'elle doit
 * pouvoir déclarer. Les deux, ou rien.
 *
 * ⚠️ LES INTÉRÊTS DE RETARD SONT COMPTÉS, en faveur du porteur (art. 4.5, 10 %).
 * Les taire donnerait un chiffre faux, et faux à la baisse — c'est-à-dire un
 * chiffre qui arrange la société. On ne fait pas ça sur une page qu'on envoie
 * à un créancier.
 */
function VotrePosition({
  porteur,
  position,
}: {
  porteur: Porteur;
  position: Position | null;
}) {
  if (porteur.conteste || !position) {
    return (
      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Votre position
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Le détail de votre ligne fait l&apos;objet d&apos;un échange en cours.
          Étienne vous l&apos;adresse directement.
        </p>
      </section>
    );
  }

  const aRetenue = position.totalRetenue > 0;
  const aRegler = position.resteDuAvecRetard > 0.5;
  // La dernière échéance échue porte la date limite de paiement la plus
  // récente — c'est celle qui intéresse un porteur qui attend son virement.
  //
  // ⚠️ ON NE L'AFFICHE QUE SI ELLE EST ENCORE DEVANT NOUS. Sur une ligne cédée,
  // la limite est la date de cession, donc passée : l'annoncer sous « à régler
  // au plus tard le » ferait lire une échéance à venir là où il y a un retard.
  const derniere = position.echeances[position.echeances.length - 1];
  const limite =
    derniere && derniere.exigibleLe >= new Date().toISOString().slice(0, 10)
      ? derniere
      : null;

  return (
    <section className="mt-10 rounded-lg border border-accent/40 bg-card p-5">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        Votre position
      </h2>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
            Nominal souscrit
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">
            {euros(position.nominalTotal)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
            Taux
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">
            {(position.taux * 100).toFixed(0)} %
          </p>
        </div>
        {position.prochaineEcheance && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
              Prochaine échéance
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {jourMois(position.prochaineEcheance)}
            </p>
          </div>
        )}
        {limite && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
              À régler au plus tard le
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {jourMois(limite.exigibleLe)}
            </p>
          </div>
        )}
      </div>

      {/* Les échéances échues, année par année */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              <Th className="text-left">Période</Th>
              {aRetenue && <Th className="text-right">Brut</Th>}
              {aRetenue && <Th className="text-right">Retenue 30 %</Th>}
              <Th className="text-right">{aRetenue ? "Net dû" : "Dû"}</Th>
              <Th className="text-right">Reçu</Th>
              <Th className="text-right">État</Th>
            </tr>
          </thead>
          <tbody>
            {position.echeances.map((e) => {
              const solde = e.restant <= 0.5;
              const entame = e.regle > 0.5;
              return (
                <tr key={e.date} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <div>{e.libelle}</div>
                    {/* La période en clair, en second rang : c'est l'année qui
                        parle au lecteur, la date sert à lever un doute. */}
                    <div className="font-mono text-[10px] text-muted">
                      {e.periode}
                    </div>
                  </td>
                  {aRetenue && (
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted">
                      {euros(e.brut)}
                    </td>
                  )}
                  {aRetenue && (
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted">
                      −{euros(e.retenue)}
                    </td>
                  )}
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    {euros(e.net)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-muted">
                    {euros(e.regle)}
                  </td>
                  <td className="py-2.5 text-right">
                    {solde ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#5cb87c]">
                        Payé
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider ${
                          entame ? "text-accent" : "text-[#d98080]"
                        }`}
                      >
                        {entame ? "Partiel" : "Non payé"} · {euros(e.restant)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Le solde */}
      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        {position.totalInteretsDeRetard > 0.5 && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-muted">
              Intérêts de retard (10 %, art. 4.5)
            </span>
            <span className="font-mono tabular-nums text-muted">
              {euros(position.totalInteretsDeRetard)}
            </span>
          </div>
        )}
        {position.tropVerse > 0.5 && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-muted">
              Avance déjà versée, imputée sur la suite
            </span>
            <span className="font-mono tabular-nums text-muted">
              {euros(position.tropVerse)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <span className="font-semibold">
            {aRegler ? "Reste dû à ce jour" : "Solde"}
          </span>
          <span
            className={`font-mono text-xl font-semibold tabular-nums ${
              aRegler ? "text-[#d98080]" : "text-[#5cb87c]"
            }`}
          >
            {euros(position.resteDuAvecRetard)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {aRetenue ? (
          <>
            Vous êtes imposé au prélèvement forfaitaire unique : la société
            retient <strong>30 %</strong> à la source (12,8 % d&apos;acompte
            d&apos;impôt sur le revenu et 17,2 % de prélèvements sociaux) et les
            reverse au Trésor. Le montant « net dû » est ce que vous recevez ;
            le brut est ce que vous déclarez.{" "}
          </>
        ) : null}
        Intérêts calculés au taux de {(position.taux * 100).toFixed(0)} % l&apos;an,
        base 365 jours, non capitalisés, à compter du 24 septembre 2024 — date
        de souscription au sens du contrat. Chaque annuité est exigible à la
        date anniversaire, et payable au plus tard le dernier jour ouvré du
        trimestre civil suivant.
      </p>
    </section>
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
