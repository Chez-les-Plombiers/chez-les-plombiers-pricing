# Chez Les Plombiers — Calendrier de Pricing Dynamique

## Projet
Webapp calendrier affichant les prix de location par jour pour un lieu événementiel brutaliste de 200m² au 39 rue des Bourdonnais, 75001 Paris.

## Stack
- **Next.js 16** + App Router + TypeScript strict + React 19
- **Tailwind CSS v4** (`@theme inline` dans globals.css)
- **Upstash Redis** (ex Vercel KV) pour overrides de prix et demandes de devis
- **BookingShake API** pour sync CRM
- **Vercel** hosting → `pricing.chezlesplombiers.fr`

## Commandes
```bash
npm run dev      # Dev server
npm run build    # Build production
npm run lint     # ESLint
```

## Architecture
- `src/lib/pricing-engine.ts` — logique de pricing pure (pas de side effects)
- `src/lib/calendar-data.ts` — dates FW, fériés, vacances, ponts 2026
- `src/lib/tier-config.ts` — 4 tiers (fashion-week, premium, medium, low)
- `src/lib/kv.ts` — wrapper Upstash Redis
- `src/lib/bookingshake.ts` — adaptateur CRM
- `src/components/` — composants React (client/server séparés)
- `src/app/api/` — routes API (pricing, quote, ical, analytics, admin)
- `src/app/admin/` — panel admin protégé par mot de passe

## Env vars requises
```
ADMIN_PASSWORD=xxx
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
BOOKINGSHAKE_API_KEY=xxx
```

## Priorité des tiers
Fashion Week > Fériés/Ponts/Vacances > Jour de la semaine

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- noindex partout
