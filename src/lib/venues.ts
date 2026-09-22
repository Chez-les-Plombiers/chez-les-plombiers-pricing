import type { TimeSlot } from "@/types";

/**
 * Configuration des trois lieux de CHEZ LES PLOMBIERS.
 *
 * Ce fichier est la SOURCE DE VÉRITÉ des règles métier par lieu : prix,
 * créneaux vendables, calendriers Google, capacité, identité visuelle.
 * Tout ce qui diffère d'un lieu à l'autre doit vivre ici — jamais dans un
 * composant, jamais dans une route.
 *
 * ⚠️ « CHEZ LES PLOMBIERS » est la marque. Le premier lieu s'appelle
 * L'ATELIER (il porte encore le nom de la marque dans beaucoup de systèmes).
 */

export type VenueSlug = "atelier" | "boutique" | "appartement";

/** Lieu retenu quand aucun lieu valide n'est fourni (routes et API). */
export const DEFAULT_VENUE: VenueSlug = "atelier";

/** Ordre d'affichage dans le sélecteur (décision Étienne, 15/09/2026). */
export const VENUE_ORDER: VenueSlug[] = ["atelier", "boutique", "appartement"];

/**
 * Modèle de prix d'un lieu.
 * - `weekday` : grille par jour de semaine (clés ISO, 1 = lundi … 7 = dimanche)
 * - `flat`    : prix unique, tous les jours
 */
export type PricingModel =
  | { kind: "weekday"; prices: Record<number, number> }
  | { kind: "flat"; price: number };

export interface VenueConfig {
  slug: VenueSlug;
  /** Nom affiché dans le sélecteur et les titres. */
  name: string;
  /** Nom court, pour les libellés contraints (emails, CRM, mobile). */
  shortName: string;
  /** Phrase de contexte sous le titre. */
  tagline: string;

  // ── Disponibilité ──────────────────────────────────────────────────────
  /**
   * Calendriers Google. Les identifiants ne sont pas des secrets : ce sont des
   * agendas publics, lus par clé API, et déjà présents dans la documentation
   * du dépôt. Les coder ici plutôt qu'en variables d'environnement supprime
   * cinq occasions de reproduire le bug du `\n` collé en fin de valeur
   * (incident du 26/08/2026).
   */
  calendarValideId: string;
  /**
   * Agenda des options. Depuis le 15/09/2026 les options sont AFFICHÉES au
   * public, en rayures diagonales sombres, pour créer un signal d'urgence
   * sans détourner l'œil : la date se lit « à moitié bloquée ».
   * ⚠️ Revirement assumé : jusqu'ici la règle était de ne pas les lire.
   * ⚠️ Cela ne change RIEN à Calendly : les options ne bloquent toujours pas
   *    les visites, et le garde-fou quotidien ne surveille que VALIDÉ.
   */
  calendarOptionId: string;

  // ── Tarification ───────────────────────────────────────────────────────
  pricing: PricingModel;
  /** Tarif journée complète pendant les périodes Fashion Week. */
  fashionWeekPrice: number;
  /**
   * Créneaux vendables. Un lieu à `["journee-complete"]` n'affiche ni
   * demi-journée ni découpage : la modale montre un seul prix.
   */
  slots: TimeSlot[];
  /** Part du prix journée appliquée aux demi-journées. Absent si un seul créneau. */
  halfDayRatio?: number;
  /**
   * Paliers visuels de demande (rouge / laiton / bleu). Réservé à l'ATELIER :
   * les deux autres lieux ont une grille trop simple pour qu'un dégradé de
   * demande ait un sens, et le calendrier y est plus lisible sans.
   */
  useTiers: boolean;

  // ── Formulaire de devis ────────────────────────────────────────────────
  /**
   * Plafond du champ « nombre d'invités ».
   * `null` = champ libre, non bloquant (cas de LA BOUTIQUE : 40 m², elle
   * n'est pas conçue pour recevoir, mais on n'empêche personne de demander).
   */
  maxGuests: number | null;
  /** Mention de capacité affichée dans l'encart tarifs. */
  capacityLabel: string;

  // ── Conditions de location ─────────────────────────────────────────────
  /**
   * Dépôt de garantie exigé, en euros. `null` = aucune caution.
   * Montants repris des CGL signées (Article 6) — ne pas les modifier ici
   * sans mettre le contrat à jour, sinon le site et le devis divergent.
   */
  deposit: number | null;
}

