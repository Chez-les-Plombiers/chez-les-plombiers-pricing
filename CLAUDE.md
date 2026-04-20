# Chez Les Plombiers — Calendrier de Pricing Dynamique

## Projet
Webapp calendrier affichant les prix de location par jour pour un lieu événementiel brutaliste de 200m² au 39 rue des Bourdonnais, 75001 Paris.

**URL :** `pricing.chezlesplombiers.fr`
**GitHub :** GrowthAgence/chez-les-plombiers-pricing (private)

## Stack
- **Next.js 16** + App Router + TypeScript strict + React 19
- **Tailwind CSS v4** (`@theme inline` dans globals.css)
- **Upstash Redis** pour overrides de prix, demandes de devis, analytics, données finances
- **Google Calendar API** pour la disponibilité (source of truth)
- **Pennylane API** (`app.pennylane.com/api/external/v2`) pour facturation / CA
- **Pipedrive API** (`https://api.pipedrive.com/v1`) pour sync CRM
- **Chart.js** + react-chartjs-2 pour graphiques finances
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
│   │   ├── page.tsx / client.tsx   # Dashboard calendrier admin
│   │   ├── projections/            # Projections financières (scénarios)
│   │   └── finances/               # Dashboard finances (CA Pennylane + manuel)
│   └── api/
│       ├── admin/auth/             # POST: auth par mot de passe
│       ├── admin/calendar-password/ # GET/PUT: mot de passe calendrier (KV)
│       ├── gate/                   # POST: vérification code → set cookie
│       ├── pricing/                # GET: pricing annuel, POST: créer override
│       ├── pricing/[date]/         # PUT/DELETE: modifier/supprimer override
│       ├── availability/           # GET/PUT: jours réservés
│       ├── quote/                  # GET: liste devis (admin), POST: créer devis → KV + Pipedrive
│       ├── finances/               # GET: données 12 mois + factures Pennylane
│       ├── finances/[year]/[month]/ # PATCH: MAJ statut/CA/charges d'un mois
│       ├── finances/reset/[year]/  # POST: réinitialiser aux valeurs par défaut
│       ├── finances/export/        # GET: export CSV
│       ├── finances/invoice-override/ # POST: réattribuer une facture à un autre mois
│       ├── ical/                   # GET: flux .ics
│       ├── analytics/              # GET/POST: vues par jour
│       ├── webhook/pipedrive/      # POST: webhook Pipedrive (deal stage change → KV)
│       ├── webhook/calendly/      # POST: webhook Calendly (invitee.created → Pipedrive deal)
│       └── webhook/email-lead/    # POST: webhook générique email (n8n → Pipedrive deal, auth X-Webhook-Secret)
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
│   ├── AdminBulkEditor.tsx          # Édition en masse (plage dates / jours semaine)
│   └── FinancesDashboard.tsx        # Dashboard finances (cartes, chart, tableau, tiroirs factures)
├── lib/
│   ├── pricing-engine.ts           # getTierForDate(), getBasePrice(), getBookingWindow(), computeYearPricing()
│   ├── calendar-data.ts            # Dates 2026 : FW, fériés, vacances, ponts
│   ├── tier-config.ts              # 4 tiers (visual), prix par jour de semaine, booking windows
│   ├── kv.ts                       # Wrapper Upstash Redis (overrides, devis, analytics, calendar password, finances)
│   ├── pennylane.ts               # Client API Pennylane (factures, agrégation mensuelle, réattribution)
│   ├── finance-defaults.ts        # Charges fixes, prévisionnels par défaut (2025/2026)
│   ├── pipedrive.ts               # Appels HTTP vers Pipedrive CRM (Person + Org + Deal + Note)
│   ├── google-calendar.ts         # Fetch Google Calendar events → booking slots (source of truth dispo)
│   ├── email.ts                   # Notifications email Resend (devis → 3 destinataires)
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
CALENDLY_API_TOKEN=xxx       # Personal Access Token Calendly (user: chezlesplombiers)
RESEND_API_KEY=xxx           # Resend (domaine chezlesplombiers.fr vérifié)
GOOGLE_CALENDAR_ID=xxx       # ID du calendrier Google (source of truth dispo)
GOOGLE_CALENDAR_API_KEY=xxx  # API key GCP (projet chez-les-plombiers-490515)
PENNYLANE_API_KEY=xxx        # Bearer token Pennylane (facturation / CA)
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

## Google Calendar — Source of truth disponibilité
- **Calendrier :** "PLOMBIERS / VALIDÉ" — `c_c1de52d8f5aa41e62bf0988bbb5112c46ee33d12449e22ad9d4d7099dc54a911@group.calendar.google.com`
- **GCP :** projet `chez-les-plombiers-490515`, API key publique (calendrier public)
- **Logique demi-journée :**
  - Event 7h–13h → matin réservé (`isBookedMorning`)
  - Event 13h–19h → après-midi réservé (`isBookedAfternoon`)
  - Event chevauchant les deux → journée complète (`isBooked`)
  - Event all-day → journée complète
  - Deux demi-journées séparées le même jour → journée complète
