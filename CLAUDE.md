# Chez Les Plombiers — Calendrier de Pricing Dynamique

## Projet
Webapp calendrier affichant les prix de location par jour pour un lieu événementiel brutaliste de 200m² au 39 rue des Bourdonnais, 75001 Paris.

**URL :** `pricing.chezlesplombiers.fr`
**GitHub :** GrowthAgence/chez-les-plombiers-pricing (private)

## Stack
- **Next.js 16** + App Router + TypeScript strict + React 19
- **Tailwind CSS v4** (`@theme inline` dans globals.css)
- **Upstash Redis** pour overrides de prix, demandes de devis, analytics
- **Pipedrive API** (`https://api.pipedrive.com/v1`) pour sync CRM
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
│       ├── quote/                  # GET: liste devis (admin), POST: créer devis → KV + Pipedrive
│       ├── ical/                   # GET: flux .ics
│       ├── analytics/              # GET/POST: vues par jour
│       └── webhook/pipedrive/      # POST: webhook Pipedrive (deal stage change)
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
│   ├── pipedrive.ts               # Appels HTTP vers Pipedrive CRM (Person + Org + Deal + Note)
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
PIPEDRIVE_API_TOKEN=xxx      # API token Pipedrive CRM
```

## Analytics
- **GA4**: G-LHBRR8HRC3 (data stream "Pricing Calendar", même propriété que le site principal)
- **Clarity**: vju7iukwc9 (raw `<script>` dans `<head>`, pas `<Script>` Next.js)

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

## Pipedrive CRM
- **API :** `https://api.pipedrive.com/v1` — auth via `?api_token=xxx`
- **Pipeline :** "Pipeline Principal" (ID: 1)
- **Stages :** 1=Nouvelle demande, 2=Visite Planifiée, 3=Visite faite, 4=Devis envoyé, 5=Devis Relancé, 7=Demande Confirmée, 6=Paiement reçu
- **Création deal :** Person → (optionnel) Organization → Deal en stage 1 + Note épinglée
- **Titre deal :** `CLP — DD/MM/YYYY — Prénom Nom — TypeEvent` (la date est parsée par le webhook)
- **Webhook :** deal updated → `POST /api/webhook/pipedrive`
  - Stage 7 ou 6 → marque la date comme réservée dans KV
  - Deal lost → libère la date dans KV
  - Retour d'un stage booked → libère la date
- **Devis :** formulaire → stocké KV + envoi Pipedrive (non-bloquant, fail silencieux)

## Jours passés
Les jours antérieurs à aujourd'hui sont grisés et non cliquables sur le calendrier public.

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- noindex partout (robots.txt + metadata)
- Page publique = `force-dynamic` (lit KV à chaque requête)
- SaveBadge = vert emerald, basé sur coeff booking window (pas de comparaison cross-tier)
