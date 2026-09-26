# Chez Les Plombiers — Calendrier de Pricing Dynamique

## Projet
Webapp calendrier affichant les prix de location par jour pour un lieu événementiel brutaliste de 200m² au 39 rue des Bourdonnais, 75001 Paris.

**URL :** `www.chezlesplombiers.fr/tarifs` — l'application est servie sous le domaine
principal par une **réécriture multi-zones** (`basePath: "/tarifs"`).
`pricing.chezlesplombiers.fr` redirige en 308 et n'est plus l'adresse publique.

⚠️ **Piège de `basePath`** : Next préfixe les liens (`next/link`), les images
(`next/image`) et les assets, **mais pas les `fetch` écrits à la main**. Tout appel
réseau doit passer par `apiUrl()` (`src/lib/base-path.ts`), sinon il part sur
`www.chezlesplombiers.fr/api/…` — une route du site vitrine, qui n'existe pas. L'échec
est silencieux : tout compile, tout s'affiche, seules les actions échouent (devis,
connexion admin, enregistrement des prix).

⚠️ **Indexation** : le `noindex` global a été retiré le 19/09/2026. Les trois pages
d'administration gardent chacune le leur — ne pas réintroduire de `robots` global.

**GitHub :** GrowthAgence/chez-les-plombiers-pricing (private)

## Stack
- **Next.js 16** + App Router + TypeScript strict + React 19
- **Tailwind CSS v4** (`@theme inline` dans globals.css)
- **Upstash Redis** pour overrides de prix, demandes de devis, analytics, données finances
- **Google Calendar API** pour la disponibilité (source of truth)
- **Pennylane API** (`app.pennylane.com/api/external/v2`) pour facturation / CA
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
│   ├── admin/                      # Panel admin protégé par mot de passe
│   │   ├── page.tsx / client.tsx   # Dashboard calendrier admin
│   │   ├── projections/            # Projections financières (scénarios)
│   │   └── finances/               # Dashboard finances v2 (Pennylane, courbe cumul, charges spreadsheet)
│   └── api/
│       ├── admin/auth/             # POST: auth par mot de passe
│       ├── admin/calendar-password/ # GET/PUT: mot de passe calendrier (KV)
│       ├── pricing/                # GET: pricing annuel, POST: créer override
│       ├── pricing/[date]/         # PUT/DELETE: modifier/supprimer override
│       ├── availability/           # GET/PUT: jours réservés
│       ├── quote/                  # GET: liste devis (admin), POST: créer devis → KV + Pipedrive
│       ├── finances/               # GET: données 12 mois + factures Pennylane + charges postes
│       ├── finances/[year]/[month]/ # PATCH: MAJ caPrevisionnel/chargesFixes d'un mois
│       ├── finances/reset/[year]/  # POST: réinitialiser aux valeurs par défaut
│       ├── finances/export/        # GET: export CSV
│       ├── finances/invoice-override/ # POST: réattribuer une facture à un autre mois
│       ├── finances/charges-postes/ # GET/POST: CRUD charges fixes spreadsheet (KV)
│       ├── ical/                   # GET: flux .ics
│       ├── analytics/              # GET/POST: vues par jour
│       ├── webhook/pipedrive/      # POST: webhook Pipedrive (deal stage change → KV)
│       ├── webhook/calendly/      # POST: webhook Calendly (invitee.created → Pipedrive deal)
│       └── webhook/email-lead/    # POST: webhook générique email (n8n → Pipedrive deal, auth X-Webhook-Secret)
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
│   ├── FinancesDashboard.tsx        # Dashboard finances v2 (cartes, courbe cumul, tableau, charges modal)
│   ├── CumulativeChart.tsx          # Courbe cumul CA + break-even (Chart.js Line)
│   └── ChargesFixesEditor.tsx       # Composant standalone charges (dispo upgrade futur)
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
| Dimanche | 2 000 € |
| Fashion Week | 6 000 € |

### Demi-journée
60% du prix journée complète (constante `HALF_DAY_RATIO`)