- **Merge :** les bookings GCal sont mergés dans les overrides KV avant `computeYearPricing()`, dans `page.tsx` (SSR) et `GET /api/pricing` (admin/API)
- **Cache :** `cache: "no-store"` — chaque requête page/API refetch le calendrier Google
- **Important :** les events doivent être sur le calendrier "PLOMBIERS / VALIDÉ", pas sur un calendrier perso

## Accès calendrier public
- Protégé par code d'accès (page /gate, cookie `clp-access` 90j)
- Code modifiable depuis l'admin (panneau "Mot de passe")
- Stocké en KV (`pricing:calendar-password`), fallback env var `CALENDAR_PASSWORD`

## Pipedrive CRM
- **API :** `https://api.pipedrive.com/v1` — auth via `?api_token=xxx`
- **Pipeline :** "Pipeline Principal" (ID: 1)
- **Stages :** 1=DEMANDE D'INFOS, 2=OPTION POSÉE, 7=VALIDÉ
- **Création deal (calendrier):** Person → (optionnel) Organization → Deal (stage 1) + Note épinglée
- **Création deal (Calendly):** Person → Deal (stage 2 "OPTION POSÉE") + Note épinglée
- **Titre deal :** `Entreprise — DD/MM/YYYY Matin — TypeEvent` (créneau : Matin/Après-midi/Journée, multi-jours : `DD/MM → DD/MM`). Le contact s'affiche automatiquement en ligne 2 via person_id.
- **Valeur deal :** prix HT total (somme de tous les jours) calculé par le pricing engine (date + créneau + booking window + overrides)
- **Champs custom deal :**
  - `05834ee04351a62a91908c3b409ed21b388cf09e` = Nombre d'invités (double)
  - `b077edaa62f510022521226b4a9631e90f1b04c4` = Type d'évènement (varchar)
  - `71ec4d9da53a2578ac16a356018cddf3cf823a24` = Source (varchar : "Calendrier tarifaire", "Calendly", ou nom plateforme)
  - `93cd462c774cf9c948185b75cdc08c40ea32f7e0` = Canal d'origine (enum, ID 49) — dropdown 14 options :
    27=Réseau Perso, 28=Instagram, 29=WhatsApp, 30=Calendrier tarifaire, 31=Calendly,
    32=Plateforme, 33=Email, 34=Homemade, 35=Space to Pop, 36=Snap Event,
    37=Kactus, 38=Office Rider, 39=Peerspace, 40=Xnomad
  - Auto-rempli : calendrier→30, Calendly→31, email webhook→mapping par source (fallback 33/Email)
  - `d2b97f2477d6c3dc6b5b257add8abef4dc48b9b7` = Client final (varchar) — marque/client pour qui l'agence réserve (ex: Nike, Ikea)
- **Note épinglée :** date(s), créneau, prix HT (détail par jour si multi-jours), fenêtre, type, invités, entreprise, SIRET, message
- **Webhook Pipedrive :** désactivé (noop) — la disponibilité est gérée exclusivement par Google Calendar
- **Webhook Calendly :** invitee.created → `POST /api/webhook/calendly`
  - Fetch event details via Calendly API (date/heure visite)
  - Crée Person + Deal stage 2 + Note épinglée (source "Calendly")
- **Webhook email-lead :** `POST /api/webhook/email-lead` (auth `X-Webhook-Secret: ADMIN_PASSWORD`)
  - Endpoint générique pour leads parsés par n8n (Kactus, etc.)
  - Payload : `{ source, name, email, phone, company, date, eventType, guestCount, message }`
  - Crée Person + Org + Deal stage 1 + Note épinglée
  - Workflow n8n prêt : `n8n-workflows/kactus-email-to-pipedrive.json`
- **Devis :** formulaire → stocké KV + envoi Pipedrive (await, avec error logging) + email notification
- **MCP server :** `@iamsamuelfraga/mcp-pipedrive` (stdio, npx) — configuré dans Claude Code pour ce projet, env var `PIPEDRIVE_API_TOKEN`

## Notifications email (Resend)
- **Provider :** Resend — domaine `chezlesplombiers.fr` vérifié
- **From :** `Calendrier CLP <notifications@chezlesplombiers.fr>`
- **Destinataires :** etienne@chezlesplombiers.fr, celine@chezlesplombiers.fr, frederic@chezlesplombiers.fr
- **Déclencheur :** chaque `POST /api/quote` (après KV + Pipedrive, fail silently)
- **Contenu :** contact, email, tél, entreprise/SIRET, client final, date(s), créneau, type, invités, message

