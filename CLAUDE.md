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
│   ├── admin/                      # Panel admin protégé par mot de passe
│   └── api/
│       ├── admin/auth/             # POST: auth par mot de passe
│       ├── pricing/                # GET: pricing annuel, POST: créer override
│       ├── pricing/[date]/         # PUT/DELETE: modifier/supprimer override
│       ├── availability/           # GET/PUT: jours réservés
│       ├── quote/                  # GET: liste devis (admin), POST: créer devis
│       ├── ical/                   # GET: flux .ics
│       ├── analytics/              # GET/POST: vues par jour
│       └── webhook/bookingshake/   # POST: webhook BookingShake
├── components/                     # Composants React (client/server séparés)
├── lib/
│   ├── pricing-engine.ts           # Logique pure : getTierForDate(), computeYearPricing()
│   ├── calendar-data.ts            # Dates 2026 : FW, fériés, vacances, ponts
│   ├── tier-config.ts              # 4 tiers avec prix et couleurs
│   ├── kv.ts                       # Wrapper Upstash Redis
│   ├── bookingshake.ts             # Appels HTTP vers BookingShake CRM
│   ├── date-utils.ts               # Formatage dates FR
│   ├── ical-generator.ts           # Générateur format iCal
│   └── utils.ts                    # cn() — clsx + tailwind-merge
└── types/index.ts                  # Types TS
```

## Env vars (toutes configurées sur Vercel)
```
ADMIN_PASSWORD=xxx
KV_REST_API_URL=xxx          # Upstash Redis (auto-ajouté par Vercel)
KV_REST_API_TOKEN=xxx        # Upstash Redis (auto-ajouté par Vercel)
BOOKINGSHAKE_API_KEY=xxx     # f556ae48-9ba7-4de3-bd57-2a25876a9588
```

## Priorité des tiers
Fashion Week > Fériés/Ponts/Vacances > Jour de la semaine

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

## Jours passés
Les jours antérieurs à aujourd'hui sont grisés et non cliquables sur le calendrier public.

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- noindex partout (robots.txt + metadata)
- Page publique = `force-dynamic` (lit KV à chaque requête)
