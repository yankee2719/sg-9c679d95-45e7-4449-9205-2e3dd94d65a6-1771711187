Ti passo il contesto del mio progetto MACHINA. Leggilo e poi lavoriamo senza fare assunzioni.

- Leggi prima AI_CONTEXT.md
- Poi AI_SCHEMA_NOTES.md
- Poi AI_TASK.md
- Rispetta AI_RULES.md

Problema corrente:
1) Customer: può solo archiviare localmente le macchine (customer_hidden_machines)
2) Manufacturer: può cancellare davvero (owner=machines.organization_id)
3) “Attrezzature” va rinominato “Macchine”
4) “Nuova attrezzatura” va adeguata: manufacturer NON deve vedere stabilimento, solo cliente

File coinvolti:
- src/pages/equipment/index.tsx
- src/pages/equipment/new.tsx
- src/components/Layout/MainLayout.tsx
- src/lib/supabaseHelpers.ts