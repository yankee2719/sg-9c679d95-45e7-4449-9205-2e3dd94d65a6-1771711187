# MACHINA — CURRENT TASKS

## Obiettivo attuale (PRIORITÀ)
1) Rendere definitiva la UX Macchine per manufacturer/customer
2) Introdurre archiviazione locale customer (customer_hidden_machines)
3) Sistemare “Nuova macchina”:
   - manufacturer: seleziona cliente (NO stabilimento)
   - customer: stabilimento obbligatorio + linea opzionale

## Stato attuale
- equipment/index.tsx: aggiornato con grouping manufacturer per clienti + customer per stabilimenti
- Da completare:
  - RLS customer_hidden_machines (se non fatto)
  - UI rename: “Attrezzature” => “Macchine”
  - equipment/new.tsx: togli stabilimento per manufacturer + assignment

## Regole finali
- Customer = hide/unhide locale
- Manufacturer = delete reale (owner only)