### Fenêtres de réservation (coefficients)
| Fenêtre | Délai | Coefficient |
|---------|-------|-------------|
| 6 mois et + | 6+ mois | aucune remise (×1.0) |
| Standard | 2-5 mois | ×1.0 |
| Confirmé | 2 sem – 2 mois | ×1.0 |
| Last Minute | < 14 jours | aucune remise (×1.0) |

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
- **Calendrier :** "ATELIER / VALIDÉ" — `c_c1de52d8f5aa41e62bf0988bbb5112c46ee33d12449e22ad9d4d7099dc54a911@group.calendar.google.com`
- **GCP :** projet `chez-les-plombiers-490515`, API key publique (calendrier public)
- **Logique demi-journée :**
  - Event 7h–13h → matin réservé (`isBookedMorning`)
  - Event 13h–19h → après-midi réservé (`isBookedAfternoon`)
  - Event chevauchant les deux → journée complète (`isBooked`)
  - Event all-day → journée complète
  - Deux demi-journées séparées le même jour → journée complète
- **Merge :** les bookings GCal sont mergés dans les overrides KV avant `computeYearPricing()`, dans `page.tsx` (SSR) et `GET /api/pricing` (admin/API)
- **Cache :** `cache: "no-store"` — chaque requête page/API refetch le calendrier Google
- **Important :** les events doivent être sur le calendrier "ATELIER / VALIDÉ", pas sur un calendrier perso

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

## Authentification de l'administration (26/09/2026)

### Ce qu'il y avait avant, et pourquoi on en est sorti
`POST /api/admin/auth` renvoyait au navigateur **le mot de passe lui-même** comme jeton,
gardé en `sessionStorage` et rejoué en en-tête `Authorization`. Pour une personne seule ça
tient. Mais le secret maître vivait dans le navigateur, ne se périmait jamais, et **ne
pouvait être révoqué pour personne sans l'être pour tout le monde** — rédhibitoire dès
qu'on ouvre l'accès aux obligataires, à la banque et au cabinet.

### Sessions — `src/lib/auth.ts`
- `creerSession(role, origine)` → jeton aléatoire de 32 octets, rangé en KV
  `auth:session:<jeton>` avec un rôle et **12 h** d'échéance.
- `estAdmin(request)` : le contrôle que fait chaque route. **Toutes** les routes protégées
  l'utilisent — ne plus jamais comparer `process.env.ADMIN_PASSWORD` à la main.
- Le mot de passe reste accepté en secours, en **comparaison à temps constant**, et ouvre
  désormais une session au lieu d'être le jeton.
- `DELETE /api/admin/auth` détruit la session côté serveur. Vider `sessionStorage` ne
  déconnecte personne.
- ⏳ Les rôles autres qu'`admin` (`lecture`) sont la fondation des accès obligataires /
  banque / cabinet à venir. Rien ne les émet encore.
- ⚠️ `/api/webhook/email-lead` garde `ADMIN_PASSWORD` en `X-Webhook-Secret` : c'est un
  secret de machine à machine, pas une session. Ne pas y toucher.

### Passkeys — Face ID, Touch ID, Windows Hello
`@simplewebauthn/server` + `/browser`. Clés en KV `auth:passkeys`, défis en `auth:defi:*`
(120 s, **consommés même en cas d'échec** — c'est ce qui empêche de rejouer une signature).

- `POST /api/admin/passkey/options` — `mode: "enregistrer"` (exige d'être déjà admin) ou
  `"connecter"` (public).
- `POST /api/admin/passkey/verify` — même découpage ; la connexion ouvre une session.
- `GET`/`DELETE /api/admin/passkey` — lister et retirer un appareil.
- UI : bouton Face ID sur `AdminLogin`, gestion des appareils dans `PasskeyReglages`
  (bas de `/admin`).

⚠️ **`rpId` vaut `chezlesplombiers.fr`, pas `www.chezlesplombiers.fr`** — voir
`src/lib/webauthn.ts`. Une passkey n'est valable que pour son `rpId` et ses sous-domaines,
et l'administration est atteignable par **deux** origines (`www…/tarifs` via le montage
multi-zones, et `pricing…`). En s'enregistrant sur le domaine racine, la même clé marche
des deux côtés ; sur `www`, elle ne marcherait que là, **et l'échec serait muet**.

