# Pricing Reference — Chez Les Plombiers

> Document interne. Pas dans le build — juste un doc de référence rapide.

## Prix de base par jour de semaine (journée complète, HT)

| ISO | Jour      | Prix   |
|-----|-----------|--------|
| 1   | Lundi     | 1 000€ |
| 2   | Mardi     | 2 000€ |
| 3   | Mercredi  | 3 000€ |
| 4   | Jeudi     | 4 000€ |
| 5   | Vendredi  | 3 000€ |
| 6   | Samedi    | 2 000€ |
| 7   | Dimanche  | 1 000€ |

**Fashion Week :** 6 000€ (journée complète uniquement, pas de demi-journée)

## Demi-journée

60% du prix journée complète (`HALF_DAY_RATIO = 0.6`)

## Fenêtres de réservation (coefficients)

| Fenêtre      | Délai       | Coeff | Label         |
|--------------|-------------|-------|---------------|
| Early Bird   | 6+ mois     | 0.85  | -15%          |
| Standard     | 2-5 mois    | 1.00  | Tarif standard|
| Confirmé     | 2 sem–2 mois| 1.10  | +10%          |
| Last Minute  | < 14 jours  | 0.75  | -25%          |

## Tiers visuels

| Slug          | Label              | Couleur  | Jours                            |
|---------------|--------------------|----------|----------------------------------|
| fashion-week  | Demande élevée     | #DC2626  | Périodes Fashion Week            |
| premium       | Demande moyenne    | #C8A96E  | Mer, Jeu, Ven                    |
| low           | Demande basse      | #3B82F6  | Lun, Mar, Sam, Dim, fériés, etc. |

**Priorité :** Fashion Week > Fériés/Ponts/Vacances > Jour de la semaine

## Fashion Week 2026

- 20-25 Jan : FW Homme
- 26-29 Jan : Haute Couture
- 2-10 Mar : FW Femme PAP
- 23-28 Jun : FW Homme
- 6-9 Jul : Haute Couture
- 28 Sep-6 Oct : FW Femme PAP

## Formule Projection

Pour chaque jour de l'année :

1. Déterminer le tier (FW / premium / low)
2. Calculer le coefficient BW pondéré : `weightedBWCoeff = Σ(mixPercent[w] × coeff[w])`
3. Calculer le revenu :
   - FW : `6000 × weightedBWCoeff × tierOccupancy["fashion-week"]`
   - Premium : `DAY_PRICE[dow] × priceAdjustment[dow] × weightedBWCoeff × tierOccupancy.premium`
   - Low : `DAY_PRICE[dow] × priceAdjustment[dow] × weightedBWCoeff × tierOccupancy.low`

## Fichiers source

- `src/lib/tier-config.ts` — prix, coefficients, tiers
- `src/lib/pricing-engine.ts` — getTierForDate(), getBasePrice(), computeDayPricing()
- `src/lib/calendar-data.ts` — dates FW, fériés, vacances, ponts
- `src/lib/date-utils.ts` — formatage, helpers dates
- `src/lib/projection-engine.ts` — moteur de projection financière
