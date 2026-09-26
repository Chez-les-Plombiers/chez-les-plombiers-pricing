# Dashboard Finances — spécification des indicateurs

`pricing.chezlesplombiers.fr/tarifs/admin/finances`
Établi le 26/09/2026 avec Étienne. **Document de référence : le code s'y conforme, pas
l'inverse.** Lu par le fil AUDIT (qui définit la méthode) et par le fil SITE CLP (qui
implémente).

---

## 1. À quoi sert ce tableau — et à quoi il ne sert pas

| | Ce dashboard | Le plan 13 semaines |
|---|---|---|
| Question | **« est-ce que ça marche ? »** | « est-ce que je peux payer ? » |
| Horizon | l'année civile, mois par mois | 13 semaines glissantes |
| Périmètre | **CLP seule** | consolidé CLP + AAA + ATN |
| Nature | rétrospectif, constaté | prospectif, projeté |
| Vit dans | `chez-les-plombiers-pricing` | `clp-finance/reports/` |

Les deux sont complémentaires et **ne doivent jamais afficher le même chiffre sous le
même nom**. Ici on constate, là-bas on projette.

## 2. La base retenue : la caisse, pas l'engagement

Le cabinet tient les comptes en **base engagement** : une facture compte à son émission,
les travaux se déduisent par amortissement sur plusieurs années.

Ce tableau est en **base caisse** : ça compte quand l'argent bouge. C'est une méthode
reconnue, et c'est celle qui correspond au pilotage d'Étienne.

> 🔴 **Conséquence à ne jamais perdre de vue : le résultat de ce tableau ne sera JAMAIS
> égal au résultat comptable du cabinet.** Ce n'est pas un défaut. Les deux mesurent des
> choses différentes. C'est pourquoi le mot « résultat » est proscrit ici.

**Règle qui en découle — remboursement de capital OU amortissement, jamais les deux.**
En base caisse : le remboursement d'emprunt compte en entier (capital + intérêts +
assurance), l'amortissement n'existe pas. Le cabinet fait l'inverse. Les deux sont
justes ; les mélanger ne l'est pas.

## 3. Deux blocs, deux unités, jamais additionnés

### Bloc A — Activité, en HT

Mesure la **performance commerciale** et permet le comparatif avec l'an passé.

| Indicateur | Définition |
|---|---|
| **CA encaissé HT** | factures Pennylane de nature LOCATION ou PRESTATION, **payées**, montant HT, attribuées au **mois du paiement** |
| **CA encaissé HT N−1** | le même, l'année précédente, pour le même mois |
| **Jours vendus** | union des jours-lieu couverts par ces factures (⚠️ voir §6) |

⚠️ **L'attribution est le mois du PAIEMENT, pas celui de l'évènement.** Chez CLP le
paiement intégral est exigé **avant** l'évènement, à la validation de la date : une date
de novembre vendue en septembre est encaissée en septembre. Le carnet de commandes futur
est donc **déjà encaissé** — lire le calendrier comme un échéancier de recettes est une
erreur.

### Bloc B — Trésorerie d'exploitation, en TTC

Mesure ce qui a **réellement bougé sur les comptes**. C'est le « vrai argent ».

| Indicateur | Définition |
|---|---|
| **Encaissements** | crédits des comptes CLP, TTC |
| **Décaissements** | débits des comptes CLP, TTC, **y compris la TVA reversée** |
| **Solde d'exploitation** | la différence. **Ne jamais l'appeler « résultat »** |
| **Cumul mobile 12 mois** | somme glissante du solde — lisse la saisonnalité, montre la tendance |

⚠️ **Pourquoi TTC ici et HT là-bas.** En caisse, la TVA encaissée entre puis ressort :
la compter d'un côté seulement gonflerait le solde de 20 %. On la garde donc des deux
côtés, et le solde devient exactement la variation de trésorerie. Le bloc A, lui, reste
en HT — sinon la marge ne veut rien dire.

## 4. Ce qui n'entre dans aucun des deux

Ces flux traversent les comptes sans être de l'exploitation :

- **Les dépôts de garantie**, à l'entrée comme à la restitution. Ce sont des dettes
  envers les clients. Identifiés par la **ligne d'article** de la facture — jamais par le
  montant, le mot-clé, la TVA nulle seule ni l'objet (voir `CLAUDE.md` du projet pricing).
- **Les virements internes** entre comptes CLP.
- **Les flux AAA ↔ CLP et ATN ↔ CLP** : compte courant d'associé, convention du
  15/05/2024. Ni produit, ni charge.
- **Les déblocages de prêt** : financement, pas recette.
- **Les remboursements fiscaux ou sociaux**.

## 5. Les charges fixes — ce qui est faux aujourd'hui

Le code porte `finance-defaults.ts` avec un seul loyer de 5 000 €. La réalité, établie
le 23/09/2026 sur les avis d'échéance (voir `FINANCE-TIERS.md`) :

| Lieu | Bailleur | Payé par | Montant |
|---|---|---|---:|
| L'ATELIER | François Fabra | **CLP** | 5 000 €/mois |
| L'APPARTEMENT | Marie-Hélène Fabra, *sa cousine* | **AAA** | 4 400 €/mois |
| LA BOUTIQUE | SCI Diderot Beccaria (Gratade) | CLP | **franchise** — 144 €/mois de charges seules |

🔴 **LA BOUTIQUE est en franchise de loyer depuis le 01/05/2026.** Les « 2 250 € »
qu'Étienne prenait pour un loyer sont le **dépôt de garantie**, jamais versé. La date de
fin de franchise est dans le bail — **c'est une marche de charge à venir**, à récupérer.

⚠️ Un virement `LOYER AAA` de 4 400 € part pourtant du compte CLP certains mois. À
qualifier : refacturation de L'APPARTEMENT, ou autre chose. Non tranché.

**Pas de coût salarial** : Céline est portée par AAA. À intégrer le jour où ce ne sera
plus le cas. La rémunération d'Étienne n'est **pas** une charge fixe — il se paie ce qui
reste, plancher 1 500 €/mois.

## 6. Ce qui n'est pas encore possible

**Le comptage des jours vendus 2026.** Il suppose un rattachement facture → évènement,
qui vient d'un registre tenu à la main. Couverture : **100 % sur 2025, 4 % sur 2026.**
Tant que ce n'est pas comblé, l'indicateur « jours vendus » ne peut être affiché que
pour 2025, et le prix moyen par jour avec lui.

## 7. L'année civile, et pourquoi

L'activité est **violemment saisonnière** : juin et novembre ont pesé plus de la moitié
de 2025. Une fenêtre glissante comparerait des périodes de composition différente, sans
qu'on sache si une variation vient du business ou du calendrier.

L'année civile permet le seul comparatif qui vaille : **septembre 2026 contre septembre
2025**. Le cumul mobile 12 mois, en indicateur secondaire, donne la tendance de fond.

## 8. Ce qui reste à trancher

1. Le virement `LOYER AAA` de 4 400 € depuis CLP — que couvre-t-il ?
2. La date de fin de franchise de LA BOUTIQUE.
3. Les « intérêts obligataires 14 700 € » inscrits en septembre dans `finance-defaults.ts` —
   à rapprocher des sept obligataires OCA identifiés par le fil pilotage.
