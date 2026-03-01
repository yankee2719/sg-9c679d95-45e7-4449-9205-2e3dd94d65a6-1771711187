# MACHINA — AI CONTEXT (MASTER)

## Stack
- Next.js (Pages Router)
- React + TS
- Tailwind + shadcn/ui (Radix)
- Supabase (Postgres + RLS) + Supabase Auth + Supabase Storage
- NO API layer Next.js per CRUD (diretto supabase client)

## Multi-tenant model
- organizations (type: manufacturer | customer)
- organization_memberships (user_id + organization_id + role + is_active)
- profiles.default_organization_id = org “attiva” dell’utente (contesto)

### Org types
- manufacturer = costruttore
- customer = utilizzatore finale

### Roles
- admin, supervisor, technician
- (futuro) platform admin: bypass RLS (is_platform_admin)

## Tables core (attuali)
- organizations
- organization_memberships
- profiles
- plants
- production_lines
- machines
- machine_assignments
- customer_hidden_machines (NEW: archivio locale per customer)

## Regole funzionali chiave (IMPORTANTISSIMO)
### OrgType & UI
- Non fidarsi di orgType dal client: risolvere SEMPRE “DB truth”
  - getOrgTypeById(orgId) => organizations.type
- Evitare fallback silenziosi: se orgType non risolto => hard error (toast + redirect)

### Macchine / Assegnazioni
- Manufacturer:
  - vede tutte le macchine “own” (machines.organization_id = manufacturerOrgId)
  - vede anche la suddivisione per cliente tramite machine_assignments (manufacturer_org_id -> customer_org_id)
  - può fare DELETE reale SOLO su macchine che possiede (owner = organization_id)
- Customer:
  - vede le macchine proprie (organization_id = customerOrgId) + eventuali macchine assegnate dal costruttore (machine_assignments attivi per customer_org_id)
  - NON può fare delete reale
  - può solo “archiviare localmente” (hide) usando customer_hidden_machines

### Customer local archive
- customer_hidden_machines:
  - customer_org_id, machine_id
  - il customer può insert/delete solo sulle proprie righe
  - la lista macchine customer va filtrata client-side usando hiddenMachineIds (se showHiddenLocal=false)

## Stato del lavoro (ultime discussioni)
- Rename UI: “Attrezzature” => “Macchine” (da fare/propagare in t("equipment.*"))
- Pagina lista: /src/pages/equipment/index.tsx
  - Manufacturer: raggruppata per cliente (non stabilimenti)
  - Customer: raggruppata per stabilimento (plants) + sezione “Macchine dal Costruttore”
- Pagina nuova macchina: /src/pages/equipment/new.tsx
  - Richiesta: TOGLI campo “stabilimento” quando logged come manufacturer
  - Manufacturer deve scegliere cliente (customer org) e creare assignment
- Fix storico: dopo refresh compariva UI sbagliata (stabilimento/cliente) -> risolto con mounted guard + orgType DB-truth

## File importanti già toccati
- src/lib/supabaseHelpers.ts (getUserContext robusto con retry)
- src/components/Layout/MainLayout.tsx (orgType per nav; usa getProfileData)
- src/pages/equipment/index.tsx (logica manufacturer/customer)
- src/pages/equipment/new.tsx (inizializzazione DB-truth + selector org-specific)

## Constraints operative
- Ambiente Softgen: terminale limitato; GitHub disponibile
- Next.js 15.5.9 + Turbopack (attenzione a hydration)
- Preferire guard “mounted/pageLoading” per evitare flash UI sbagliata