⚠️ **On lit l'en-tête `Origin`, pas `Host`** : derrière la réécriture multi-zones, `Host`
est celui du déploiement, pas celui que voit le navigateur — et WebAuthn compare avec ce
que voit le navigateur.

⚠️ **Le compteur d'usage n'est pas une condition** : Apple le laisse à zéro. En faire un
contrôle bloquerait tous les iPhone au deuxième usage.

⚠️ **C'est la CSP du SITE VITRINE qui s'applique à `/tarifs/*`**, pas celle de cette
application — vérifié le 26/09/2026 (`curl -I` sur `/tarifs/admin` renvoie la CSP avec
Elfsight et Axeptio). Sa `Permissions-Policy` ne mentionne pas
`publickey-credentials-get/create`, qui valent donc `self` : **WebAuthn passe**. Si on
durcit un jour cette en-tête sur le site vitrine, il faudra les autoriser explicitement.

⚠️ **Dette connue, préexistante** : `AdminClient` et `FinancesDashboard` initialisent leur
jeton depuis `sessionStorage` dans `useState`, ce qui provoque une erreur d'hydratation à
chaque chargement (React se rattrape). À corriger en montant le jeton dans un `useEffect`.

## Pennylane — Facturation & CA
- **API :** `https://app.pennylane.com/api/external/v2` — auth Bearer token
- **Endpoint principal :** `GET /customer_invoices` — pagination cursor-based (page_size=100)
- **Rate limit :** 2 req/s (invoices), 4 req/s (autres). Retry auto sur 429.
- **Statuts facture :** `paid`, `upcoming`, `late` = actives. `cancelled`, `archived`, `incomplete` = ignorées.
- **Avoirs :** status=cancelled avec montant négatif → ignorés (netted avec la facture annulée)
- **Champs utilisés :** id, invoice_number, label (→ nom client), pdf_invoice_subject (→ objet), date, status, paid, currency_amount_before_tax (montant HT)
- **Montants :** tout en HT

## Dashboard Finances v2 (`/admin/finances`)
- **Page :** `src/app/admin/finances/page.tsx` → composant `FinancesDashboard.tsx`
- **Navigation :** bouton "Finances" dans la toolbar admin (AdminCalendar.tsx), à côté de Projections
- **Auth :** même auth admin que le reste (sessionStorage + ADMIN_PASSWORD)
- **Brief :** Etienne v2 (21/04/2026) — 14 items appliqués intégralement

⚠️ **`DASHBOARD-FINANCES-SPEC.md` (26/09/2026) est le document de référence : le code
s'y conforme, pas l'inverse.** Le lire avant de toucher à quoi que ce soit ici. Ce qui
suit ne décrit que l'implémentation.

### Sources de CA
- **Pennylane** = source unique, en **HT**, en **base caisse**.
- **Attribution : le mois du PAIEMENT** (spec §3), pas celui de la facture ni de
  l'évènement. Chez CLP le règlement intégral est exigé *avant* l'évènement : une date
  de novembre vendue en septembre est encaissée en septembre.
  ⚠️ Pennylane ne porte aucune date de paiement sur la facture — `paid` est un booléen
  et la sous-ressource `payments` est **vide** sur toutes les factures de CLP. La seule
  trace datée est la transaction bancaire rapprochée, `matched_transactions`, une
  sous-ressource : **un appel par facture**, mis en cache dans
  `finances:invoice-payments`. On retient la transaction la plus tardive.
  **81 % des factures payées en portent une** ; les 19 % restantes ont été pointées à la
  main dans Pennylane, sans rapprochement bancaire → repli sur la date de facture, et
  le tiroir l'affiche `≈ date` en doré.
  L'exercice se décide aussi sur la date de paiement : on ratisse les factures de
  N−1 / N / N+1 avant de filtrer. Bascule mesurée sur 2026 : jusqu'à **28 500 €**
  déplacés d'un mois à l'autre, **total annuel inchangé**.
- **Filtre cautions** : la **ligne d'article** fait seule preuve — voir le pavé de
  `natureDeLaFacture()` dans `pennylane.ts`, et la règle du 14/09/2026. Ni le montant,
  ni le mot-clé, ni la TVA nulle, ni l'objet ne discriminent.