export const VENUES: Record<VenueSlug, VenueConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  atelier: {
    slug: "atelier",
    name: "L'ATELIER",
    shortName: "Atelier",
    tagline: "200 m² — jusqu'à 200 personnes",
    calendarValideId:
      "c_c1de52d8f5aa41e62bf0988bbb5112c46ee33d12449e22ad9d4d7099dc54a911@group.calendar.google.com",
    calendarOptionId:
      "c_45270acfd91208f973da40660d971d846e0c917d6a15c152543d7e88dc56cfd1@group.calendar.google.com",
    pricing: {
      kind: "weekday",
      prices: {
        1: 1000, // Lundi
        2: 2000, // Mardi
        3: 3000, // Mercredi
        4: 4000, // Jeudi
        5: 3000, // Vendredi
        6: 2000, // Samedi
        7: 2000, // Dimanche
      },
    },
    fashionWeekPrice: 6000,
    // Découpage actuel. La bascule vers « matinée + soirée » (suppression de
    // l'après-midi) est actée mais fera l'objet d'un lot séparé.
    slots: ["matinee", "apres-midi", "journee-complete"],
    halfDayRatio: 0.6,
    useTiers: true,
    maxGuests: 200,
    capacityLabel: "200 m² — jusqu'à 200 personnes",
    deposit: 5000,
  },

  // ─────────────────────────────────────────────────────────────────────────
  boutique: {
    slug: "boutique",
    name: "LA BOUTIQUE",
    shortName: "Boutique",
    tagline: "40 m² — ouverte depuis septembre 2026",
    calendarValideId:
      "c_939acd3e992b2caf998e5c7d05bc4c3b1ccc470ec2e1ea2f0adeddc944afb8fe@group.calendar.google.com",
    calendarOptionId:
      "c_c334efb43aeeb6c41e86d90b4d806b7452af3ef67a964460fb9f6f32a05222f4@group.calendar.google.com",
    // Tarif unique, tous les jours de la semaine (décision Étienne,
    // 15/09/2026). À faire évoluer une fois la demande réelle observée.
    pricing: { kind: "flat", price: 1000 },
    fashionWeekPrice: 2000,
    slots: ["journee-complete"],
    useTiers: false,
    maxGuests: null, // champ libre : le lieu n'est pas fait pour recevoir
    capacityLabel: "40 m² — journée entière",
    // Pas de caution sur LA BOUTIQUE (décision Étienne, 15/09/2026).
    deposit: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  appartement: {
    slug: "appartement",
    name: "L'APPARTEMENT",
    shortName: "Appartement",
    tagline: "100 m² — jusqu'à 50 personnes",
    calendarValideId:
      "c_4342e6b51a4e3714a58db11f59b477f2f57585dd0624d97dac8d8b559f368a16@group.calendar.google.com",
    calendarOptionId:
      "c_90069f68cc6b5c212ee2dc80605ba8eb100ff594f1cdb696513d42d81c67f11a@group.calendar.google.com",
    pricing: {
      kind: "weekday",
      prices: {
        1: 1000, // Lundi
        2: 1000, // Mardi
        3: 1500, // Mercredi
        4: 2000, // Jeudi
        5: 1500, // Vendredi
        6: 1000, // Samedi
        7: 1000, // Dimanche
      },
    },
    fashionWeekPrice: 3000,
    // Journée entière uniquement : l'APPARTEMENT abrite les bureaux et la
    // copropriété est sensible — on ne cherche pas à en maximiser l'occupation.
    slots: ["journee-complete"],
    useTiers: false,
    maxGuests: 50,
    capacityLabel: "100 m² — jusqu'à 50 personnes",
    deposit: 3000,
  },
};

/**
 * Forfait Fashion Week 7 jours de l'APPARTEMENT (15 000 €) : SUPPRIMÉ le
 * 15/09/2026. Comme le prix multi-lieux, une location longue se négocie
 * désormais à la main — c'est un levier commercial, pas une règle du site.
 * Ne pas réintroduire de forfait automatique sans décision explicite.
 */

export function isVenueSlug(value: string): value is VenueSlug {
  return value === "atelier" || value === "boutique" || value === "appartement";
}

export function getVenue(slug: VenueSlug): VenueConfig {
  return VENUES[slug];
}

/** Lieux dans l'ordre d'affichage du sélecteur. */
export function listVenues(): VenueConfig[] {
  return VENUE_ORDER.map((slug) => VENUES[slug]);
}

/** Un lieu vend-il autre chose que la journée entière ? */
export function hasSlots(venue: VenueConfig): boolean {
  return venue.slots.length > 1;
}
