import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Language = "it" | "en" | "fr" | "es";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    it: {
        "common.loading": "Caricamento...",
        "common.save": "Salva",
        "common.cancel": "Annulla",
        "common.delete": "Elimina",
        "common.edit": "Modifica",
        "common.create": "Crea",
        "common.search": "Cerca",
        "common.filter": "Filtra",
        "common.export": "Esporta",
        "common.back": "Indietro",
        "common.next": "Avanti",
        "common.confirm": "Conferma",
        "common.close": "Chiudi",
        "common.yes": "Sì",
        "common.no": "No",
        "common.all": "Tutti",
        "common.none": "Nessuno",
        "common.logout": "Esci",
        "common.language": "Lingua",
        "common.notifications": "Notifiche",
        "common.system": "Sistema",
        "common.management": "Gestione",
        "common.viewAll": "Vedi tutti",

        "nav.dashboard": "Dashboard",
        "nav.equipment": "Macchine",
        "nav.maintenance": "Manutenzione",
        "nav.workOrders": "Ordini di lavoro",
        "nav.checklists": "Checklist",
        "nav.scanner": "Scanner QR",
        "nav.analytics": "Analisi",
        "nav.compliance": "Compliance",
        "nav.documents": "Documenti",
        "nav.plants": "Stabilimenti",
        "nav.users": "Utenti",
        "nav.customers": "Clienti",
        "nav.assignments": "Assegnazioni",
        "nav.activeOrganization": "Organizzazione attiva",
        "nav.settings": "Impostazioni",

        "org.manufacturer": "Costruttore",
        "org.customer": "Utilizzatore finale",
        "org.platform": "Piattaforma",
        "org.context": "Contesto",

        "dashboard.title": "Dashboard",
        "dashboard.subtitle": "Panoramica del sistema",
        "dashboard.subtitleManufacturer": "Panoramica del contesto costruttore attivo.",
        "dashboard.subtitleCustomer": "Vista rapida del contesto organizzativo attivo.",

        "dashboard.kpi.machinesProduced": "Macchine Prodotte",
        "dashboard.kpi.customers": "Clienti",
        "dashboard.kpi.assignedMachines": "Macchine Assegnate",
        "dashboard.kpi.customerAccounts": "Account Clienti",
        "dashboard.kpi.machines": "Macchine",
        "dashboard.kpi.documents": "Documenti",
        "dashboard.kpi.workOrders": "Work Orders",
        "dashboard.kpi.checklists": "Checklist",

        "dashboard.action.newMachine": "Nuova Macchina",
        "dashboard.action.addToCatalog": "Aggiungi al catalogo",
        "dashboard.action.newCustomer": "Nuovo Cliente",
        "dashboard.action.createCustomerOrg": "Crea organizzazione cliente",
        "dashboard.action.assignMachines": "Assegna Macchine",
        "dashboard.action.linkMachinesToCustomers": "Collega macchine ai clienti",
        "dashboard.action.addMachine": "Aggiungi una macchina",
        "dashboard.action.documents": "Documenti",
        "dashboard.action.openDocumentArchive": "Apri archivio documentale",
        "dashboard.action.newWorkOrder": "Nuovo Work Order",
        "dashboard.action.planOperationalActivities": "Pianifica attività operative",

        "dashboard.recentCustomers": "Clienti Recenti",
        "dashboard.noRecentCustomers": "Nessun cliente recente.",
        "dashboard.customerFallback": "Cliente",
        "dashboard.customerLabel": "Cliente",

        "dashboard.recentMachines": "Ultime Macchine",
        "dashboard.noRecentMachines": "Nessuna macchina recente.",
        "dashboard.machineFallback": "Macchina",

        "equipment.title": "Macchine",
        "equipment.subtitle": "Gestione macchine e attrezzature",
        "equipment.new": "Nuova macchina",
        "equipment.noEquipment": "Nessuna macchina trovata",
        "equipment.subtitleManufacturer": "Gestisci il catalogo macchine del costruttore attivo.",
        "equipment.subtitleCustomer": "Gestisci macchine proprie e macchine assegnate nel contesto cliente attivo.",

        "equipment.kpi.visibleMachines": "Macchine Visibili",
        "equipment.kpi.activeAssignments": "Assegnazioni Attive",
        "equipment.kpi.hiddenMachines": "Macchine Nascoste",

        "equipment.searchPlaceholder": "Cerca macchina",
        "equipment.hideLocalArchived": "Nascondi archiviate locali",
        "equipment.showHidden": "Mostra nascoste",
        "equipment.listTitle": "Elenco Macchine",
        "equipment.loading": "Caricamento macchine...",

        "equipment.machineFallback": "Macchina",
        "equipment.linkedToPlant": "Collegata a stabilimento",

        "equipment.badge.owned": "Propria",
        "equipment.badge.assigned": "Assegnata",
        "equipment.badge.archived": "Archiviata",

        "equipment.field.brand": "Marca",
        "equipment.field.model": "Modello",

        "maintenance.title": "Manutenzione",
        "maintenance.subtitle": "Gestisci e monitora tutte le manutenzioni",
        "maintenance.newPlan": "Nuovo Piano",

        "maintenance.tab.plans": "Piani",
        "maintenance.tab.workOrders": "Ordini di Lavoro",

        "maintenance.searchPlaceholder": "Cerca",
        "maintenance.loading": "Caricamento manutenzioni...",
        "maintenance.noPlans": "Nessun piano manutentivo trovato.",

        "maintenance.priority.high": "Alta",
        "maintenance.priority.medium": "Media",
        "maintenance.priority.low": "Bassa",

        "maintenance.planFallback": "Piano manutenzione",
        "maintenance.machineFallback": "Macchina",

        "workOrders.title": "Ordini di lavoro",
        "workOrders.subtitle": "Pianifica, assegna e monitora le attività operative sulle macchine.",
        "workOrders.new": "Nuovo Work Order",

        "workOrders.kpi.total": "Totali",
        "workOrders.kpi.open": "Aperti",
        "workOrders.kpi.highPriority": "Alta Priorità",

        "workOrders.searchPlaceholder": "Cerca work order",
        "workOrders.listTitle": "Elenco Work Orders",
        "workOrders.loading": "Caricamento work orders...",
        "workOrders.noResults": "Nessun work order trovato.",

        "workOrders.priority.high": "Alta",
        "workOrders.priority.medium": "Media",
        "workOrders.priority.low": "Bassa",

        "workOrders.status.open": "Aperto",
        "workOrders.status.inProgress": "In corso",
        "workOrders.status.closed": "Chiuso",

        "workOrders.fallbackTitle": "Work Order",
        "workOrders.machineFallback": "Macchina",

        "checklists.title": "Checklist",
        "checklists.subtitle": "Gestisci template checklist per controlli, verifiche e procedure operative.",
        "checklists.newTemplate": "Nuovo Template",

        "checklists.kpi.templates": "Template",
        "checklists.kpi.totalItems": "Voci Totali",
        "checklists.kpi.safetyChecklists": "Checklist Safety",

        "checklists.searchPlaceholder": "Cerca template checklist",
        "checklists.listTitle": "Elenco Template",
        "checklists.loading": "Caricamento template checklist...",
        "checklists.noResults": "Nessun template checklist trovato.",

        "checklists.category.safety": "Safety",
        "checklists.category.quality": "Quality",
        "checklists.category.operational": "Operativa",

        "checklists.fallbackTitle": "Template checklist",
        "checklists.itemsLabel": "voci",

        "documents.title": "Documenti",
        "documents.subtitle": "Hub documentale coerente con il nuovo modello owner / assignment.",

        "documents.card.total.title": "Documenti totali",
        "documents.card.total.description": "Archivio documentale visibile nel contesto organizzativo attivo.",

        "documents.card.manufacturer.title": "Documenti costruttore",
        "documents.card.manufacturer.description": "Manuali, CE, schemi e documentazione originaria.",

        "documents.card.customer.title": "Documenti operativi cliente",
        "documents.card.customer.description": "Procedure interne, report e documenti locali di stabilimento.",

        "documents.link.machineDocs.title": "Apri documenti macchina",
        "documents.link.machineDocs.description": "Accedi ai documenti direttamente dal dettaglio macchina.",

        "documents.link.compliance.title": "Vai alla compliance",
        "documents.link.compliance.description": "Controlli, conformità e documentazione collegata al contesto attivo.",

        "plants.title": "Stabilimenti",
        "plants.subtitle": "Gestisci stabilimenti e linee produttive del contesto attivo.",

        "plants.newPlant": "Nuovo Stabilimento",
        "plants.newLine": "Nuova Linea",

        "plants.kpi.activePlants": "Stabilimenti Attivi",
        "plants.kpi.activeLines": "Linee Attive",

        "plants.form.code": "Codice",

        "plants.form.plant.title": "Nuovo Stabilimento",
        "plants.form.plant.subtitle": "Crea uno stabilimento nel contesto attivo.",
        "plants.form.plant.name": "Nome stabilimento",
        "plants.form.plant.namePlaceholder": "Es. Plant Test 01",
        "plants.form.plant.codePlaceholder": "Es. PLT-01",

        "plants.form.line.title": "Nuova Linea",
        "plants.form.line.subtitle": "Crea una linea produttiva collegata a uno stabilimento.",
        "plants.form.line.plant": "Stabilimento",
        "plants.form.line.selectPlant": "Seleziona",
        "plants.form.line.name": "Nome linea",
        "plants.form.line.namePlaceholder": "Es. Linea Test 01",
        "plants.form.line.codePlaceholder": "Es. LN-01",

        "plants.saving": "Salvataggio...",
        "plants.savePlant": "Salva Stabilimento",
        "plants.saveLine": "Salva Linea",

        "plants.listTitle": "Elenco Stabilimenti",
        "plants.loading": "Caricamento stabilimenti...",
        "plants.noResults": "Nessuno stabilimento presente.",

        "plants.linkedLines": "Linee collegate",
        "plants.noLinkedLines": "Nessuna linea collegata",

        "plants.fallbackPlant": "Stabilimento",
        "plants.fallbackLine": "Linea",

        "customers.title": "Clienti",
        "customers.subtitle": "Elenco organizzazioni cliente collegate al costruttore attivo.",
        "customers.new": "Nuovo Cliente",

        "customers.kpi.total": "Clienti Totali",
        "customers.kpi.activeOrganizations": "Organizzazioni Attive",

        "customers.listTitle": "Elenco Clienti",
        "customers.loading": "Caricamento clienti...",
        "customers.noResults": "Nessun cliente collegato.",

        "customers.fallbackTitle": "Cliente",
        "customers.customerOrganization": "Organizzazione cliente",

        "assignments.title": "Assegnazioni",
        "assignments.subtitle": "Collegamenti attivi tra macchine prodotte e clienti finali.",

        "assignments.kpi.active": "Assegnazioni Attive",

        "assignments.listTitle": "Elenco Assegnazioni",
        "assignments.loading": "Caricamento assegnazioni...",
        "assignments.noResults": "Nessuna assegnazione attiva.",

        "assignments.machineFallback": "Macchina",
        "assignments.customerFallback": "Cliente",
        "assignments.assignedMachine": "Macchina assegnata",
        "assignments.destinationCustomer": "Cliente destinatario",

        "analytics.title": "Analytics",
        "analytics.subtitle": "Punto unico per consultare i dati operativi del contesto attivo.",

        "analytics.item.checklists.title": "Storico checklist",
        "analytics.item.checklists.description": "Analizza le esecuzioni checklist nel contesto organizzativo attivo.",

        "analytics.item.workOrders.title": "Work orders",
        "analytics.item.workOrders.description": "Controlla andamento e tracciabilità operativa degli ordini di lavoro.",

        "compliance.title": "Compliance",
        "compliance.subtitle": "Hub di accesso rapido ai moduli utili per conformità, audit e tracciabilità.",

        "compliance.item.documents.title": "Documentazione di conformità",
        "compliance.item.documents.description": "Manuali, dichiarazioni, schemi e documenti rilevanti per la conformità.",

        "compliance.item.analytics.title": "Analytics e storico",
        "compliance.item.analytics.description": "Storico esecuzioni checklist e dati utili per audit interni.",

        "compliance.item.executions.title": "Esecuzioni checklist",
        "compliance.item.executions.description": "Verifica esecuzioni e prove operative collegate al contesto attivo.",

        "users.title": "Utenti",
        "users.subtitle": "Gestisci utenti e ruoli per",
        "users.activeOrganizationFallback": "l'organizzazione attiva",
        "users.new": "Nuovo utente",
        "users.supervisorMode": "Modalità supervisore: puoi vedere gli utenti, ma creazione, modifica e disattivazione restano disponibili solo agli admin.",

        "users.kpi.total": "Utenti totali",
        "users.kpi.active": "Utenti attivi",
        "users.kpi.inactive": "Utenti disattivi",

        "users.organizationMembers": "Membri organizzazione",
        "users.searchPlaceholder": "Cerca per nome, email o ruolo",
        "users.noResults": "Nessun utente trovato.",
        "users.fallbackUnnamed": "Utente senza nome",

        "users.table.user": "Utente",
        "users.table.role": "Ruolo",
        "users.table.status": "Stato",
        "users.table.acceptance": "Accettazione",
        "users.table.actions": "Azioni",

        "users.role.admin": "Admin",
        "users.role.supervisor": "Supervisor",
        "users.role.technician": "Tecnico",

        "users.status.active": "Attivo",
        "users.status.inactive": "Disattivo",
        "users.status.pending": "In attesa",

        "users.field.fullName": "Nome completo",
        "users.field.displayName": "Nome visualizzato",
        "users.field.email": "Email",
        "users.field.password": "Password",
        "users.field.role": "Ruolo",
        "users.field.status": "Stato",

        "users.dialog.create.title": "Nuovo utente",
        "users.dialog.create.description": "Crea un nuovo utente nell'organizzazione attiva.",
        "users.dialog.create.confirm": "Crea utente",

        "users.dialog.edit.title": "Modifica utente",
        "users.dialog.edit.description": "Aggiorna nome, ruolo e stato dell'utente selezionato.",
        "users.dialog.edit.confirm": "Salva modifiche",

        "users.dialog.deactivate.title": "Disattiva utente",
        "users.dialog.deactivate.description": "Vuoi davvero disattivare",
        "users.dialog.deactivate.confirm": "Disattiva",

        "users.toast.error": "Errore",
        "users.toast.loadError": "Impossibile caricare gli utenti dell'organizzazione.",
        "users.toast.permissionDenied": "Permesso negato",
        "users.toast.adminOnlyCreate": "Solo gli admin possono creare utenti.",
        "users.toast.adminOnlyEdit": "Solo gli admin possono modificare utenti.",
        "users.toast.adminOnlyDeactivate": "Solo gli admin possono disattivare utenti.",
        "users.toast.missingData": "Dati mancanti",
        "users.toast.emailPasswordRequired": "Email e password sono obbligatorie.",
        "users.toast.sessionExpired": "Sessione scaduta, effettua di nuovo il login",
        "users.toast.createFailed": "Creazione utente fallita",
        "users.toast.userCreated": "Utente creato",
        "users.toast.createError": "Errore creazione utente",
        "users.toast.userUpdated": "Utente aggiornato",
        "users.toast.updateError": "Errore aggiornamento utente",
        "users.toast.operationNotAllowed": "Operazione non consentita",
        "users.toast.cannotDeactivateSelf": "Non puoi disattivare te stesso.",
        "users.toast.userDeactivated": "Utente disattivato",
        "users.toast.deactivateError": "Errore disattivazione utente",

        "activeOrg.title": "Organizzazione attiva",
        "activeOrg.description": "Qui scegli il contesto reale della webapp. Tutte le viste MACHINA devono leggere questa organizzazione da profiles.default_organization_id.",
        "activeOrg.noMemberships": "Non risultano membership attive. Senza almeno una membership attiva la webapp non può determinare il contesto organizzativo.",
        "activeOrg.membershipsTitle": "Membership attive",
        "activeOrg.membershipsDescription": "Verifica rapidamente in quali organizzazioni sei attivo e con quale ruolo.",
        "activeOrg.activeBadge": "Attiva",
        "activeOrg.fallbackOrganization": "organizzazione",
    },

    en: {
        "common.loading": "Loading...",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "common.edit": "Edit",
        "common.create": "Create",
        "common.search": "Search",
        "common.filter": "Filter",
        "common.export": "Export",
        "common.back": "Back",
        "common.next": "Next",
        "common.confirm": "Confirm",
        "common.close": "Close",
        "common.yes": "Yes",
        "common.no": "No",
        "common.all": "All",
        "common.none": "None",
        "common.logout": "Logout",
        "common.language": "Language",
        "common.notifications": "Notifications",
        "common.system": "System",
        "common.management": "Management",
        "common.viewAll": "View all",

        "nav.dashboard": "Dashboard",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Work Orders",
        "nav.checklists": "Checklists",
        "nav.scanner": "QR Scanner",
        "nav.analytics": "Analytics",
        "nav.compliance": "Compliance",
        "nav.documents": "Documents",
        "nav.plants": "Plants",
        "nav.users": "Users",
        "nav.customers": "Customers",
        "nav.assignments": "Assignments",
        "nav.activeOrganization": "Active organization",
        "nav.settings": "Settings",

        "org.manufacturer": "Manufacturer",
        "org.customer": "End user",
        "org.platform": "Platform",
        "org.context": "Context",

        "dashboard.title": "Dashboard",
        "dashboard.subtitle": "System overview",
        "dashboard.subtitleManufacturer": "Overview of the active manufacturer context.",
        "dashboard.subtitleCustomer": "Quick view of the active organizational context.",

        "dashboard.kpi.machinesProduced": "Produced Machines",
        "dashboard.kpi.customers": "Customers",
        "dashboard.kpi.assignedMachines": "Assigned Machines",
        "dashboard.kpi.customerAccounts": "Customer Accounts",
        "dashboard.kpi.machines": "Machines",
        "dashboard.kpi.documents": "Documents",
        "dashboard.kpi.workOrders": "Work Orders",
        "dashboard.kpi.checklists": "Checklists",

        "dashboard.action.newMachine": "New Machine",
        "dashboard.action.addToCatalog": "Add to catalog",
        "dashboard.action.newCustomer": "New Customer",
        "dashboard.action.createCustomerOrg": "Create customer organization",
        "dashboard.action.assignMachines": "Assign Machines",
        "dashboard.action.linkMachinesToCustomers": "Link machines to customers",
        "dashboard.action.addMachine": "Add a machine",
        "dashboard.action.documents": "Documents",
        "dashboard.action.openDocumentArchive": "Open document archive",
        "dashboard.action.newWorkOrder": "New Work Order",
        "dashboard.action.planOperationalActivities": "Plan operational activities",

        "dashboard.recentCustomers": "Recent Customers",
        "dashboard.noRecentCustomers": "No recent customers.",
        "dashboard.customerFallback": "Customer",
        "dashboard.customerLabel": "Customer",

        "dashboard.recentMachines": "Recent Machines",
        "dashboard.noRecentMachines": "No recent machines.",
        "dashboard.machineFallback": "Machine",

        "equipment.title": "Machines",
        "equipment.subtitle": "Machines & equipment management",
        "equipment.new": "New machine",
        "equipment.noEquipment": "No machines found",
        "equipment.subtitleManufacturer": "Manage the machine catalog of the active manufacturer.",
        "equipment.subtitleCustomer": "Manage owned and assigned machines in the active customer context.",

        "equipment.kpi.visibleMachines": "Visible Machines",
        "equipment.kpi.activeAssignments": "Active Assignments",
        "equipment.kpi.hiddenMachines": "Hidden Machines",

        "equipment.searchPlaceholder": "Search machine",
        "equipment.hideLocalArchived": "Hide locally archived",
        "equipment.showHidden": "Show hidden",
        "equipment.listTitle": "Machine List",
        "equipment.loading": "Loading machines...",

        "equipment.machineFallback": "Machine",
        "equipment.linkedToPlant": "Linked to plant",

        "equipment.badge.owned": "Owned",
        "equipment.badge.assigned": "Assigned",
        "equipment.badge.archived": "Archived",

        "equipment.field.brand": "Brand",
        "equipment.field.model": "Model",

        "maintenance.title": "Maintenance",
        "maintenance.subtitle": "Manage and monitor all maintenance activities",
        "maintenance.newPlan": "New Plan",

        "maintenance.tab.plans": "Plans",
        "maintenance.tab.workOrders": "Work Orders",

        "maintenance.searchPlaceholder": "Search",
        "maintenance.loading": "Loading maintenance plans...",
        "maintenance.noPlans": "No maintenance plan found.",

        "maintenance.priority.high": "High",
        "maintenance.priority.medium": "Medium",
        "maintenance.priority.low": "Low",

        "maintenance.planFallback": "Maintenance plan",
        "maintenance.machineFallback": "Machine",

        "workOrders.title": "Work Orders",
        "workOrders.subtitle": "Plan, assign and monitor operational activities on machines.",
        "workOrders.new": "New Work Order",

        "workOrders.kpi.total": "Total",
        "workOrders.kpi.open": "Open",
        "workOrders.kpi.highPriority": "High Priority",

        "workOrders.searchPlaceholder": "Search work order",
        "workOrders.listTitle": "Work Order List",
        "workOrders.loading": "Loading work orders...",
        "workOrders.noResults": "No work order found.",

        "workOrders.priority.high": "High",
        "workOrders.priority.medium": "Medium",
        "workOrders.priority.low": "Low",

        "workOrders.status.open": "Open",
        "workOrders.status.inProgress": "In progress",
        "workOrders.status.closed": "Closed",

        "workOrders.fallbackTitle": "Work Order",
        "workOrders.machineFallback": "Machine",

        "checklists.title": "Checklists",
        "checklists.subtitle": "Manage checklist templates for inspections, checks and operational procedures.",
        "checklists.newTemplate": "New Template",

        "checklists.kpi.templates": "Templates",
        "checklists.kpi.totalItems": "Total Items",
        "checklists.kpi.safetyChecklists": "Safety Checklists",

        "checklists.searchPlaceholder": "Search checklist template",
        "checklists.listTitle": "Template List",
        "checklists.loading": "Loading checklist templates...",
        "checklists.noResults": "No checklist template found.",

        "checklists.category.safety": "Safety",
        "checklists.category.quality": "Quality",
        "checklists.category.operational": "Operational",

        "checklists.fallbackTitle": "Checklist template",
        "checklists.itemsLabel": "items",

        "documents.title": "Documents",
        "documents.subtitle": "Document hub aligned with the new owner / assignment model.",

        "documents.card.total.title": "Total documents",
        "documents.card.total.description": "Document archive visible in the active organizational context.",

        "documents.card.manufacturer.title": "Manufacturer documents",
        "documents.card.manufacturer.description": "Manuals, CE files, diagrams and original documentation.",

        "documents.card.customer.title": "Customer operational documents",
        "documents.card.customer.description": "Internal procedures, reports and local plant documents.",

        "documents.link.machineDocs.title": "Open machine documents",
        "documents.link.machineDocs.description": "Access documents directly from the machine detail page.",

        "documents.link.compliance.title": "Go to compliance",
        "documents.link.compliance.description": "Checks, compliance and documentation linked to the active context.",

        "plants.title": "Plants",
        "plants.subtitle": "Manage plants and production lines in the active context.",

        "plants.newPlant": "New Plant",
        "plants.newLine": "New Line",

        "plants.kpi.activePlants": "Active Plants",
        "plants.kpi.activeLines": "Active Lines",

        "plants.form.code": "Code",

        "plants.form.plant.title": "New Plant",
        "plants.form.plant.subtitle": "Create a plant in the active context.",
        "plants.form.plant.name": "Plant name",
        "plants.form.plant.namePlaceholder": "E.g. Plant Test 01",
        "plants.form.plant.codePlaceholder": "E.g. PLT-01",

        "plants.form.line.title": "New Line",
        "plants.form.line.subtitle": "Create a production line linked to a plant.",
        "plants.form.line.plant": "Plant",
        "plants.form.line.selectPlant": "Select",
        "plants.form.line.name": "Line name",
        "plants.form.line.namePlaceholder": "E.g. Test Line 01",
        "plants.form.line.codePlaceholder": "E.g. LN-01",

        "plants.saving": "Saving...",
        "plants.savePlant": "Save Plant",
        "plants.saveLine": "Save Line",

        "plants.listTitle": "Plant List",
        "plants.loading": "Loading plants...",
        "plants.noResults": "No plants available.",

        "plants.linkedLines": "Linked lines",
        "plants.noLinkedLines": "No linked lines",

        "plants.fallbackPlant": "Plant",
        "plants.fallbackLine": "Line",

        "customers.title": "Customers",
        "customers.subtitle": "List of customer organizations linked to the active manufacturer.",
        "customers.new": "New Customer",

        "customers.kpi.total": "Total Customers",
        "customers.kpi.activeOrganizations": "Active Organizations",

        "customers.listTitle": "Customer List",
        "customers.loading": "Loading customers...",
        "customers.noResults": "No linked customer.",

        "customers.fallbackTitle": "Customer",
        "customers.customerOrganization": "Customer organization",

        "assignments.title": "Assignments",
        "assignments.subtitle": "Active links between produced machines and end customers.",

        "assignments.kpi.active": "Active Assignments",

        "assignments.listTitle": "Assignment List",
        "assignments.loading": "Loading assignments...",
        "assignments.noResults": "No active assignment.",

        "assignments.machineFallback": "Machine",
        "assignments.customerFallback": "Customer",
        "assignments.assignedMachine": "Assigned machine",
        "assignments.destinationCustomer": "Destination customer",

        "analytics.title": "Analytics",
        "analytics.subtitle": "Single place to review operational data for the active context.",

        "analytics.item.checklists.title": "Checklist history",
        "analytics.item.checklists.description": "Analyze checklist executions in the active organizational context.",

        "analytics.item.workOrders.title": "Work orders",
        "analytics.item.workOrders.description": "Check progress and operational traceability of work orders.",

        "compliance.title": "Compliance",
        "compliance.subtitle": "Quick access hub for modules useful for compliance, audits and traceability.",

        "compliance.item.documents.title": "Compliance documentation",
        "compliance.item.documents.description": "Manuals, declarations, diagrams and relevant compliance documents.",

        "compliance.item.analytics.title": "Analytics and history",
        "compliance.item.analytics.description": "Checklist execution history and useful data for internal audits.",

        "compliance.item.executions.title": "Checklist executions",
        "compliance.item.executions.description": "Review executions and operational evidence linked to the active context.",

        "users.title": "Users",
        "users.subtitle": "Manage users and roles for",
        "users.activeOrganizationFallback": "the active organization",
        "users.new": "New user",
        "users.supervisorMode": "Supervisor mode: you can view users, but creation, editing and deactivation remain available only to admins.",

        "users.kpi.total": "Total users",
        "users.kpi.active": "Active users",
        "users.kpi.inactive": "Inactive users",

        "users.organizationMembers": "Organization members",
        "users.searchPlaceholder": "Search by name, email or role",
        "users.noResults": "No users found.",
        "users.fallbackUnnamed": "Unnamed user",

        "users.table.user": "User",
        "users.table.role": "Role",
        "users.table.status": "Status",
        "users.table.acceptance": "Acceptance",
        "users.table.actions": "Actions",

        "users.role.admin": "Admin",
        "users.role.supervisor": "Supervisor",
        "users.role.technician": "Technician",

        "users.status.active": "Active",
        "users.status.inactive": "Inactive",
        "users.status.pending": "Pending",

        "users.field.fullName": "Full name",
        "users.field.displayName": "Display name",
        "users.field.email": "Email",
        "users.field.password": "Password",
        "users.field.role": "Role",
        "users.field.status": "Status",

        "users.dialog.create.title": "New user",
        "users.dialog.create.description": "Create a new user in the active organization.",
        "users.dialog.create.confirm": "Create user",

        "users.dialog.edit.title": "Edit user",
        "users.dialog.edit.description": "Update name, role and status of the selected user.",
        "users.dialog.edit.confirm": "Save changes",

        "users.dialog.deactivate.title": "Deactivate user",
        "users.dialog.deactivate.description": "Do you really want to deactivate",
        "users.dialog.deactivate.confirm": "Deactivate",

        "users.toast.error": "Error",
        "users.toast.loadError": "Unable to load organization users.",
        "users.toast.permissionDenied": "Permission denied",
        "users.toast.adminOnlyCreate": "Only admins can create users.",
        "users.toast.adminOnlyEdit": "Only admins can edit users.",
        "users.toast.adminOnlyDeactivate": "Only admins can deactivate users.",
        "users.toast.missingData": "Missing data",
        "users.toast.emailPasswordRequired": "Email and password are required.",
        "users.toast.sessionExpired": "Session expired, please log in again",
        "users.toast.createFailed": "User creation failed",
        "users.toast.userCreated": "User created",
        "users.toast.createError": "User creation error",
        "users.toast.userUpdated": "User updated",
        "users.toast.updateError": "User update error",
        "users.toast.operationNotAllowed": "Operation not allowed",
        "users.toast.cannotDeactivateSelf": "You cannot deactivate yourself.",
        "users.toast.userDeactivated": "User deactivated",
        "users.toast.deactivateError": "User deactivation error",

        "activeOrg.title": "Active organization",
        "activeOrg.description": "Here you choose the real app context. All MACHINA views must read this organization from profiles.default_organization_id.",
        "activeOrg.noMemberships": "No active memberships found. Without at least one active membership, the web app cannot determine the organizational context.",
        "activeOrg.membershipsTitle": "Active memberships",
        "activeOrg.membershipsDescription": "Quickly check which organizations you are active in and with which role.",
        "activeOrg.activeBadge": "Active",
        "activeOrg.fallbackOrganization": "organization",

    },

    fr: {
        "common.loading": "Chargement...",
        "common.save": "Enregistrer",
        "common.cancel": "Annuler",
        "common.delete": "Supprimer",
        "common.edit": "Modifier",
        "common.create": "Créer",
        "common.search": "Rechercher",
        "common.filter": "Filtrer",
        "common.export": "Exporter",
        "common.back": "Retour",
        "common.next": "Suivant",
        "common.confirm": "Confirmer",
        "common.close": "Fermer",
        "common.yes": "Oui",
        "common.no": "Non",
        "common.all": "Tous",
        "common.none": "Aucun",
        "common.logout": "Déconnexion",
        "common.language": "Langue",
        "common.notifications": "Notifications",
        "common.system": "Système",
        "common.management": "Gestion",
        "common.viewAll": "Voir tout",

        "nav.dashboard": "Tableau de bord",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Ordres de travail",
        "nav.checklists": "Check-lists",
        "nav.scanner": "Scanner QR",
        "nav.analytics": "Analyses",
        "nav.compliance": "Conformité",
        "nav.documents": "Documents",
        "nav.plants": "Sites",
        "nav.users": "Utilisateurs",
        "nav.customers": "Clients",
        "nav.assignments": "Affectations",
        "nav.activeOrganization": "Organisation active",
        "nav.settings": "Paramètres",

        "org.manufacturer": "Constructeur",
        "org.customer": "Utilisateur final",
        "org.platform": "Plateforme",
        "org.context": "Contexte",

        "dashboard.title": "Tableau de bord",
        "dashboard.subtitle": "Aperçu du système",
        "dashboard.subtitleManufacturer": "Vue d’ensemble du contexte constructeur actif.",
        "dashboard.subtitleCustomer": "Vue rapide du contexte organisationnel actif.",

        "dashboard.kpi.machinesProduced": "Machines produites",
        "dashboard.kpi.customers": "Clients",
        "dashboard.kpi.assignedMachines": "Machines attribuées",
        "dashboard.kpi.customerAccounts": "Comptes clients",
        "dashboard.kpi.machines": "Machines",
        "dashboard.kpi.documents": "Documents",
        "dashboard.kpi.workOrders": "Ordres de travail",
        "dashboard.kpi.checklists": "Check-lists",

        "dashboard.action.newMachine": "Nouvelle machine",
        "dashboard.action.addToCatalog": "Ajouter au catalogue",
        "dashboard.action.newCustomer": "Nouveau client",
        "dashboard.action.createCustomerOrg": "Créer une organisation client",
        "dashboard.action.assignMachines": "Attribuer des machines",
        "dashboard.action.linkMachinesToCustomers": "Associer les machines aux clients",
        "dashboard.action.addMachine": "Ajouter une machine",
        "dashboard.action.documents": "Documents",
        "dashboard.action.openDocumentArchive": "Ouvrir l’archive documentaire",
        "dashboard.action.newWorkOrder": "Nouvel ordre de travail",
        "dashboard.action.planOperationalActivities": "Planifier les activités opérationnelles",

        "dashboard.recentCustomers": "Clients récents",
        "dashboard.noRecentCustomers": "Aucun client récent.",
        "dashboard.customerFallback": "Client",
        "dashboard.customerLabel": "Client",

        "dashboard.recentMachines": "Machines récentes",
        "dashboard.noRecentMachines": "Aucune machine récente.",
        "dashboard.machineFallback": "Machine",

        "equipment.title": "Machines",
        "equipment.subtitle": "Gestion des machines",
        "equipment.new": "Nouvelle machine",
        "equipment.noEquipment": "Aucune machine trouvée",
        "equipment.subtitleManufacturer": "Gérez le catalogue des machines du constructeur actif.",
        "equipment.subtitleCustomer": "Gérez les machines propres et attribuées dans le contexte client actif.",

        "equipment.kpi.visibleMachines": "Machines visibles",
        "equipment.kpi.activeAssignments": "Affectations actives",
        "equipment.kpi.hiddenMachines": "Machines masquées",

        "equipment.searchPlaceholder": "Rechercher une machine",
        "equipment.hideLocalArchived": "Masquer les archivées locales",
        "equipment.showHidden": "Afficher les masquées",
        "equipment.listTitle": "Liste des machines",
        "equipment.loading": "Chargement des machines...",

        "equipment.machineFallback": "Machine",
        "equipment.linkedToPlant": "Liée à un site",

        "equipment.badge.owned": "Propre",
        "equipment.badge.assigned": "Attribuée",
        "equipment.badge.archived": "Archivée",

        "equipment.field.brand": "Marque",
        "equipment.field.model": "Modèle",

        "maintenance.title": "Maintenance",
        "maintenance.subtitle": "Gérez et surveillez toutes les maintenances",
        "maintenance.newPlan": "Nouveau plan",

        "maintenance.tab.plans": "Plans",
        "maintenance.tab.workOrders": "Ordres de travail",

        "maintenance.searchPlaceholder": "Rechercher",
        "maintenance.loading": "Chargement des plans de maintenance...",
        "maintenance.noPlans": "Aucun plan de maintenance trouvé.",

        "maintenance.priority.high": "Haute",
        "maintenance.priority.medium": "Moyenne",
        "maintenance.priority.low": "Basse",

        "maintenance.planFallback": "Plan de maintenance",
        "maintenance.machineFallback": "Machine",

        "workOrders.title": "Ordres de travail",
        "workOrders.subtitle": "Planifiez, attribuez et surveillez les activités opérationnelles sur les machines.",
        "workOrders.new": "Nouvel ordre de travail",

        "workOrders.kpi.total": "Total",
        "workOrders.kpi.open": "Ouverts",
        "workOrders.kpi.highPriority": "Haute priorité",

        "workOrders.searchPlaceholder": "Rechercher un ordre de travail",
        "workOrders.listTitle": "Liste des ordres de travail",
        "workOrders.loading": "Chargement des ordres de travail...",
        "workOrders.noResults": "Aucun ordre de travail trouvé.",

        "workOrders.priority.high": "Haute",
        "workOrders.priority.medium": "Moyenne",
        "workOrders.priority.low": "Basse",

        "workOrders.status.open": "Ouvert",
        "workOrders.status.inProgress": "En cours",
        "workOrders.status.closed": "Fermé",

        "workOrders.fallbackTitle": "Ordre de travail",
        "workOrders.machineFallback": "Machine",

        "checklists.title": "Check-lists",
        "checklists.subtitle": "Gérez les modèles de check-lists pour contrôles, vérifications et procédures opérationnelles.",
        "checklists.newTemplate": "Nouveau modèle",

        "checklists.kpi.templates": "Modèles",
        "checklists.kpi.totalItems": "Éléments totaux",
        "checklists.kpi.safetyChecklists": "Check-lists sécurité",

        "checklists.searchPlaceholder": "Rechercher un modèle de check-list",
        "checklists.listTitle": "Liste des modèles",
        "checklists.loading": "Chargement des modèles de check-list...",
        "checklists.noResults": "Aucun modèle de check-list trouvé.",

        "checklists.category.safety": "Sécurité",
        "checklists.category.quality": "Qualité",
        "checklists.category.operational": "Opérationnelle",

        "checklists.fallbackTitle": "Modèle de check-list",
        "checklists.itemsLabel": "éléments",

        "documents.title": "Documents",
        "documents.subtitle": "Hub documentaire cohérent avec le nouveau modèle owner / assignment.",

        "documents.card.total.title": "Documents totaux",
        "documents.card.total.description": "Archive documentaire visible dans le contexte organisationnel actif.",

        "documents.card.manufacturer.title": "Documents constructeur",
        "documents.card.manufacturer.description": "Manuels, CE, schémas et documentation d’origine.",

        "documents.card.customer.title": "Documents opérationnels client",
        "documents.card.customer.description": "Procédures internes, rapports et documents locaux du site.",

        "documents.link.machineDocs.title": "Ouvrir les documents machine",
        "documents.link.machineDocs.description": "Accédez aux documents directement depuis la fiche machine.",

        "documents.link.compliance.title": "Aller à la conformité",
        "documents.link.compliance.description": "Contrôles, conformité et documentation liée au contexte actif.",

        "plants.title": "Sites",
        "plants.subtitle": "Gérez les sites et lignes de production du contexte actif.",

        "plants.newPlant": "Nouveau site",
        "plants.newLine": "Nouvelle ligne",

        "plants.kpi.activePlants": "Sites actifs",
        "plants.kpi.activeLines": "Lignes actives",

        "plants.form.code": "Code",

        "plants.form.plant.title": "Nouveau site",
        "plants.form.plant.subtitle": "Créez un site dans le contexte actif.",
        "plants.form.plant.name": "Nom du site",
        "plants.form.plant.namePlaceholder": "Ex. Plant Test 01",
        "plants.form.plant.codePlaceholder": "Ex. PLT-01",

        "plants.form.line.title": "Nouvelle ligne",
        "plants.form.line.subtitle": "Créez une ligne de production liée à un site.",
        "plants.form.line.plant": "Site",
        "plants.form.line.selectPlant": "Sélectionner",
        "plants.form.line.name": "Nom de la ligne",
        "plants.form.line.namePlaceholder": "Ex. Ligne Test 01",
        "plants.form.line.codePlaceholder": "Ex. LN-01",

        "plants.saving": "Enregistrement...",
        "plants.savePlant": "Enregistrer le site",
        "plants.saveLine": "Enregistrer la ligne",

        "plants.listTitle": "Liste des sites",
        "plants.loading": "Chargement des sites...",
        "plants.noResults": "Aucun site disponible.",

        "plants.linkedLines": "Lignes liées",
        "plants.noLinkedLines": "Aucune ligne liée",

        "plants.fallbackPlant": "Site",
        "plants.fallbackLine": "Ligne",

        "customers.title": "Clients",
        "customers.subtitle": "Liste des organisations clientes liées au constructeur actif.",
        "customers.new": "Nouveau Client",

        "customers.kpi.total": "Clients Totaux",
        "customers.kpi.activeOrganizations": "Organisations Actives",

        "customers.listTitle": "Liste des Clients",
        "customers.loading": "Chargement des clients...",
        "customers.noResults": "Aucun client lié.",

        "customers.fallbackTitle": "Client",
        "customers.customerOrganization": "Organisation cliente",

        "assignments.title": "Affectations",
        "assignments.subtitle": "Liens actifs entre les machines produites et les clients finaux.",

        "assignments.kpi.active": "Affectations Actives",

        "assignments.listTitle": "Liste des Affectations",
        "assignments.loading": "Chargement des affectations...",
        "assignments.noResults": "Aucune affectation active.",

        "assignments.machineFallback": "Machine",
        "assignments.customerFallback": "Client",
        "assignments.assignedMachine": "Machine attribuée",
        "assignments.destinationCustomer": "Client destinataire",

        "analytics.title": "Analyses",
        "analytics.subtitle": "Point unique pour consulter les données opérationnelles du contexte actif.",

        "analytics.item.checklists.title": "Historique des check-lists",
        "analytics.item.checklists.description": "Analysez les exécutions de check-lists dans le contexte organisationnel actif.",

        "analytics.item.workOrders.title": "Ordres de travail",
        "analytics.item.workOrders.description": "Contrôlez l’avancement et la traçabilité opérationnelle des ordres de travail.",

        "compliance.title": "Conformité",
        "compliance.subtitle": "Hub d’accès rapide aux modules utiles pour la conformité, les audits et la traçabilité.",

        "compliance.item.documents.title": "Documentation de conformité",
        "compliance.item.documents.description": "Manuels, déclarations, schémas et documents pertinents pour la conformité.",

        "compliance.item.analytics.title": "Analyses et historique",
        "compliance.item.analytics.description": "Historique des exécutions de check-lists et données utiles pour les audits internes.",

        "compliance.item.executions.title": "Exécutions de check-lists",
        "compliance.item.executions.description": "Vérifiez les exécutions et les preuves opérationnelles liées au contexte actif.",

        "users.title": "Utilisateurs",
        "users.subtitle": "Gérez les utilisateurs et rôles pour",
        "users.activeOrganizationFallback": "l'organisation active",
        "users.new": "Nouvel utilisateur",
        "users.supervisorMode": "Mode superviseur : vous pouvez voir les utilisateurs, mais la création, la modification et la désactivation restent réservées aux admins.",

        "users.kpi.total": "Utilisateurs totaux",
        "users.kpi.active": "Utilisateurs actifs",
        "users.kpi.inactive": "Utilisateurs inactifs",

        "users.organizationMembers": "Membres de l'organisation",
        "users.searchPlaceholder": "Rechercher par nom, email ou rôle",
        "users.noResults": "Aucun utilisateur trouvé.",
        "users.fallbackUnnamed": "Utilisateur sans nom",

        "users.table.user": "Utilisateur",
        "users.table.role": "Rôle",
        "users.table.status": "Statut",
        "users.table.acceptance": "Acceptation",
        "users.table.actions": "Actions",

        "users.role.admin": "Admin",
        "users.role.supervisor": "Superviseur",
        "users.role.technician": "Technicien",

        "users.status.active": "Actif",
        "users.status.inactive": "Inactif",
        "users.status.pending": "En attente",

        "users.field.fullName": "Nom complet",
        "users.field.displayName": "Nom affiché",
        "users.field.email": "Email",
        "users.field.password": "Mot de passe",
        "users.field.role": "Rôle",
        "users.field.status": "Statut",

        "users.dialog.create.title": "Nouvel utilisateur",
        "users.dialog.create.description": "Créez un nouvel utilisateur dans l'organisation active.",
        "users.dialog.create.confirm": "Créer l'utilisateur",

        "users.dialog.edit.title": "Modifier l'utilisateur",
        "users.dialog.edit.description": "Mettez à jour le nom, le rôle et le statut de l'utilisateur sélectionné.",
        "users.dialog.edit.confirm": "Enregistrer les modifications",

        "users.dialog.deactivate.title": "Désactiver l'utilisateur",
        "users.dialog.deactivate.description": "Voulez-vous vraiment désactiver",
        "users.dialog.deactivate.confirm": "Désactiver",

        "users.toast.error": "Erreur",
        "users.toast.loadError": "Impossible de charger les utilisateurs de l'organisation.",
        "users.toast.permissionDenied": "Permission refusée",
        "users.toast.adminOnlyCreate": "Seuls les admins peuvent créer des utilisateurs.",
        "users.toast.adminOnlyEdit": "Seuls les admins peuvent modifier des utilisateurs.",
        "users.toast.adminOnlyDeactivate": "Seuls les admins peuvent désactiver des utilisateurs.",
        "users.toast.missingData": "Données manquantes",
        "users.toast.emailPasswordRequired": "Email et mot de passe sont obligatoires.",
        "users.toast.sessionExpired": "Session expirée, reconnectez-vous",
        "users.toast.createFailed": "Échec de création de l'utilisateur",
        "users.toast.userCreated": "Utilisateur créé",
        "users.toast.createError": "Erreur de création utilisateur",
        "users.toast.userUpdated": "Utilisateur mis à jour",
        "users.toast.updateError": "Erreur de mise à jour utilisateur",
        "users.toast.operationNotAllowed": "Opération non autorisée",
        "users.toast.cannotDeactivateSelf": "Vous ne pouvez pas vous désactiver vous-même.",
        "users.toast.userDeactivated": "Utilisateur désactivé",
        "users.toast.deactivateError": "Erreur de désactivation utilisateur",

        "activeOrg.title": "Organisation active",
        "activeOrg.description": "Ici, vous choisissez le contexte réel de l'application web. Toutes les vues MACHINA doivent lire cette organisation depuis profiles.default_organization_id.",
        "activeOrg.noMemberships": "Aucune adhésion active trouvée. Sans au moins une adhésion active, l'application web ne peut pas déterminer le contexte organisationnel.",
        "activeOrg.membershipsTitle": "Adhésions actives",
        "activeOrg.membershipsDescription": "Vérifiez rapidement dans quelles organisations vous êtes actif et avec quel rôle.",
        "activeOrg.activeBadge": "Active",
        "activeOrg.fallbackOrganization": "organisation",
        
    },

    es: {
        "common.loading": "Cargando...",
        "common.save": "Guardar",
        "common.cancel": "Cancelar",
        "common.delete": "Eliminar",
        "common.edit": "Editar",
        "common.create": "Crear",
        "common.search": "Buscar",
        "common.filter": "Filtrar",
        "common.export": "Exportar",
        "common.back": "Atrás",
        "common.next": "Siguiente",
        "common.confirm": "Confirmar",
        "common.close": "Cerrar",
        "common.yes": "Sí",
        "common.no": "No",
        "common.all": "Todos",
        "common.none": "Ninguno",
        "common.logout": "Salir",
        "common.language": "Idioma",
        "common.notifications": "Notificaciones",
        "common.system": "Sistema",
        "common.management": "Gestión",
        "common.viewAll": "Ver todos",

        "nav.dashboard": "Panel",
        "nav.equipment": "Máquinas",
        "nav.maintenance": "Mantenimiento",
        "nav.workOrders": "Órdenes de trabajo",
        "nav.checklists": "Checklists",
        "nav.scanner": "Escáner QR",
        "nav.analytics": "Análisis",
        "nav.compliance": "Cumplimiento",
        "nav.documents": "Documentos",
        "nav.plants": "Plantas",
        "nav.users": "Usuarios",
        "nav.customers": "Clientes",
        "nav.assignments": "Asignaciones",
        "nav.activeOrganization": "Organización activa",
        "nav.settings": "Configuración",

        "org.manufacturer": "Fabricante",
        "org.customer": "Usuario final",
        "org.platform": "Plataforma",
        "org.context": "Contexto",

        "dashboard.title": "Panel",
        "dashboard.subtitle": "Resumen del sistema",
        "dashboard.subtitleManufacturer": "Resumen del contexto activo del fabricante.",
        "dashboard.subtitleCustomer": "Vista rápida del contexto organizativo activo.",

        "dashboard.kpi.machinesProduced": "Máquinas producidas",
        "dashboard.kpi.customers": "Clientes",
        "dashboard.kpi.assignedMachines": "Máquinas asignadas",
        "dashboard.kpi.customerAccounts": "Cuentas de clientes",
        "dashboard.kpi.machines": "Máquinas",
        "dashboard.kpi.documents": "Documentos",
        "dashboard.kpi.workOrders": "Órdenes de trabajo",
        "dashboard.kpi.checklists": "Checklists",

        "dashboard.action.newMachine": "Nueva máquina",
        "dashboard.action.addToCatalog": "Agregar al catálogo",
        "dashboard.action.newCustomer": "Nuevo cliente",
        "dashboard.action.createCustomerOrg": "Crear organización cliente",
        "dashboard.action.assignMachines": "Asignar máquinas",
        "dashboard.action.linkMachinesToCustomers": "Vincular máquinas a clientes",
        "dashboard.action.addMachine": "Agregar una máquina",
        "dashboard.action.documents": "Documentos",
        "dashboard.action.openDocumentArchive": "Abrir archivo documental",
        "dashboard.action.newWorkOrder": "Nueva orden de trabajo",
        "dashboard.action.planOperationalActivities": "Planificar actividades operativas",

        "dashboard.recentCustomers": "Clientes recientes",
        "dashboard.noRecentCustomers": "No hay clientes recientes.",
        "dashboard.customerFallback": "Cliente",
        "dashboard.customerLabel": "Cliente",

        "dashboard.recentMachines": "Máquinas recientes",
        "dashboard.noRecentMachines": "No hay máquinas recientes.",
        "dashboard.machineFallback": "Máquina",

        "equipment.title": "Máquinas",
        "equipment.subtitle": "Gestión de máquinas",
        "equipment.new": "Nueva máquina",
        "equipment.noEquipment": "No se encontraron máquinas",
        "equipment.subtitleManufacturer": "Gestiona el catálogo de máquinas del fabricante activo.",
        "equipment.subtitleCustomer": "Gestiona máquinas propias y asignadas en el contexto de cliente activo.",

        "equipment.kpi.visibleMachines": "Máquinas visibles",
        "equipment.kpi.activeAssignments": "Asignaciones activas",
        "equipment.kpi.hiddenMachines": "Máquinas ocultas",

        "equipment.searchPlaceholder": "Buscar máquina",
        "equipment.hideLocalArchived": "Ocultar archivadas locales",
        "equipment.showHidden": "Mostrar ocultas",
        "equipment.listTitle": "Lista de máquinas",
        "equipment.loading": "Cargando máquinas...",

        "equipment.machineFallback": "Máquina",
        "equipment.linkedToPlant": "Vinculada a planta",

        "equipment.badge.owned": "Propia",
        "equipment.badge.assigned": "Asignada",
        "equipment.badge.archived": "Archivada",

        "equipment.field.brand": "Marca",
        "equipment.field.model": "Modelo",

        "maintenance.title": "Mantenimiento",
        "maintenance.subtitle": "Gestiona y supervisa todos los mantenimientos",
        "maintenance.newPlan": "Nuevo plan",

        "maintenance.tab.plans": "Planes",
        "maintenance.tab.workOrders": "Órdenes de trabajo",

        "maintenance.searchPlaceholder": "Buscar",
        "maintenance.loading": "Cargando planes de mantenimiento...",
        "maintenance.noPlans": "No se encontró ningún plan de mantenimiento.",

        "maintenance.priority.high": "Alta",
        "maintenance.priority.medium": "Media",
        "maintenance.priority.low": "Baja",

        "maintenance.planFallback": "Plan de mantenimiento",
        "maintenance.machineFallback": "Máquina",

        "workOrders.title": "Órdenes de trabajo",
        "workOrders.subtitle": "Planifica, asigna y supervisa las actividades operativas en las máquinas.",
        "workOrders.new": "Nueva orden de trabajo",

        "workOrders.kpi.total": "Totales",
        "workOrders.kpi.open": "Abiertas",
        "workOrders.kpi.highPriority": "Alta prioridad",

        "workOrders.searchPlaceholder": "Buscar orden de trabajo",
        "workOrders.listTitle": "Lista de órdenes de trabajo",
        "workOrders.loading": "Cargando órdenes de trabajo...",
        "workOrders.noResults": "No se encontró ninguna orden de trabajo.",

        "workOrders.priority.high": "Alta",
        "workOrders.priority.medium": "Media",
        "workOrders.priority.low": "Baja",

        "workOrders.status.open": "Abierta",
        "workOrders.status.inProgress": "En curso",
        "workOrders.status.closed": "Cerrada",

        "workOrders.fallbackTitle": "Orden de trabajo",
        "workOrders.machineFallback": "Máquina",

        "checklists.title": "Checklists",
        "checklists.subtitle": "Gestiona plantillas de checklist para controles, verificaciones y procedimientos operativos.",
        "checklists.newTemplate": "Nueva plantilla",

        "checklists.kpi.templates": "Plantillas",
        "checklists.kpi.totalItems": "Elementos totales",
        "checklists.kpi.safetyChecklists": "Checklists de seguridad",

        "checklists.searchPlaceholder": "Buscar plantilla de checklist",
        "checklists.listTitle": "Lista de plantillas",
        "checklists.loading": "Cargando plantillas de checklist...",
        "checklists.noResults": "No se encontró ninguna plantilla de checklist.",

        "checklists.category.safety": "Seguridad",
        "checklists.category.quality": "Calidad",
        "checklists.category.operational": "Operativa",

        "checklists.fallbackTitle": "Plantilla de checklist",
        "checklists.itemsLabel": "elementos",

        "documents.title": "Documentos",
        "documents.subtitle": "Hub documental coherente con el nuevo modelo owner / assignment.",

        "documents.card.total.title": "Documentos totales",
        "documents.card.total.description": "Archivo documental visible en el contexto organizativo activo.",

        "documents.card.manufacturer.title": "Documentos del fabricante",
        "documents.card.manufacturer.description": "Manuales, CE, esquemas y documentación original.",

        "documents.card.customer.title": "Documentos operativos del cliente",
        "documents.card.customer.description": "Procedimientos internos, informes y documentos locales de planta.",

        "documents.link.machineDocs.title": "Abrir documentos de máquina",
        "documents.link.machineDocs.description": "Accede a los documentos directamente desde el detalle de la máquina.",

        "documents.link.compliance.title": "Ir a compliance",
        "documents.link.compliance.description": "Controles, cumplimiento y documentación vinculada al contexto activo.",

        "plants.title": "Plantas",
        "plants.subtitle": "Gestiona plantas y líneas de producción del contexto activo.",

        "plants.newPlant": "Nueva planta",
        "plants.newLine": "Nueva línea",

        "plants.kpi.activePlants": "Plantas activas",
        "plants.kpi.activeLines": "Líneas activas",

        "plants.form.code": "Código",

        "plants.form.plant.title": "Nueva planta",
        "plants.form.plant.subtitle": "Crea una planta en el contexto activo.",
        "plants.form.plant.name": "Nombre de la planta",
        "plants.form.plant.namePlaceholder": "Ej. Plant Test 01",
        "plants.form.plant.codePlaceholder": "Ej. PLT-01",

        "plants.form.line.title": "Nueva línea",
        "plants.form.line.subtitle": "Crea una línea de producción vinculada a una planta.",
        "plants.form.line.plant": "Planta",
        "plants.form.line.selectPlant": "Seleccionar",
        "plants.form.line.name": "Nombre de la línea",
        "plants.form.line.namePlaceholder": "Ej. Línea Test 01",
        "plants.form.line.codePlaceholder": "Ej. LN-01",

        "plants.saving": "Guardando...",
        "plants.savePlant": "Guardar planta",
        "plants.saveLine": "Guardar línea",

        "plants.listTitle": "Lista de plantas",
        "plants.loading": "Cargando plantas...",
        "plants.noResults": "No hay plantas disponibles.",

        "plants.linkedLines": "Líneas vinculadas",
        "plants.noLinkedLines": "Ninguna línea vinculada",

        "plants.fallbackPlant": "Planta",
        "plants.fallbackLine": "Línea",

        "customers.title": "Clientes",
        "customers.subtitle": "Lista de organizaciones cliente vinculadas al fabricante activo.",
        "customers.new": "Nuevo Cliente",

        "customers.kpi.total": "Clientes Totales",
        "customers.kpi.activeOrganizations": "Organizaciones Activas",

        "customers.listTitle": "Lista de Clientes",
        "customers.loading": "Cargando clientes...",
        "customers.noResults": "No hay clientes vinculados.",

        "customers.fallbackTitle": "Cliente",
        "customers.customerOrganization": "Organización cliente",

        "assignments.title": "Asignaciones",
        "assignments.subtitle": "Vínculos activos entre máquinas producidas y clientes finales.",

        "assignments.kpi.active": "Asignaciones Activas",

        "assignments.listTitle": "Lista de Asignaciones",
        "assignments.loading": "Cargando asignaciones...",
        "assignments.noResults": "No hay asignaciones activas.",

        "assignments.machineFallback": "Máquina",
        "assignments.customerFallback": "Cliente",
        "assignments.assignedMachine": "Máquina asignada",
        "assignments.destinationCustomer": "Cliente destinatario",

        "analytics.title": "Análisis",
        "analytics.subtitle": "Punto único para consultar los datos operativos del contexto activo.",

        "analytics.item.checklists.title": "Historial de checklists",
        "analytics.item.checklists.description": "Analiza las ejecuciones de checklist en el contexto organizativo activo.",

        "analytics.item.workOrders.title": "Órdenes de trabajo",
        "analytics.item.workOrders.description": "Controla el avance y la trazabilidad operativa de las órdenes de trabajo.",

        "compliance.title": "Cumplimiento",
        "compliance.subtitle": "Hub de acceso rápido a los módulos útiles para cumplimiento, auditorías y trazabilidad.",

        "compliance.item.documents.title": "Documentación de cumplimiento",
        "compliance.item.documents.description": "Manuales, declaraciones, esquemas y documentos relevantes para el cumplimiento.",

        "compliance.item.analytics.title": "Análisis e histórico",
        "compliance.item.analytics.description": "Histórico de ejecuciones de checklist y datos útiles para auditorías internas.",

        "compliance.item.executions.title": "Ejecuciones de checklist",
        "compliance.item.executions.description": "Verifica ejecuciones y evidencias operativas vinculadas al contexto activo.",

        "users.title": "Usuarios",
        "users.subtitle": "Gestiona usuarios y roles para",
        "users.activeOrganizationFallback": "la organización activa",
        "users.new": "Nuevo usuario",
        "users.supervisorMode": "Modo supervisor: puedes ver los usuarios, pero la creación, edición y desactivación siguen disponibles solo para los administradores.",

        "users.kpi.total": "Usuarios totales",
        "users.kpi.active": "Usuarios activos",
        "users.kpi.inactive": "Usuarios inactivos",

        "users.organizationMembers": "Miembros de la organización",
        "users.searchPlaceholder": "Buscar por nombre, email o rol",
        "users.noResults": "No se encontraron usuarios.",
        "users.fallbackUnnamed": "Usuario sin nombre",

        "users.table.user": "Usuario",
        "users.table.role": "Rol",
        "users.table.status": "Estado",
        "users.table.acceptance": "Aceptación",
        "users.table.actions": "Acciones",

        "users.role.admin": "Admin",
        "users.role.supervisor": "Supervisor",
        "users.role.technician": "Técnico",

        "users.status.active": "Activo",
        "users.status.inactive": "Inactivo",
        "users.status.pending": "Pendiente",

        "users.field.fullName": "Nombre completo",
        "users.field.displayName": "Nombre visible",
        "users.field.email": "Email",
        "users.field.password": "Contraseña",
        "users.field.role": "Rol",
        "users.field.status": "Estado",

        "users.dialog.create.title": "Nuevo usuario",
        "users.dialog.create.description": "Crea un nuevo usuario en la organización activa.",
        "users.dialog.create.confirm": "Crear usuario",

        "users.dialog.edit.title": "Editar usuario",
        "users.dialog.edit.description": "Actualiza el nombre, rol y estado del usuario seleccionado.",
        "users.dialog.edit.confirm": "Guardar cambios",

        "users.dialog.deactivate.title": "Desactivar usuario",
        "users.dialog.deactivate.description": "¿De verdad quieres desactivar a",
        "users.dialog.deactivate.confirm": "Desactivar",

        "users.toast.error": "Error",
        "users.toast.loadError": "No se pudieron cargar los usuarios de la organización.",
        "users.toast.permissionDenied": "Permiso denegado",
        "users.toast.adminOnlyCreate": "Solo los administradores pueden crear usuarios.",
        "users.toast.adminOnlyEdit": "Solo los administradores pueden editar usuarios.",
        "users.toast.adminOnlyDeactivate": "Solo los administradores pueden desactivar usuarios.",
        "users.toast.missingData": "Datos faltantes",
        "users.toast.emailPasswordRequired": "El email y la contraseña son obligatorios.",
        "users.toast.sessionExpired": "Sesión expirada, inicia sesión de nuevo",
        "users.toast.createFailed": "La creación del usuario falló",
        "users.toast.userCreated": "Usuario creado",
        "users.toast.createError": "Error al crear usuario",
        "users.toast.userUpdated": "Usuario actualizado",
        "users.toast.updateError": "Error al actualizar usuario",
        "users.toast.operationNotAllowed": "Operación no permitida",
        "users.toast.cannotDeactivateSelf": "No puedes desactivarte a ti mismo.",
        "users.toast.userDeactivated": "Usuario desactivado",
        "users.toast.deactivateError": "Error al desactivar usuario",

        "activeOrg.title": "Organización activa",
        "activeOrg.description": "Aquí eliges el contexto real de la aplicación web. Todas las vistas de MACHINA deben leer esta organización desde profiles.default_organization_id.",
        "activeOrg.noMemberships": "No se encontraron membresías activas. Sin al menos una membresía activa, la aplicación web no puede determinar el contexto organizativo.",
        "activeOrg.membershipsTitle": "Membresías activas",
        "activeOrg.membershipsDescription": "Verifica rápidamente en qué organizaciones estás activo y con qué rol.",
        "activeOrg.activeBadge": "Activa",
        "activeOrg.fallbackOrganization": "organización",
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language > ("it");

    useEffect(() => {
        const stored = localStorage.getItem("app-language") as Language | null;
        if (stored && ["it", "en", "fr", "es"].includes(stored)) {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app-language", lang);
    };

    const t = (key: string): string => {
        return translations[language]?.[key] || translations.it?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

export const languageFlags: Record<Language, string> = {
    it: "🇮🇹",
    en: "🇬🇧",
    fr: "🇫🇷",
    es: "🇪🇸",
};

export const languageNames: Record<Language, string> = {
    it: "Italiano",
    en: "English",
    fr: "Français",
    es: "Español",
};