- **Legacy jan 2026** : 39 795€ HT hardcodé dans `GET /api/finances` (pré-Pennylane)
- **CA Prévisionnel** : saisie manuelle, masqué automatiquement dès qu'un CA réel Pennylane existe

### Statut automatique (non cliquable)
- `autoStatus(month, year)` : passés → Réalisé, en cours → En cours, futurs → Prévi.

### Solde d'exploitation — et pourquoi pas « résultat »
- 🔴 **Le mot « résultat » est proscrit** (spec §2). Ce tableau est en base caisse : le
  remboursement d'emprunt y compte en entier, l'amortissement n'y existe pas. Le cabinet
  fait l'inverse. Les deux sont justes, mais **ils ne donneront jamais le même chiffre**
  — et le mot « résultat » laisserait croire qu'ils le devraient.
- `soldeExploitation(m)` = effectiveCA(m) − chargesFixes (toujours calculé, même CA=0)
- Cumul = somme progressive de TOUS les mois (charges toujours déduites)
- Cumul affiché sur tous les mois y compris futurs

### Charges fixes (spreadsheet CRUD)
- KV `finances:charges-postes:YYYY` → ChargePoste[] (source of truth si présent)
- Fallback : `DEFAULT_CHARGES_POSTES` dans `finance-defaults.ts`
- `GET /api/finances` calcule totaux/mois depuis postes → override `chargesFixes`
- Modal spreadsheet : CRUD postes (ajouter/renommer/supprimer), TVA obligatoire, saisie HT ou TTC
- 12 postes par défaut (EDF variable/mois, intérêts obligataires 14 700€ en sept)
- ⚠️ **Les trois loyers ne sont pas tous des charges de CLP** (spec §5, relevé sur les
  avis d'échéance le 23/09/2026) : L'ATELIER 5 000 €/mois payé par **CLP** ; L'APPARTEMENT
  4 400 €/mois payé par **AAA** — il n'a rien à faire ici ; LA BOUTIQUE en **franchise de
  loyer depuis le 01/05/2026**, seules 144 €/mois de charges sortent. Les « 2 250 € »
  qu'Étienne prenait pour un loyer de LA BOUTIQUE sont le dépôt de garantie, jamais versé.
- ⏳ **La date de fin de franchise de LA BOUTIQUE est dans le bail et n'a pas été relevée.**
  C'est une marche de charge à venir.
- ⚠️ Un virement `LOYER AAA` de 4 400 € part du compte CLP certains mois — **non qualifié**,
  donc pas inscrit en charge fixe.
- ⚠️ Septembre portait **14 700 € deux fois** (29 400 €) : `FINANCE_DEFAULTS_2026` ajoutait
  les intérêts obligataires que `totalChargesMois` comptait déjà. Corrigé le 26/09/2026.

### Réattribution de factures
- Overrides KV : `finances:invoice-overrides:YYYY` → `{invoiceId: month}`
- API : `POST /api/finances/invoice-override`
- UI : tiroir factures avec N° facture, select "Attribué à"

### Persistance KV
- `finances:YYYY` → 12 objets FinanceMonth (chargesFixes, caPrevisionnel)
- `finances:invoice-overrides:YYYY` → overrides réattribution
- `finances:charges-postes:YYYY` → ChargePoste[] (spreadsheet charges)

### 4 cartes synthèse
1. CA Réalisé YTD (cumul encaissé)
2. Solde d'exploitation (vert/rouge) — **jamais « résultat »**
3. CA Prévi. restant (mois futurs)
4. Break-even estimé (mois+année ou "Non atteint")

### Ce que la spec demande et qui n'est PAS fait — et pourquoi
- **Bloc B, trésorerie d'exploitation en TTC** (spec §3) : demande les flux bancaires.
  Ils existent, mais dans le SQLite local `clp-finance/db/` — qu'une appli Vercel ne peut
  pas lire. Il faudra exporter un agrégat mensuel vers KV. **Décision d'architecture à
  prendre.**
- **CA encaissé HT N−1** et **cumul mobile 12 mois** (spec §3) : supposent 2025.
  Pennylane n'en a rien d'exploitable — **les 16 pièces 2025 y sont toutes `archived` ou
  `incomplete`**. Le CA 2025 établi sur pièces (155 450,22 € HT, 35 jours) vit dans
  `clp-finance/reports/CA-2025.md`, mais il est rattaché à la **date d'évènement**, pas à
  celle du paiement : **non comparable en l'état** avec le bloc A. Une série mensuelle
  encaissée 2025 est dérivable des liens pièce↔mouvement du référentiel, dont **47 sur 81
  sont encore `a_valider`**. À reprendre quand le fil AUDIT les aura validés.
- **Jours vendus** (spec §6) : rattachement facture → évènement couvert à 100 % sur 2025
  mais **4 % sur 2026**. L'indicateur, et le prix moyen par jour avec lui, ne peut être
  affiché que pour 2025.

### Graphique
- Courbe cumul : trait vert réalisé + pointillés dorés projection
- Ligne grise horizontale : charges annuelles (break-even line)
- Point d'intersection annoté

### Colonnes tableau
Mois | Statut (auto) | Charges | CA | CA Prévi. | Résultat | Cumul

### Autres fonctionnalités
- Sélecteur année, filtres période (T1-T4, S1-S2), export CSV, réinitialiser, synchro

## Convention
- Pas de border-radius (esthétique brutaliste)
- Font mono Space Mono pour titres/boutons, Inter pour le corps
- Couleurs : accent laiton #C8A96E, fond charbon #1A1A1A
- pages publiques **indexées** depuis le 19/09/2026 ; `noindex` conservé page par page sur `/admin`
- Page publique = `force-dynamic` (lit KV à chaque requête)
- SaveBadge = vert emerald, basé sur coeff booking window (pas de comparaison cross-tier)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Dashboard Finances — les cautions ne sont pas du chiffre d'affaires (23/09/2026)

`src/lib/pennylane.ts` décide si une facture Pennylane est du **produit** ou un
**dépôt de garantie**. La règle vient du référentiel financier
(`DIGITAL CLP/clp-finance/`), où elle a été établie après erreur le 14/09/2026.

**Ne pas la simplifier.** Quatre discriminants ont été essayés et ont tous échoué :

| Discriminant | Pourquoi il échoue |
|---|---|
| le **montant** (5 000 / 3 000 €) | des locations tombent sur ces ronds |
| le **mot-clé** dans le libellé | Pennylane génère « Facture SNAPEVENT - F-2026-09-17-114 » : le mot « caution » n'y est pas |
| la **TVA nulle** seule | une location exonérée (client étranger) a la même signature |
| l'**objet** de la facture | une location et sa caution portent le même — il décrit l'évènement |

> **Seule la ligne d'article fait preuve.** La TVA sert de filtre préalable : un dépôt
> de garantie n'y est jamais soumis, donc TVA présente ⇒ produit, sans appel
> supplémentaire. TVA nulle ⇒ on va lire `/customer_invoices/{id}/invoice_lines`.

C'est le filtre par mot-clé qui faisait entrer **16 000 € de cautions** dans le CA de
septembre 2026, et surévaluait le total 2026 d'autant.

⚠️ **Le défaut par défaut est de GARDER la facture en CA** si la ligne d'article est
illisible. Mieux vaut un chiffre à vérifier qu'un chiffre silencieusement amputé.

**Cache** : 54 % des factures 2026 sont à TVA nulle — les relire à chaque affichage
serait lourd. La nature est donc mise en cache dans KV (`finances:invoice-natures`),
définitivement : une facture émise ne change plus de nature. Purger cette clé force un
recalcul complet.

### Restent faux dans ce dashboard
- **« Crédit travaux 5 833 €/mois »** compté comme une charge : c'est un remboursement
  de dette, **seuls les intérêts sont une charge**. La ligne « résultat » est donc un
  flux de trésorerie, pas un résultat comptable. (Les deux prêts CIC font d'ailleurs
  5 322,76 €/mois, pas 5 833 €.)
- **Un seul loyer de 5 000 €** alors que la marque exploite trois lieux.
- **Aucun coût salarial** : Céline est portée par Archibald & Abraham. À intégrer le
  jour où ce ne sera plus le cas.

