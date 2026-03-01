# MACHINA — SCHEMA & RLS NOTES

## User context
- auth user: supabase.auth.getSession() / getUser()
- profiles:
  - id = user.id
  - default_organization_id = org attiva
- org membership:
  - organization_memberships(user_id, organization_id, role, is_active)

## Machine ownership & assignment
- machines.organization_id = owner org (chi “possiede” davvero la macchina)
  - se la macchina è del costruttore, owner = manufacturer
  - non cambiare owner quando la assegni
- machine_assignments:
  - machine_id
  - manufacturer_org_id
  - customer_org_id
  - is_active
  - assigned_at

### Regola business
- Customer non cancella mai: solo hide locale.
- Manufacturer può cancellare davvero SOLO se owner = manufacturerOrgId.

## Local hide for customer
- customer_hidden_machines:
  - customer_org_id (FK organizations)
  - machine_id (FK machines)
  - unique(customer_org_id, machine_id)

### RLS richiesto (minimo)
- SELECT: customer può vedere righe dove customer_org_id = sua org
- INSERT/DELETE: idem
- Manufacturer NON usa questa tabella

## UI grouping
- Manufacturer: group by customer_org_id (machine_assignments)
- Customer: group by plant_id (plants) + sezione assigned-from-manufacturer

## Non fare
- Non duplicare filtri tenant lato UI oltre al necessario per l’archivio locale
- Non usare API Next.js per CRUD