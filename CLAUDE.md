# Chez Les Plombiers — Calendrier de Pricing Dynamique

## Projet
Webapp calendrier affichant les prix de location par jour pour un lieu événementiel brutaliste de 200m² au 39 rue des Bourdonnais, 75001 Paris.

**URL :** `pricing.chezlesplombiers.fr`
**GitHub :** GrowthAgence/chez-les-plombiers-pricing (private)

## Stack
- **Next.js 16** + App Router + TypeScript strict + React 19
- **Tailwind CSS v4** (`@theme inline` dans globals.css)
- **Upstash Redis** pour overrides de prix, demandes de devis, analytics
- **BookingShake API** (`https://api.bookingshake.io/api`) pour sync CRM
- **Vercel** hosting, auto-deploy sur push main

## Commandes
```bash
npm run dev      # Dev server
npm run build    # Build production
npm run lint     # ESLint
```

## Architecture
```
src/
├── app/
│   ├── page.tsx                    # Server (dynamic) : lit overrides KV
│   ├── gate/page.tsx               # Page d'accès par code (cookie 90j)
│   ├── admin/                      # Panel admin protégé par mot de passe
│   └── api/
│       ├── admin/auth/             # POST: auth par mot de passe
│       ├── admin/calendar-password/ # GET/PUT: mot de passe calendrier (KV)
│       ├── gate/                   # POST: vérification code → set cookie
│       ├── pricing/                # GET: pricing annuel, POST: créer override
│       ├── pricing/[date]/         # PUT/DELETE: modifier/supprimer override
│       ├── availability/           # GET/PUT: jours réservés
│       ├── quote/                  # GET: liste devis (admin), POST: créer devis → KV + BookingShake
│       ├── ical/                   # GET: flux .ics
│       ├── analytics/              # GET/POST: vues par jour
│       └── webhook/bookingshake/   # POST: webhook BookingShake
├── middleware.ts                    # Auth cookie gate (redirige vers /gate si pas de cookie)
├── components/
│   ├── CalendarHeatmap.tsx          # Grille annuelle 12 mois
│   ├── MonthGrid.tsx                # Grille 7 colonnes L-D
│   ├── DayCell.tsx                  # Cellule jour : split matin/après-midi (sauf FW = unie)
│   ├── DayModal.tsx                 # Dialog prix détaillés + CTA devis
│   ├── QuoteForm.tsx                # Formulaire demande de devis
│   ├── SaveBadge.tsx                # Badge vert "-X%" (basé sur coeff booking window)
│   ├── TierLegend.tsx               # Légende 3 couleurs + réservé
│   ├── MonthNavigator.tsx           # Nav mois (mobile only, sm:hidden)
│   ├── AdminCalendar.tsx            # Calendrier admin + analytics + devis + mot de passe
│   ├── AdminDayEditor.tsx           # Édition prix/tier/dispo d'un jour
│   └── AdminBulkEditor.tsx          # Édition en masse (plage dates / jours semaine)
├── lib/
│   ├── pricing-engine.ts           # getTierForDate(), getBasePrice(), getBookingWindow(), computeYearPricing()
│   ├── calendar-data.ts            # Dates 2026 : FW, fériés, vacances, ponts
│   ├── tier-config.ts              # 4 tiers (visual), prix par jour de semaine, booking windows
│   ├── kv.ts                       # Wrapper Upstash Redis (overrides, devis, analytics, calendar password)
│   ├── bookingshake.ts             # Appels HTTP vers BookingShake CRM
│   ├── date-utils.ts               # Formatage dates FR
│   ├── ical-generator.ts           # Générateur format iCal
│   └── utils.ts                    # cn() — clsx + tailwind-merge
└── types/index.ts                  # Types TS
```

## Env vars (toutes configurées sur Vercel)
```
ADMIN_PASSWORD=xxx
CALENDAR_PASSWORD=xxx        # Code d'accès calendrier public (fallback si KV vide)
KV_REST_API_URL=xxx          # Upstash Redis (auto-ajouté par Vercel)
KV_REST_API_TOKEN=xxx        # Upstash Redis (auto-ajouté par Vercel)
BOOKINGSHAKE_API_KEY=xxx     # f556ae48-9ba7-4de3-bd57-2a25876a9588
```

## Yield Management — Pricing Dynamique

### Prix de base par jour de semaine (journée complète, HT)
| Jour | Prix |
|------|------|
| Lundi | 1 000 € |
| Mardi | 2 000 € |
| Mercredi | 3 000 € |
| Jeudi | 4 000 € |
| Vendredi | 3 000 € |
| Samedi | 2 000 € |
| Dimanche | 1 000 € |
| Fashion Week | 6 000 € |

### Demi-journée
60% du prix journée complète (constante `HALF_DAY_RATIO`)

### Fenêtres de réservation (coefficients)
| Fenêtre | Délai | Coefficient |
|---------|-------|-------------|
| Early Bird | 6+ mois | -15% (×0.85) |
| Standard | 2-5 mois | ×1.0 |
| Confirmé | 2 sem – 2 mois | +10% (×1.1) |
| Last Minute | < 14 jours | -25% (×0.75) |

### Fashion Week
- Journée complète uniquement (pas de demi-journée)
- DayCell = couleur rouge unie (pas de split matin/après-midi)
- Admin : seul le prix journée complète est éditable

## 3 Tiers visuels
| Tier | Label | Couleur | Jours |
|------|-------|---------|-------|
| fashion-week | Demande élevée | Rouge #DC2626 | Périodes FW |
| premium/medium | Demande moyenne | Laiton #C8A96E | Mer, Jeu, Ven |
| low | Demande basse | Bleu #3B82F6 | Lun, Mar, Sam, Dim, fériés, ponts, vacances |

### Priorité des tiers
Fashion Week > Fériés/Ponts/Vacances > Jour de la semaine

## Accès calendrier public
- Protégé par code d'accès (page /gate, cookie `clp-access` 90j)
- Code modifiable depuis l'admin (panneau "Mot de passe")
- Stocké en KV (`pricing:calendar-password`), fallback env var `CALENDAR_PASSWORD`

## BookingShake
- **API :** `https://api.bookingshake.io/api` — auth `Bearer <API_KEY>`
- **Créer événement :** `POST /events/create` — date DD-MM-YYYY, pax en string
- **Source :** `source_id: "D1uUppihf0ACPSs6o9pV"` = "Site internet"
- **Espace :** `space_id: "2F6ElGOfOrVpoI3iLdfn"` = "Chez les Plombiers"
- **Statuts confirmés :** Validé, En cours, Option posée, Derniers détails, Attente paiement
- **Statuts annulés :** Perdu (dispo/budget/concurrence/autre), Refusé, Clôturé
- **Webhook :** configuré sur "Compte mis à jour" → `POST /api/webhook/bookingshake`
- **Limitation :** pas de webhook sur réservations, pas de GET events — demande envoyée à BookingShake pour ajout
- **MCP server :** `/Users/fred/bookingshake-mcp-server/` (stdio, node)
- **Devis :** formulaire → stocké KV + envoi BookingShake (non-bloquant, fail silencieux)

## Jours passés
Les jours antérieurs à aujourd'hui sont grisés et non cliquables sur le calendrier public.

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- noindex partout (robots.txt + metadata)
- Page publique = `force-dynamic` (lit KV à chaque requête)
- SaveBadge = vert emerald, basé sur coeff booking window (pas de comparaison cross-tier)
