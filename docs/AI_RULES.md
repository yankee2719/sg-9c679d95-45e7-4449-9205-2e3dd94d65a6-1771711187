# MACHINA — AI RULES

## Sempre
- orgType = DB truth (organizations.type)
- guard mounted/pageLoading per evitare UI flash/hydration mismatch
- supabase client diretto (NO API CRUD)

## Mai
- fallback silenziosi su orgType
- “tenant_id legacy”
- permettere delete al customer (solo local hide)

## Debug checklist rapida
1) profiles.default_organization_id è valorizzato?
2) organization_memberships esiste ed è is_active=true?
3) organizations.type coerente?
4) RLS blocca query? (soprattutto su organizations/plants/machine_assignments/customer_hidden_machines)