## Formulaire devis (QuoteForm)
- **Types d'évènement :** Défilé/Fashion show, Lancement produit, Cocktail/Soirée, Petit-déjeuner, Tournage/Shooting, Conférence/Séminaire, Formation, Exposition, Pop-up store, Autre
- **Capacité max :** 200 invités
- **Autocomplete entreprise :** API SIRENE (`recherche-entreprises.api.gouv.fr/search`) — debounce 300ms, max 5 suggestions (nom + SIRET + ville)
- **Champ SIRET :** pré-rempli par l'autocomplete (readonly si 14 chars), éditable manuellement sinon
- **Multi-jours consécutifs :** select 1-7 jours, breakdown prix par jour affiché, total calculé en temps réel, warning si jour indisponible
- **Données transitées :** company, siret, endClient, numberOfDays dans le payload → KV + Pipedrive
- **Mention légale :** "*prix indicatif pour location sèche." sous le récap prix

## Jours passés
Les jours antérieurs à aujourd'hui sont grisés et non cliquables sur le calendrier public.

## Affichage demi-journées réservées
- DayCell (public) et AdminCalendar (admin) affichent un split matin/après-midi
- Demi-journée réservée = `bg-tier-booked/80` (gris visible sur fond sombre)
- Demi-journée dispo = couleur du tier à opacity-20
- Journée complète réservée = cellule disabled `bg-tier-booked/40`
- La disponibilité est déterminée par Google Calendar (source of truth)

## Pennylane — Facturation & CA
- **API :** `https://app.pennylane.com/api/external/v2` — auth Bearer token
- **Endpoint principal :** `GET /customer_invoices` — pagination cursor-based (page_size=100)
- **Rate limit :** 2 req/s (invoices), 4 req/s (autres). Retry auto sur 429.
- **Statuts facture :** `paid`, `upcoming`, `late` = actives. `cancelled`, `archived`, `incomplete` = ignorées.
- **Avoirs :** status=cancelled avec montant négatif → ignorés (netted avec la facture annulée)
- **Champs utilisés :** id, invoice_number, label (→ nom client), pdf_invoice_subject (→ objet), date, status, paid, currency_amount_before_tax (montant HT)
- **Montants :** tout en HT

## Dashboard Finances (`/admin/finances`)
- **Page :** `src/app/admin/finances/page.tsx` → composant `FinancesDashboard.tsx`
- **Navigation :** bouton "Finances" dans la toolbar admin (AdminCalendar.tsx), à côté de Projections
- **Auth :** même auth admin que le reste (sessionStorage + ADMIN_PASSWORD)

### Sources de CA
- **CA Facturé (Pennylane)** : somme HT des factures actives (paid + upcoming + late) par mois
- **CA Encaissé (Pennylane)** : somme HT des factures paid=true uniquement
- **CA Manuel** : saisie manuelle pour les mois sans Pennylane (2025, jan-fév 2026). Cumulé avec Pennylane.
- **CA Prévisionnel** : saisie manuelle

### Logique Résultat (cascade par statut)
- `Réalisé` → (CA Encaissé + CA Manuel) − Charges. Toujours calculé même si CA=0.
- `En cours` → (CA Facturé + CA Manuel) − Charges. Fallback CA Prévisionnel si les deux = 0.
- `Prévisionnel` → CA Prévisionnel − Charges. Calculé seulement si CA > 0.
- **Cumul** = somme progressive des résultats de janvier au mois courant (uniquement mois avec données)

### Réattribution de factures
- Une facture Pennylane peut être réattribuée à un autre mois (ex: facturée en avril pour un événement en juin)
- Overrides stockés en KV : `finances:invoice-overrides:YYYY` → `{invoiceId: month}`
- API : `POST /api/finances/invoice-override` avec `{year, invoiceId, month}`
- UI : tiroir factures sous chaque mois, select "Attribué à" par facture

### Persistance KV
- `finances:YYYY` → 12 objets FinanceMonth (statut, chargesFixes, caManuel, caPrevisionnel, chargesVar)
- `finances:invoice-overrides:YYYY` → overrides de mois par invoiceId
- Charges fixes par défaut : 15 122 €/mois (février : 15 055 €)

### Fonctionnalités
- 4 cartes synthèse (Encaissé YTD, Prévisionnel, Charges, Résultat)
- Graphique Chart.js barres (encaissé/facturé/manuel/charges par mois)
- Tableau 12 mois : statut cliquable, charges variables expandable, CA Manuel/Prévisionnel éditables
- Tiroir factures Pennylane par mois (clic sur CA Facturé) : client, objet, montant, statut, réattribution
- Sélecteur année (← 2025 / 2026 →)
- Filtres période (Année, T1, T2, T3, T4, S1, S2)
- Export CSV, Réinitialiser (avec confirmation), bouton Synchro Pennylane

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- noindex partout (robots.txt + metadata)
- Page publique = `force-dynamic` (lit KV à chaque requête)
- SaveBadge = vert emerald, basé sur coeff booking window (pas de comparaison cross-tier)
