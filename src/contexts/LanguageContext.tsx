import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "it" | "en" | "fr" | "es";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

// ============================================================================
// DEFINIZIONE CHIAVI
// ============================================================================
// Ogni chiave è dichiarata UNA SOLA VOLTA qui, con le 4 traduzioni.
// Questo impedisce strutturalmente il drift tra lingue e i duplicati.
// ============================================================================

type T4 = { it: string; en: string; fr: string; es: string };

const DICT: Record<string, T4> = {
    // --- common ---
    "common.loading": { it: "Caricamento...", en: "Loading...", fr: "Chargement...", es: "Cargando..." },
    "common.save": { it: "Salva", en: "Save", fr: "Enregistrer", es: "Guardar" },
    "common.cancel": { it: "Annulla", en: "Cancel", fr: "Annuler", es: "Cancelar" },
    "common.delete": { it: "Elimina", en: "Delete", fr: "Supprimer", es: "Eliminar" },
    "common.edit": { it: "Modifica", en: "Edit", fr: "Modifier", es: "Editar" },
    "common.create": { it: "Crea", en: "Create", fr: "Créer", es: "Crear" },
    "common.search": { it: "Cerca", en: "Search", fr: "Rechercher", es: "Buscar" },
    "common.filter": { it: "Filtra", en: "Filter", fr: "Filtrer", es: "Filtrar" },
    "common.export": { it: "Esporta", en: "Export", fr: "Exporter", es: "Exportar" },
    "common.back": { it: "Indietro", en: "Back", fr: "Retour", es: "Atrás" },
    "common.next": { it: "Avanti", en: "Next", fr: "Suivant", es: "Siguiente" },
    "common.confirm": { it: "Conferma", en: "Confirm", fr: "Confirmer", es: "Confirmar" },
    "common.close": { it: "Chiudi", en: "Close", fr: "Fermer", es: "Cerrar" },
    "common.yes": { it: "Sì", en: "Yes", fr: "Oui", es: "Sí" },
    "common.no": { it: "No", en: "No", fr: "Non", es: "No" },
    "common.all": { it: "Tutti", en: "All", fr: "Tous", es: "Todos" },
    "common.none": { it: "Nessuno", en: "None", fr: "Aucun", es: "Ninguno" },
    "common.logout": { it: "Esci", en: "Logout", fr: "Déconnexion", es: "Salir" },
    "common.language": { it: "Lingua", en: "Language", fr: "Langue", es: "Idioma" },
    "common.notifications": { it: "Notifiche", en: "Notifications", fr: "Notifications", es: "Notificaciones" },
    "common.system": { it: "Sistema", en: "System", fr: "Système", es: "Sistema" },
    "common.management": { it: "Gestione", en: "Management", fr: "Gestion", es: "Gestión" },
    "common.viewAll": { it: "Vedi tutti", en: "View all", fr: "Voir tout", es: "Ver todos" },
    "common.error": { it: "Errore", en: "Error", fr: "Erreur", es: "Error" },
    "common.saving": { it: "Salvataggio...", en: "Saving...", fr: "Enregistrement...", es: "Guardando..." },

    // --- nav ---
    "nav.dashboard": { it: "Dashboard", en: "Dashboard", fr: "Tableau de bord", es: "Panel" },
    "nav.equipment": { it: "Macchine", en: "Machines", fr: "Machines", es: "Máquinas" },
    "nav.maintenance": { it: "Manutenzione", en: "Maintenance", fr: "Maintenance", es: "Mantenimiento" },
    "nav.workOrders": { it: "Ordini di lavoro", en: "Work Orders", fr: "Ordres de travail", es: "Órdenes de trabajo" },
    "nav.checklists": { it: "Checklist", en: "Checklists", fr: "Check-lists", es: "Checklists" },
    "nav.scanner": { it: "Scanner QR", en: "QR Scanner", fr: "Scanner QR", es: "Escáner QR" },
    "nav.analytics": { it: "Analisi", en: "Analytics", fr: "Analyses", es: "Análisis" },
    "nav.compliance": { it: "Compliance", en: "Compliance", fr: "Conformité", es: "Cumplimiento" },
    "nav.documents": { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" },
    "nav.plants": { it: "Stabilimenti", en: "Plants", fr: "Sites", es: "Plantas" },
    "nav.users": { it: "Utenti", en: "Users", fr: "Utilisateurs", es: "Usuarios" },
    "nav.customers": { it: "Clienti", en: "Customers", fr: "Clients", es: "Clientes" },
    "nav.assignments": { it: "Assegnazioni", en: "Assignments", fr: "Affectations", es: "Asignaciones" },
    "nav.activeOrganization": { it: "Organizzazione attiva", en: "Active organization", fr: "Organisation active", es: "Organización activa" },
    "nav.settings": { it: "Impostazioni", en: "Settings", fr: "Paramètres", es: "Configuración" },
    "nav.security": { it: "Sicurezza", en: "Security", fr: "Sécurité", es: "Seguridad" },

    // --- org ---
    "org.manufacturer": { it: "Costruttore", en: "Manufacturer", fr: "Constructeur", es: "Fabricante" },
    "org.customer": { it: "Utilizzatore finale", en: "End user", fr: "Utilisateur final", es: "Usuario final" },
    "org.enterprise": { it: "Impresa", en: "Enterprise", fr: "Entreprise", es: "Empresa" },
    "org.platform": { it: "Piattaforma", en: "Platform", fr: "Plateforme", es: "Plataforma" },
    "org.context": { it: "Contesto", en: "Context", fr: "Contexte", es: "Contexto" },

    // --- dashboard ---
    "dashboard.title": { it: "Dashboard", en: "Dashboard", fr: "Tableau de bord", es: "Panel" },
    "dashboard.subtitle": { it: "Panoramica del sistema", en: "System overview", fr: "Aperçu du système", es: "Resumen del sistema" },
    "dashboard.subtitleManufacturer": { it: "Panoramica del contesto costruttore attivo.", en: "Overview of the active manufacturer context.", fr: "Vue d'ensemble du contexte constructeur actif.", es: "Resumen del contexto activo del fabricante." },
    "dashboard.subtitleCustomer": { it: "Vista rapida del contesto organizzativo attivo.", en: "Quick view of the active organizational context.", fr: "Vue rapide du contexte organisationnel actif.", es: "Vista rápida del contexto organizativo activo." },

    "dashboard.kpi.machinesProduced": { it: "Macchine Prodotte", en: "Produced Machines", fr: "Machines produites", es: "Máquinas producidas" },
    "dashboard.kpi.customers": { it: "Clienti", en: "Customers", fr: "Clients", es: "Clientes" },
    "dashboard.kpi.assignedMachines": { it: "Macchine Assegnate", en: "Assigned Machines", fr: "Machines attribuées", es: "Máquinas asignadas" },
    "dashboard.kpi.customerAccounts": { it: "Account Clienti", en: "Customer Accounts", fr: "Comptes clients", es: "Cuentas de clientes" },
    "dashboard.kpi.machines": { it: "Macchine", en: "Machines", fr: "Machines", es: "Máquinas" },
    "dashboard.kpi.documents": { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" },
    "dashboard.kpi.workOrders": { it: "Work Orders", en: "Work Orders", fr: "Ordres de travail", es: "Órdenes de trabajo" },
    "dashboard.kpi.checklists": { it: "Checklist", en: "Checklists", fr: "Check-lists", es: "Checklists" },

    "dashboard.action.newMachine": { it: "Nuova Macchina", en: "New Machine", fr: "Nouvelle machine", es: "Nueva máquina" },
    "dashboard.action.addToCatalog": { it: "Aggiungi al catalogo", en: "Add to catalog", fr: "Ajouter au catalogue", es: "Agregar al catálogo" },
    "dashboard.action.newCustomer": { it: "Nuovo Cliente", en: "New Customer", fr: "Nouveau client", es: "Nuevo cliente" },
    "dashboard.action.createCustomerOrg": { it: "Crea organizzazione cliente", en: "Create customer organization", fr: "Créer une organisation client", es: "Crear organización cliente" },
    "dashboard.action.assignMachines": { it: "Assegna Macchine", en: "Assign Machines", fr: "Attribuer des machines", es: "Asignar máquinas" },
    "dashboard.action.linkMachinesToCustomers": { it: "Collega macchine ai clienti", en: "Link machines to customers", fr: "Associer les machines aux clients", es: "Vincular máquinas a clientes" },
    "dashboard.action.addMachine": { it: "Aggiungi una macchina", en: "Add a machine", fr: "Ajouter une machine", es: "Agregar una máquina" },
    "dashboard.action.documents": { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" },
    "dashboard.action.openDocumentArchive": { it: "Apri archivio documentale", en: "Open document archive", fr: "Ouvrir l'archive documentaire", es: "Abrir archivo documental" },
    "dashboard.action.newWorkOrder": { it: "Nuovo Work Order", en: "New Work Order", fr: "Nouvel ordre de travail", es: "Nueva orden de trabajo" },
    "dashboard.action.planOperationalActivities": { it: "Pianifica attività operative", en: "Plan operational activities", fr: "Planifier les activités opérationnelles", es: "Planificar actividades operativas" },

    "dashboard.recentCustomers": { it: "Clienti Recenti", en: "Recent Customers", fr: "Clients récents", es: "Clientes recientes" },
    "dashboard.noRecentCustomers": { it: "Nessun cliente recente.", en: "No recent customers.", fr: "Aucun client récent.", es: "No hay clientes recientes." },
    "dashboard.customerFallback": { it: "Cliente", en: "Customer", fr: "Client", es: "Cliente" },
    "dashboard.customerLabel": { it: "Cliente", en: "Customer", fr: "Client", es: "Cliente" },
    "dashboard.recentMachines": { it: "Ultime Macchine", en: "Recent Machines", fr: "Machines récentes", es: "Máquinas recientes" },
    "dashboard.noRecentMachines": { it: "Nessuna macchina recente.", en: "No recent machines.", fr: "Aucune machine récente.", es: "No hay máquinas recientes." },
    "dashboard.machineFallback": { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" },

    // --- equipment ---
    "equipment.title": { it: "Macchine", en: "Machines", fr: "Machines", es: "Máquinas" },
    "equipment.subtitle": { it: "Gestione macchine e attrezzature", en: "Machines & equipment management", fr: "Gestion des machines", es: "Gestión de máquinas" },
    "equipment.new": { it: "Nuova macchina", en: "New machine", fr: "Nouvelle machine", es: "Nueva máquina" },
    "equipment.noEquipment": { it: "Nessuna macchina trovata", en: "No machines found", fr: "Aucune machine trouvée", es: "No se encontraron máquinas" },
    "equipment.subtitleManufacturer": { it: "Gestisci il catalogo macchine del costruttore attivo.", en: "Manage the machine catalog of the active manufacturer.", fr: "Gérez le catalogue des machines du constructeur actif.", es: "Gestiona el catálogo de máquinas del fabricante activo." },
    "equipment.subtitleCustomer": { it: "Gestisci macchine proprie e macchine assegnate nel contesto cliente attivo.", en: "Manage owned and assigned machines in the active customer context.", fr: "Gérez les machines propres et attribuées dans le contexte client actif.", es: "Gestiona máquinas propias y asignadas en el contexto de cliente activo." },

    "equipment.kpi.visibleMachines": { it: "Macchine Visibili", en: "Visible Machines", fr: "Machines visibles", es: "Máquinas visibles" },
    "equipment.kpi.activeAssignments": { it: "Assegnazioni Attive", en: "Active Assignments", fr: "Affectations actives", es: "Asignaciones activas" },
    "equipment.kpi.hiddenMachines": { it: "Macchine Nascoste", en: "Hidden Machines", fr: "Machines masquées", es: "Máquinas ocultas" },

    "equipment.searchPlaceholder": { it: "Cerca macchina", en: "Search machine", fr: "Rechercher une machine", es: "Buscar máquina" },
    "equipment.hideLocalArchived": { it: "Nascondi archiviate locali", en: "Hide locally archived", fr: "Masquer les archivées locales", es: "Ocultar archivadas locales" },
    "equipment.showHidden": { it: "Mostra nascoste", en: "Show hidden", fr: "Afficher les masquées", es: "Mostrar ocultas" },
    "equipment.listTitle": { it: "Elenco Macchine", en: "Machine List", fr: "Liste des machines", es: "Lista de máquinas" },
    "equipment.loading": { it: "Caricamento macchine...", en: "Loading machines...", fr: "Chargement des machines...", es: "Cargando máquinas..." },

    "equipment.machineFallback": { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" },
    "equipment.linkedToPlant": { it: "Collegata a stabilimento", en: "Linked to plant", fr: "Liée à un site", es: "Vinculada a planta" },

    "equipment.badge.owned": { it: "Propria", en: "Owned", fr: "Propre", es: "Propia" },
    "equipment.badge.assigned": { it: "Assegnata", en: "Assigned", fr: "Attribuée", es: "Asignada" },
    "equipment.badge.archived": { it: "Archiviata", en: "Archived", fr: "Archivée", es: "Archivada" },

    "equipment.field.brand": { it: "Marca", en: "Brand", fr: "Marque", es: "Marca" },
    "equipment.field.model": { it: "Modello", en: "Model", fr: "Modèle", es: "Modelo" },

    "equipment.assignedCustomer": { it: "Cliente assegnato", en: "Assigned customer", fr: "Client attribué", es: "Cliente asignado" },
    "equipment.assignmentContext": { it: "Contesto assegnazione", en: "Assignment context", fr: "Contexte d'affectation", es: "Contexto de asignación" },
    "equipment.checkSecurity": { it: "Controlla sicurezza", en: "Check security", fr: "Vérifier la sécurité", es: "Verificar seguridad" },
    "equipment.createPlantsCta": { it: "Apri stabilimenti", en: "Open plants", fr: "Ouvrir les sites", es: "Abrir plantas" },
    "equipment.createSubtitle": { it: "Crea una nuova macchina nel contesto attivo.", en: "Create a new machine in the active context.", fr: "Créez une nouvelle machine dans le contexte actif.", es: "Crea una nueva máquina en el contexto activo." },
    "equipment.created": { it: "Macchina creata", en: "Machine created", fr: "Machine créée", es: "Máquina creada" },
    "equipment.deleteConfirm": { it: "Vuoi davvero archiviare questa macchina?", en: "Do you really want to archive this machine?", fr: "Voulez-vous vraiment archiver cette machine ?", es: "¿De verdad quieres archivar esta máquina?" },
    "equipment.docsDesc": { it: "Manuali, schemi, dichiarazioni e allegati macchina.", en: "Manuals, diagrams, declarations and machine attachments.", fr: "Manuels, schémas, déclarations et pièces jointes machine.", es: "Manuales, esquemas, declaraciones y adjuntos de máquina." },
    "equipment.editMachine": { it: "Modifica macchina", en: "Edit machine", fr: "Modifier la machine", es: "Editar máquina" },
    "equipment.editSubtitle": { it: "Aggiorna dati tecnici e contesto organizzativo della macchina.", en: "Update technical data and organizational context of the machine.", fr: "Mettez à jour les données techniques et le contexte organisationnel de la machine.", es: "Actualiza los datos técnicos y el contexto organizativo de la máquina." },
    "equipment.forbidden": { it: "Questa pagina non è disponibile nel contesto attivo.", en: "This page is not available in the active context.", fr: "Cette page n'est pas disponible dans le contexte actif.", es: "Esta página no está disponible en el contexto activo." },
    "equipment.genericSaveError": { it: "Errore durante il salvataggio della macchina", en: "Error while saving the machine", fr: "Erreur lors de l'enregistrement de la machine", es: "Error al guardar la máquina" },
    "equipment.internalCode": { it: "Codice interno", en: "Internal code", fr: "Code interne", es: "Código interno" },
    "equipment.lifecycle.active": { it: "Attiva", en: "Active", fr: "Active", es: "Activa" },
    "equipment.lifecycle.commissioning": { it: "In commissioning", en: "Commissioning", fr: "En mise en service", es: "En puesta en marcha" },
    "equipment.lifecycle.decommissioned": { it: "Dismessa", en: "Decommissioned", fr: "Démantelée", es: "Dada de baja" },
    "equipment.lifecycle.inactive": { it: "Inattiva", en: "Inactive", fr: "Inactive", es: "Inactiva" },
    "equipment.lifecycle.maintenance": { it: "In manutenzione", en: "Maintenance", fr: "En maintenance", es: "En mantenimiento" },
    "equipment.loadError": { it: "Errore caricamento macchina", en: "Machine load error", fr: "Erreur de chargement de la machine", es: "Error al cargar la máquina" },
    "equipment.mainData": { it: "Dati principali", en: "Main data", fr: "Données principales", es: "Datos principales" },
    "equipment.manageList": { it: "Gestisci elenco", en: "Manage list", fr: "Gérer la liste", es: "Gestionar lista" },
    "equipment.machineContext": { it: "Contesto macchina", en: "Machine context", fr: "Contexte machine", es: "Contexto de máquina" },
    "equipment.moveToTrash": { it: "Archivia macchina", en: "Archive machine", fr: "Archiver la machine", es: "Archivar máquina" },
    "equipment.movedToTrash": { it: "Macchina archiviata", en: "Machine archived", fr: "Machine archivée", es: "Máquina archivada" },
    "equipment.name": { it: "Nome macchina *", en: "Machine name *", fr: "Nom de la machine *", es: "Nombre de la máquina *" },
    "equipment.noNotes": { it: "Nessuna nota disponibile.", en: "No notes available.", fr: "Aucune note disponible.", es: "No hay notas disponibles." },
    "equipment.noPlantsAvailable": { it: "Non risultano stabilimenti nel contesto attivo.", en: "No plants available in the active context.", fr: "Aucun site disponible dans le contexte actif.", es: "No hay plantas disponibles en el contexto activo." },
    "equipment.notes": { it: "Note", en: "Notes", fr: "Notes", es: "Notas" },
    "equipment.notesDesc": { it: "Informazioni operative e note interne sulla macchina.", en: "Operational information and internal notes about the machine.", fr: "Informations opérationnelles et notes internes sur la machine.", es: "Información operativa y notas internas sobre la máquina." },
    "equipment.notAssigned": { it: "Non assegnata", en: "Not assigned", fr: "Non attribuée", es: "Sin asignar" },
    "equipment.openDocuments": { it: "Apri documenti", en: "Open documents", fr: "Ouvrir documents", es: "Abrir documentos" },
    "equipment.openMaintenance": { it: "Apri manutenzione", en: "Open maintenance", fr: "Ouvrir maintenance", es: "Abrir mantenimiento" },
    "equipment.openTimeline": { it: "Apri timeline", en: "Open timeline", fr: "Ouvrir chronologie", es: "Abrir cronología" },
    "equipment.organizationContext": { it: "Contesto organizzativo", en: "Organizational context", fr: "Contexte organisationnel", es: "Contexto organizativo" },
    "equipment.owner": { it: "Organizzazione attiva", en: "Active organization", fr: "Organisation active", es: "Organización activa" },
    "equipment.ownerContext": { it: "Contesto proprietario", en: "Owner context", fr: "Contexte propriétaire", es: "Contexto propietario" },
    "equipment.photo": { it: "Foto macchina", en: "Machine photo", fr: "Photo de la machine", es: "Foto de la máquina" },
    "equipment.photoDesc": { it: "Immagine di copertina e documentazione fotografica.", en: "Cover image and photo documentation.", fr: "Image de couverture et documentation photographique.", es: "Imagen de portada y documentación fotográfica." },
    "equipment.placeholderName": { it: "Es. HMS 140", en: "E.g. HMS 140", fr: "Ex. HMS 140", es: "Ej. HMS 140" },
    "equipment.qrScanner": { it: "Scanner QR", en: "QR scanner", fr: "Scanner QR", es: "Escáner QR" },
    "equipment.quickActions": { it: "Azioni rapide", en: "Quick actions", fr: "Actions rapides", es: "Acciones rápidas" },
    "equipment.quickInfo": { it: "Informazioni rapide", en: "Quick info", fr: "Informations rapides", es: "Información rápida" },
    "equipment.requiredName": { it: "Il nome macchina è obbligatorio.", en: "Machine name is required.", fr: "Le nom de la machine est obligatoire.", es: "El nombre de la máquina es obligatorio." },
    "equipment.timeline": { it: "Timeline macchina", en: "Machine timeline", fr: "Chronologie machine", es: "Cronología de máquina" },
    "equipment.timelineDesc": { it: "Storico eventi, attività e aggiornamenti della macchina.", en: "History of events, activities and machine updates.", fr: "Historique des événements, activités et mises à jour de la machine.", es: "Histórico de eventos, actividades y actualizaciones de la máquina." },
    "equipment.updated": { it: "Macchina aggiornata", en: "Machine updated", fr: "Machine mise à jour", es: "Máquina actualizada" },

    // --- maintenance ---
    "maintenance.title": { it: "Manutenzione", en: "Maintenance", fr: "Maintenance", es: "Mantenimiento" },
    "maintenance.subtitle": { it: "Gestisci e monitora tutte le manutenzioni", en: "Manage and monitor all maintenance activities", fr: "Gérez et surveillez toutes les maintenances", es: "Gestiona y supervisa todos los mantenimientos" },
    "maintenance.newPlan": { it: "Nuovo Piano", en: "New Plan", fr: "Nouveau plan", es: "Nuevo plan" },
    "maintenance.tab.plans": { it: "Piani", en: "Plans", fr: "Plans", es: "Planes" },
    "maintenance.tab.workOrders": { it: "Ordini di Lavoro", en: "Work Orders", fr: "Ordres de travail", es: "Órdenes de trabajo" },
    "maintenance.searchPlaceholder": { it: "Cerca", en: "Search", fr: "Rechercher", es: "Buscar" },
    "maintenance.loading": { it: "Caricamento manutenzioni...", en: "Loading maintenance plans...", fr: "Chargement des plans de maintenance...", es: "Cargando planes de mantenimiento..." },
    "maintenance.noPlans": { it: "Nessun piano manutentivo trovato.", en: "No maintenance plan found.", fr: "Aucun plan de maintenance trouvé.", es: "No se encontró ningún plan de mantenimiento." },
    "maintenance.priority.high": { it: "Alta", en: "High", fr: "Haute", es: "Alta" },
    "maintenance.priority.medium": { it: "Media", en: "Medium", fr: "Moyenne", es: "Media" },
    "maintenance.priority.low": { it: "Bassa", en: "Low", fr: "Basse", es: "Baja" },
    "maintenance.planFallback": { it: "Piano manutenzione", en: "Maintenance plan", fr: "Plan de maintenance", es: "Plan de mantenimiento" },
    "maintenance.machineFallback": { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" },

    // --- workOrders ---
    "workOrders.title": { it: "Ordini di lavoro", en: "Work Orders", fr: "Ordres de travail", es: "Órdenes de trabajo" },
    "workOrders.subtitle": { it: "Pianifica, assegna e monitora le attività operative sulle macchine.", en: "Plan, assign and monitor operational activities on machines.", fr: "Planifiez, attribuez et surveillez les activités opérationnelles sur les machines.", es: "Planifica, asigna y supervisa las actividades operativas en las máquinas." },
    "workOrders.new": { it: "Nuovo Work Order", en: "New Work Order", fr: "Nouvel ordre de travail", es: "Nueva orden de trabajo" },
    "workOrders.kpi.total": { it: "Totali", en: "Total", fr: "Total", es: "Totales" },
    "workOrders.kpi.open": { it: "Aperti", en: "Open", fr: "Ouverts", es: "Abiertas" },
    "workOrders.kpi.highPriority": { it: "Alta Priorità", en: "High Priority", fr: "Haute priorité", es: "Alta prioridad" },
    "workOrders.searchPlaceholder": { it: "Cerca work order", en: "Search work order", fr: "Rechercher un ordre de travail", es: "Buscar orden de trabajo" },
    "workOrders.listTitle": { it: "Elenco Work Orders", en: "Work Order List", fr: "Liste des ordres de travail", es: "Lista de órdenes de trabajo" },
    "workOrders.loading": { it: "Caricamento work orders...", en: "Loading work orders...", fr: "Chargement des ordres de travail...", es: "Cargando órdenes de trabajo..." },
    "workOrders.noResults": { it: "Nessun work order trovato.", en: "No work order found.", fr: "Aucun ordre de travail trouvé.", es: "No se encontró ninguna orden de trabajo." },
    "workOrders.priority.high": { it: "Alta", en: "High", fr: "Haute", es: "Alta" },
    "workOrders.priority.medium": { it: "Media", en: "Medium", fr: "Moyenne", es: "Media" },
    "workOrders.priority.low": { it: "Bassa", en: "Low", fr: "Basse", es: "Baja" },
    "workOrders.status.open": { it: "Aperto", en: "Open", fr: "Ouvert", es: "Abierta" },
    "workOrders.status.inProgress": { it: "In corso", en: "In progress", fr: "En cours", es: "En curso" },
    "workOrders.status.closed": { it: "Chiuso", en: "Closed", fr: "Fermé", es: "Cerrada" },
    "workOrders.fallbackTitle": { it: "Work Order", en: "Work Order", fr: "Ordre de travail", es: "Orden de trabajo" },
    "workOrders.machineFallback": { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" },
    "workOrders.search": { it: "Cerca ordine...", en: "Search order...", fr: "Rechercher un ordre...", es: "Buscar orden..." },
    "workOrders.filterStatus": { it: "Filtra per stato", en: "Filter by status", fr: "Filtrer par statut", es: "Filtrar por estado" },
    "workOrders.filterPriority": { it: "Filtra per priorità", en: "Filter by priority", fr: "Filtrer par priorité", es: "Filtrar por prioridad" },
    "workOrders.detail": { it: "Dettaglio ordine", en: "Order detail", fr: "Détail de l'ordre", es: "Detalle de la orden" },
    "workOrders.createTitle": { it: "Nuovo ordine di lavoro", en: "New work order", fr: "Nouvel ordre de travail", es: "Nueva orden de trabajo" },
    "workOrders.equipmentLabel": { it: "Macchina *", en: "Machine *", fr: "Machine *", es: "Máquina *" },
    "workOrders.plantLabel": { it: "Stabilimento *", en: "Plant *", fr: "Site *", es: "Planta *" },
    "workOrders.titleLabel": { it: "Titolo *", en: "Title *", fr: "Titre *", es: "Título *" },
    "workOrders.descriptionLabel": { it: "Descrizione", en: "Description", fr: "Description", es: "Descripción" },
    "workOrders.priorityLabel": { it: "Priorità", en: "Priority", fr: "Priorité", es: "Prioridad" },
    "workOrders.typeLabel": { it: "Tipo *", en: "Type *", fr: "Type *", es: "Tipo *" },
    "workOrders.scheduledStart": { it: "Inizio previsto", en: "Scheduled start", fr: "Début prévu", es: "Inicio previsto" },
    "workOrders.scheduledEnd": { it: "Fine prevista", en: "Scheduled end", fr: "Fin prévue", es: "Fin previsto" },
    "workOrders.creating": { it: "Creazione...", en: "Creating...", fr: "Création...", es: "Creando..." },
    "workOrders.created": { it: "Ordine di lavoro creato", en: "Work order created", fr: "Ordre de travail créé", es: "Orden de trabajo creada" },
    "workOrders.updated": { it: "Ordine aggiornato", en: "Order updated", fr: "Ordre mis à jour", es: "Orden actualizada" },
    "workOrders.statusOpen": { it: "Aperto", en: "Open", fr: "Ouvert", es: "Abierta" },
    "workOrders.statusInProgress": { it: "In corso", en: "In Progress", fr: "En cours", es: "En curso" },
    "workOrders.statusCompleted": { it: "Completato", en: "Completed", fr: "Terminé", es: "Completada" },
    "workOrders.statusClosed": { it: "Chiuso", en: "Closed", fr: "Fermé", es: "Cerrada" },
    "workOrders.priorityLow": { it: "Bassa", en: "Low", fr: "Basse", es: "Baja" },
    "workOrders.priorityMedium": { it: "Media", en: "Medium", fr: "Moyenne", es: "Media" },
    "workOrders.priorityHigh": { it: "Alta", en: "High", fr: "Haute", es: "Alta" },
    "workOrders.priorityCritical": { it: "Critica", en: "Critical", fr: "Critique", es: "Crítica" },
    "workOrders.typePreventive": { it: "Preventiva", en: "Preventive", fr: "Préventive", es: "Preventiva" },
    "workOrders.typeCorrective": { it: "Correttiva", en: "Corrective", fr: "Corrective", es: "Correctiva" },
    "workOrders.typePredictive": { it: "Predittiva", en: "Predictive", fr: "Prédictive", es: "Predictiva" },
    "workOrders.typeInspection": { it: "Ispezione", en: "Inspection", fr: "Inspection", es: "Inspección" },
    "workOrders.assignedTo": { it: "Assegna a", en: "Assign to", fr: "Attribuer à", es: "Asignar a" },
    "workOrders.createdAt": { it: "Creato il", en: "Created on", fr: "Créé le", es: "Creado el" },
    "workOrders.createDesc": { it: "Il work order appartiene sempre all'organizzazione attiva.", en: "The work order always belongs to the active organization.", fr: "L'ordre de travail appartient toujours à l'organisation active.", es: "La orden de trabajo siempre pertenece a la organización activa." },
    "workOrders.createLoading": { it: "Stiamo preparando il contesto operativo...", en: "Preparing the operational context...", fr: "Préparation du contexte opérationnel...", es: "Preparando el contexto operativo..." },
    "workOrders.descriptionPlaceholder": { it: "Descrizione intervento, sintomi, note operative...", en: "Intervention description, symptoms, operational notes...", fr: "Description de l'intervention, symptômes, notes opérationnelles...", es: "Descripción de la intervención, síntomas, notas operativas..." },
    "workOrders.dueDate": { it: "Scadenza", en: "Due date", fr: "Échéance", es: "Vencimiento" },
    "workOrders.errorCreate": { it: "Errore creazione work order", en: "Error creating work order", fr: "Erreur de création de l'ordre de travail", es: "Error al crear la orden de trabajo" },
    "workOrders.errorInvalidMachine": { it: "Macchina selezionata non valida.", en: "Selected machine is invalid.", fr: "Machine sélectionnée non valide.", es: "Máquina seleccionada no válida." },
    "workOrders.errorLoadPage": { it: "Errore caricamento pagina", en: "Page load error", fr: "Erreur de chargement de la page", es: "Error al cargar la página" },
    "workOrders.errorNoPlant": { it: "La macchina selezionata non ha uno stabilimento associato.", en: "The selected machine has no associated plant.", fr: "La machine sélectionnée n'a pas de site associé.", es: "La máquina seleccionada no tiene una planta asociada." },
    "workOrders.errorSelectMachine": { it: "Seleziona una macchina.", en: "Select a machine.", fr: "Sélectionnez une machine.", es: "Selecciona una máquina." },
    "workOrders.errorTitleRequired": { it: "Inserisci il titolo.", en: "Enter the title.", fr: "Saisissez le titre.", es: "Ingresa el título." },
    "workOrders.errorUpdate": { it: "Errore aggiornamento work order", en: "Error updating work order", fr: "Erreur de mise à jour de l'ordre de travail", es: "Error al actualizar la orden de trabajo" },
    "workOrders.machineId": { it: "ID macchina", en: "Machine ID", fr: "ID machine", es: "ID de máquina" },
    "workOrders.noDescription": { it: "Nessuna descrizione disponibile.", en: "No description available.", fr: "Aucune description disponible.", es: "No hay descripción disponible." },
    "workOrders.onlyAdminCreate": { it: "Non hai i permessi per creare work order.", en: "You don't have permission to create work orders.", fr: "Vous n'avez pas la permission de créer des ordres de travail.", es: "No tienes permiso para crear órdenes de trabajo." },
    "workOrders.overdue": { it: "Scaduti", en: "Overdue", fr: "En retard", es: "Vencidos" },
    "workOrders.permissionDenied": { it: "Permesso negato", en: "Permission denied", fr: "Permission refusée", es: "Permiso denegado" },
    "workOrders.redirectDesc": { it: "Ti stiamo portando al nuovo flusso work order.", en: "Redirecting you to the new work order flow.", fr: "Redirection vers le nouveau flux d'ordre de travail.", es: "Redirigiendo al nuevo flujo de orden de trabajo." },
    "workOrders.saveWorkOrder": { it: "Salva work order", en: "Save work order", fr: "Enregistrer l'ordre", es: "Guardar orden" },
    "workOrders.selectMachine": { it: "Seleziona macchina", en: "Select machine", fr: "Sélectionner machine", es: "Seleccionar máquina" },
    "workOrders.statusCancelled": { it: "Annullato", en: "Cancelled", fr: "Annulé", es: "Cancelado" },
    "workOrders.statusDraft": { it: "Bozza", en: "Draft", fr: "Brouillon", es: "Borrador" },
    "workOrders.statusLabel": { it: "Stato", en: "Status", fr: "Statut", es: "Estado" },
    "workOrders.statusPendingReview": { it: "In revisione", en: "Pending review", fr: "En révision", es: "En revisión" },
    "workOrders.statusScheduled": { it: "Pianificato", en: "Scheduled", fr: "Planifié", es: "Planificado" },
    "workOrders.titlePlaceholder": { it: "es. Sostituzione cuscinetto lato motore", en: "e.g. Motor-side bearing replacement", fr: "ex. Remplacement du roulement côté moteur", es: "ej. Sustitución del rodamiento lado motor" },
    "workOrders.typeEmergency": { it: "Emergenza", en: "Emergency", fr: "Urgence", es: "Emergencia" },
    "workOrders.unassigned": { it: "Non assegnato", en: "Unassigned", fr: "Non attribué", es: "Sin asignar" },
    "workOrders.updatedAt": { it: "Aggiornato il", en: "Updated on", fr: "Mis à jour le", es: "Actualizado el" },

    // --- checklists ---
    "checklists.title": { it: "Checklist", en: "Checklists", fr: "Check-lists", es: "Checklists" },
    "checklists.subtitle": { it: "Gestisci template checklist per controlli, verifiche e procedure operative.", en: "Manage checklist templates for inspections, checks and operational procedures.", fr: "Gérez les modèles de check-lists pour contrôles, vérifications et procédures opérationnelles.", es: "Gestiona plantillas de checklist para controles, verificaciones y procedimientos operativos." },
    "checklists.newTemplate": { it: "Nuovo Template", en: "New Template", fr: "Nouveau modèle", es: "Nueva plantilla" },
    "checklists.addChecklist": { it: "Aggiungi checklist", en: "Add checklist", fr: "Ajouter une checklist", es: "Añadir checklist" },
    "checklists.noChecklists": { it: "Nessuna checklist trovata", en: "No checklists found", fr: "Aucune checklist trouvée", es: "No se encontraron checklists" },
    "checklists.noChecklistsDesc": { it: "Crea il primo template checklist per controlli, verifiche e procedure operative.", en: "Create your first checklist template for inspections, checks, and operating procedures.", fr: "Créez votre premier modèle de checklist pour les contrôles, vérifications et procédures opérationnelles.", es: "Crea tu primera plantilla de checklist para controles, verificaciones y procedimientos operativos." },
    "checklists.addFirst": { it: "Crea la prima checklist", en: "Create first checklist", fr: "Créer la première checklist", es: "Crear la primera checklist" },
    "checklists.kpi.templates": { it: "Template", en: "Templates", fr: "Modèles", es: "Plantillas" },
    "checklists.kpi.totalItems": { it: "Voci Totali", en: "Total Items", fr: "Éléments totaux", es: "Elementos totales" },
    "checklists.kpi.safetyChecklists": { it: "Checklist Safety", en: "Safety Checklists", fr: "Check-lists sécurité", es: "Checklists de seguridad" },
    "checklists.searchPlaceholder": { it: "Cerca template checklist", en: "Search checklist template", fr: "Rechercher un modèle de check-list", es: "Buscar plantilla de checklist" },
    "checklists.listTitle": { it: "Elenco Template", en: "Template List", fr: "Liste des modèles", es: "Lista de plantillas" },
    "checklists.loading": { it: "Caricamento template checklist...", en: "Loading checklist templates...", fr: "Chargement des modèles de check-list...", es: "Cargando plantillas de checklist..." },
    "checklists.noResults": { it: "Nessun template checklist trovato.", en: "No checklist template found.", fr: "Aucun modèle de check-list trouvé.", es: "No se encontró ninguna plantilla de checklist." },
    "checklists.category.safety": { it: "Safety", en: "Safety", fr: "Sécurité", es: "Seguridad" },
    "checklists.category.quality": { it: "Quality", en: "Quality", fr: "Qualité", es: "Calidad" },
    "checklists.category.operational": { it: "Operativa", en: "Operational", fr: "Opérationnelle", es: "Operativa" },
    "checklists.fallbackTitle": { it: "Template checklist", en: "Checklist template", fr: "Modèle de check-list", es: "Plantilla de checklist" },
    "checklists.itemsLabel": { it: "voci", en: "items", fr: "éléments", es: "elementos" },

    // --- documents ---
    "documents.title": { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" },
    "documents.subtitle": { it: "Hub documentale coerente con il modello organizzativo attivo.", en: "Document hub aligned with the active organization model.", fr: "Hub documentaire cohérent avec le modèle organisationnel actif.", es: "Hub documental coherente con el modelo organizativo activo." },
    "documents.card.total.title": { it: "Documenti totali", en: "Total documents", fr: "Documents totaux", es: "Documentos totales" },
    "documents.card.total.description": { it: "Archivio documentale visibile nel contesto organizzativo attivo.", en: "Document archive visible in the active organizational context.", fr: "Archive documentaire visible dans le contexte organisationnel actif.", es: "Archivo documental visible en el contexto organizativo activo." },
    "documents.card.manufacturer.title": { it: "Documenti costruttore", en: "Manufacturer documents", fr: "Documents constructeur", es: "Documentos del fabricante" },
    "documents.card.manufacturer.description": { it: "Manuali, CE, schemi e documentazione originaria.", en: "Manuals, CE files, diagrams and original documentation.", fr: "Manuels, CE, schémas et documentation d'origine.", es: "Manuales, CE, esquemas y documentación original." },
    "documents.card.customer.title": { it: "Documenti operativi cliente", en: "Customer operational documents", fr: "Documents opérationnels client", es: "Documentos operativos del cliente" },
    "documents.card.customer.description": { it: "Procedure interne, report e documenti locali di stabilimento.", en: "Internal procedures, reports and local plant documents.", fr: "Procédures internes, rapports et documents locaux du site.", es: "Procedimientos internos, informes y documentos locales de planta." },
    "documents.link.machineDocs.title": { it: "Apri documenti macchina", en: "Open machine documents", fr: "Ouvrir les documents machine", es: "Abrir documentos de máquina" },
    "documents.link.machineDocs.description": { it: "Accedi ai documenti direttamente dal dettaglio macchina.", en: "Access documents directly from the machine detail page.", fr: "Accédez aux documents directement depuis la fiche machine.", es: "Accede a los documentos directamente desde el detalle de la máquina." },
    "documents.link.compliance.title": { it: "Vai alla compliance", en: "Go to compliance", fr: "Aller à la conformité", es: "Ir a compliance" },
    "documents.link.compliance.description": { it: "Controlli, conformità e documentazione collegata al contesto attivo.", en: "Checks, compliance and documentation linked to the active context.", fr: "Contrôles, conformité et documentation liée au contexte actif.", es: "Controles, cumplimiento y documentación vinculada al contexto activo." },
    "documents.new": { it: "Nuovo documento", en: "New document", fr: "Nouveau document", es: "Nuevo documento" },
    "documents.loading": { it: "Caricamento documenti...", en: "Loading documents...", fr: "Chargement des documents...", es: "Cargando documentos..." },
    "documents.noResults": { it: "Nessun documento trovato.", en: "No documents found.", fr: "Aucun document trouvé.", es: "No se encontraron documentos." },
    "documents.search": { it: "Cerca documento...", en: "Search document...", fr: "Rechercher un document...", es: "Buscar documento..." },
    "documents.upload": { it: "Carica documento", en: "Upload document", fr: "Téléverser document", es: "Subir documento" },
    "documents.download": { it: "Scarica", en: "Download", fr: "Télécharger", es: "Descargar" },
    "documents.detail": { it: "Dettaglio documento", en: "Document detail", fr: "Détail du document", es: "Detalle del documento" },
    "documents.category": { it: "Categoria", en: "Category", fr: "Catégorie", es: "Categoría" },
    "documents.tags": { it: "Tag", en: "Tags", fr: "Tags", es: "Etiquetas" },
    "documents.uploadedBy": { it: "Caricato da", en: "Uploaded by", fr: "Téléversé par", es: "Subido por" },
    "documents.uploadedAt": { it: "Data caricamento", en: "Upload date", fr: "Date de téléversement", es: "Fecha de carga" },
    "documents.version": { it: "Versione", en: "Version", fr: "Version", es: "Versión" },
    "documents.versions": { it: "Storico versioni", en: "Version history", fr: "Historique des versions", es: "Histórico de versiones" },
    "documents.total": { it: "Documenti totali", en: "Total documents", fr: "Documents totaux", es: "Documentos totales" },
    "documents.categories": { it: "Categorie", en: "Categories", fr: "Catégories", es: "Categorías" },
    "documents.withMachine": { it: "Con macchina", en: "With machine", fr: "Avec machine", es: "Con máquina" },
    "documents.manufacturerView": { it: "Vista costruttore", en: "Manufacturer view", fr: "Vue constructeur", es: "Vista fabricante" },
    "documents.customerView": { it: "Vista cliente", en: "Customer view", fr: "Vue client", es: "Vista cliente" },

    // --- plants ---
    "plants.title": { it: "Stabilimenti", en: "Plants", fr: "Sites", es: "Plantas" },
    "plants.subtitle": { it: "Gestisci stabilimenti e linee produttive del contesto attivo.", en: "Manage plants and production lines in the active context.", fr: "Gérez les sites et lignes de production du contexte actif.", es: "Gestiona plantas y líneas de producción del contexto activo." },
    "plants.newPlant": { it: "Nuovo Stabilimento", en: "New Plant", fr: "Nouveau site", es: "Nueva planta" },
    "plants.newLine": { it: "Nuova Linea", en: "New Line", fr: "Nouvelle ligne", es: "Nueva línea" },
    "plants.kpi.activePlants": { it: "Stabilimenti Attivi", en: "Active Plants", fr: "Sites actifs", es: "Plantas activas" },
    "plants.kpi.activeLines": { it: "Linee Attive", en: "Active Lines", fr: "Lignes actives", es: "Líneas activas" },
    "plants.form.code": { it: "Codice", en: "Code", fr: "Code", es: "Código" },
    "plants.form.plant.title": { it: "Nuovo Stabilimento", en: "New Plant", fr: "Nouveau site", es: "Nueva planta" },
    "plants.form.plant.subtitle": { it: "Crea uno stabilimento nel contesto attivo.", en: "Create a plant in the active context.", fr: "Créez un site dans le contexte actif.", es: "Crea una planta en el contexto activo." },
    "plants.form.plant.name": { it: "Nome stabilimento", en: "Plant name", fr: "Nom du site", es: "Nombre de la planta" },
    "plants.form.plant.namePlaceholder": { it: "Es. Plant Test 01", en: "E.g. Plant Test 01", fr: "Ex. Plant Test 01", es: "Ej. Plant Test 01" },
    "plants.form.plant.codePlaceholder": { it: "Es. PLT-01", en: "E.g. PLT-01", fr: "Ex. PLT-01", es: "Ej. PLT-01" },
    "plants.form.line.title": { it: "Nuova Linea", en: "New Line", fr: "Nouvelle ligne", es: "Nueva línea" },
    "plants.form.line.subtitle": { it: "Crea una linea produttiva collegata a uno stabilimento.", en: "Create a production line linked to a plant.", fr: "Créez une ligne de production liée à un site.", es: "Crea una línea de producción vinculada a una planta." },
    "plants.form.line.plant": { it: "Stabilimento", en: "Plant", fr: "Site", es: "Planta" },
    "plants.form.line.selectPlant": { it: "Seleziona", en: "Select", fr: "Sélectionner", es: "Seleccionar" },
    "plants.form.line.name": { it: "Nome linea", en: "Line name", fr: "Nom de la ligne", es: "Nombre de la línea" },
    "plants.form.line.namePlaceholder": { it: "Es. Linea Test 01", en: "E.g. Test Line 01", fr: "Ex. Ligne Test 01", es: "Ej. Línea Test 01" },
    "plants.form.line.codePlaceholder": { it: "Es. LN-01", en: "E.g. LN-01", fr: "Ex. LN-01", es: "Ej. LN-01" },
    "plants.saving": { it: "Salvataggio...", en: "Saving...", fr: "Enregistrement...", es: "Guardando..." },
    "plants.savePlant": { it: "Salva Stabilimento", en: "Save Plant", fr: "Enregistrer le site", es: "Guardar planta" },
    "plants.saveLine": { it: "Salva Linea", en: "Save Line", fr: "Enregistrer la ligne", es: "Guardar línea" },
    "plants.listTitle": { it: "Elenco Stabilimenti", en: "Plant List", fr: "Liste des sites", es: "Lista de plantas" },
    "plants.loading": { it: "Caricamento stabilimenti...", en: "Loading plants...", fr: "Chargement des sites...", es: "Cargando plantas..." },
    "plants.noResults": { it: "Nessuno stabilimento presente.", en: "No plants available.", fr: "Aucun site disponible.", es: "No hay plantas disponibles." },
    "plants.linkedLines": { it: "Linee collegate", en: "Linked lines", fr: "Lignes liées", es: "Líneas vinculadas" },
    "plants.noLinkedLines": { it: "Nessuna linea collegata", en: "No linked lines", fr: "Aucune ligne liée", es: "Ninguna línea vinculada" },
    "plants.fallbackPlant": { it: "Stabilimento", en: "Plant", fr: "Site", es: "Planta" },
    "plants.fallbackLine": { it: "Linea", en: "Line", fr: "Ligne", es: "Línea" },
    "plants.new": { it: "Nuovo stabilimento", en: "New plant", fr: "Nouvel établissement", es: "Nuevo establecimiento" },
    "plants.search": { it: "Cerca stabilimento...", en: "Search plant...", fr: "Rechercher un établissement...", es: "Buscar planta..." },
    "plants.nameLabel": { it: "Nome stabilimento *", en: "Plant name *", fr: "Nom du site *", es: "Nombre de la planta *" },
    "plants.addressLabel": { it: "Indirizzo", en: "Address", fr: "Adresse", es: "Dirección" },
    "plants.cityLabel": { it: "Città", en: "City", fr: "Ville", es: "Ciudad" },
    "plants.countryLabel": { it: "Paese", en: "Country", fr: "Pays", es: "País" },
    "plants.creating": { it: "Creazione...", en: "Creating...", fr: "Création...", es: "Creando..." },
    "plants.created": { it: "Stabilimento creato", en: "Plant created", fr: "Site créé", es: "Planta creada" },
    "plants.updated": { it: "Stabilimento aggiornato", en: "Plant updated", fr: "Site mis à jour", es: "Planta actualizada" },
    "plants.deleted": { it: "Stabilimento eliminato", en: "Plant deleted", fr: "Site supprimé", es: "Planta eliminada" },
    "plants.detail": { it: "Dettaglio stabilimento", en: "Plant detail", fr: "Détail du site", es: "Detalle de la planta" },
    "plants.edit": { it: "Modifica stabilimento", en: "Edit plant", fr: "Modifier le site", es: "Editar planta" },
    "plants.machines": { it: "Macchine nello stabilimento", en: "Machines in plant", fr: "Machines dans le site", es: "Máquinas en la planta" },
    "plants.noMachines": { it: "Nessuna macchina in questo stabilimento.", en: "No machines in this plant.", fr: "Aucune machine dans ce site.", es: "No hay máquinas en esta planta." },
    "plants.customerOnly": { it: "Questa sezione è disponibile solo nel contesto cliente.", en: "This section is available only in customer context.", fr: "Cette section est disponible uniquement dans le contexte client.", es: "Esta sección solo está disponible en el contexto cliente." },
    "plants.emptyTitle": { it: "Nessuno stabilimento trovato", en: "No plants found", fr: "Aucun site trouvé", es: "No se encontraron plantas" },
    "plants.emptyDesc": { it: "Crea il primo stabilimento per organizzare macchine e linee produttive.", en: "Create the first plant to organize machines and production lines.", fr: "Créez le premier site pour organiser les machines et lignes de production.", es: "Crea la primera planta para organizar máquinas y líneas de producción." },
    "plants.lines": { it: "Linee", en: "Lines", fr: "Lignes", es: "Líneas" },
    "plants.line": { it: "Linea", en: "Line", fr: "Ligne", es: "Línea" },
    "plants.machinesPlaced": { it: "Macchine posizionate", en: "Placed machines", fr: "Machines positionnées", es: "Máquinas colocadas" },
    "plants.plantsWithMachines": { it: "Stabilimenti con macchine", en: "Plants with machines", fr: "Sites avec machines", es: "Plantas con máquinas" },

    // --- customers ---
    "customers.title": { it: "Clienti", en: "Customers", fr: "Clients", es: "Clientes" },
    "customers.subtitle": { it: "Elenco organizzazioni cliente collegate al costruttore attivo.", en: "List of customer organizations linked to the active manufacturer.", fr: "Liste des organisations clientes liées au constructeur actif.", es: "Lista de organizaciones cliente vinculadas al fabricante activo." },
    "customers.new": { it: "Nuovo Cliente", en: "New Customer", fr: "Nouveau Client", es: "Nuevo Cliente" },
    "customers.kpi.total": { it: "Clienti Totali", en: "Total Customers", fr: "Clients Totaux", es: "Clientes Totales" },
    "customers.kpi.activeOrganizations": { it: "Organizzazioni Attive", en: "Active Organizations", fr: "Organisations Actives", es: "Organizaciones Activas" },
    "customers.listTitle": { it: "Elenco Clienti", en: "Customer List", fr: "Liste des Clients", es: "Lista de Clientes" },
    "customers.loading": { it: "Caricamento clienti...", en: "Loading customers...", fr: "Chargement des clients...", es: "Cargando clientes..." },
    "customers.noResults": { it: "Nessun cliente collegato.", en: "No linked customer.", fr: "Aucun client lié.", es: "No hay clientes vinculados." },
    "customers.fallbackTitle": { it: "Cliente", en: "Customer", fr: "Client", es: "Cliente" },
    "customers.customerOrganization": { it: "Organizzazione cliente", en: "Customer organization", fr: "Organisation cliente", es: "Organización cliente" },
    "customers.search": { it: "Cerca cliente, città, email...", en: "Search customer, city, email...", fr: "Rechercher client, ville, email...", es: "Buscar cliente, ciudad, email..." },
    "customers.kpi.activePlans": { it: "Piani attivi", en: "Active plans", fr: "Plans actifs", es: "Planes activos" },
    "customers.kpi.withEmail": { it: "Con email", en: "With email", fr: "Avec email", es: "Con email" },
    "customers.kpi.withPhone": { it: "Con telefono", en: "With phone", fr: "Avec téléphone", es: "Con teléfono" },
    "customers.notFoundEmpty": { it: "Nessun cliente trovato", en: "No customers found", fr: "Aucun client trouvé", es: "No se encontraron clientes" },
    "customers.notFoundDesc": { it: "Non ci sono clienti oppure nessun elemento corrisponde alla ricerca.", en: "No customers or no results match your search.", fr: "Aucun client ou aucun résultat ne correspond à votre recherche.", es: "No hay clientes o ningún resultado coincide con su búsqueda." },
    "customers.createCustomer": { it: "Crea cliente", en: "Create customer", fr: "Créer client", es: "Crear cliente" },
    "customers.manufacturerOnly": { it: "Il registro clienti è disponibile nel contesto costruttore.", en: "Customer registry is available in manufacturer context.", fr: "Le registre clients est disponible dans le contexte constructeur.", es: "El registro de clientes está disponible en el contexto de fabricante." },
    "customers.newTitle": { it: "Nuovo cliente", en: "New customer", fr: "Nouveau client", es: "Nuevo cliente" },
    "customers.newSubtitle": { it: "Crea una nuova organizzazione cliente collegata al costruttore attivo.", en: "Create a new customer organization linked to the active manufacturer.", fr: "Créer une nouvelle organisation cliente liée au constructeur actif.", es: "Crear una nueva organización cliente vinculada al fabricante activo." },
    "customers.registry": { it: "Anagrafica cliente", en: "Customer details", fr: "Fiche client", es: "Datos del cliente" },
    "customers.nameLabel": { it: "Nome cliente *", en: "Customer name *", fr: "Nom client *", es: "Nombre del cliente *" },
    "customers.namePlaceholder": { it: "Es. Rimeco Srl", en: "E.g. Rimeco Srl", fr: "Ex. Rimeco Srl", es: "Ej. Rimeco Srl" },
    "customers.cityLabel": { it: "Città", en: "City", fr: "Ville", es: "Ciudad" },
    "customers.cityPlaceholder": { it: "Es. Milano", en: "E.g. Milan", fr: "Ex. Milan", es: "Ej. Milán" },
    "customers.countryLabel": { it: "Paese", en: "Country", fr: "Pays", es: "País" },
    "customers.companyEmail": { it: "Email azienda", en: "Company email", fr: "Email entreprise", es: "Email de empresa" },
    "customers.phoneLabel": { it: "Telefono", en: "Phone", fr: "Téléphone", es: "Teléfono" },
    "customers.primaryUser": { it: "Utente principale cliente", en: "Customer primary user", fr: "Utilisateur principal client", es: "Usuario principal del cliente" },
    "customers.createPrimaryUserNow": { it: "Crea utente principale subito", en: "Create primary user now", fr: "Créer utilisateur principal maintenant", es: "Crear usuario principal ahora" },
    "customers.createPrimaryUserDesc": { it: "Se attivo, viene creato anche il primo utente del cliente.", en: "If enabled, the first user for this customer will also be created.", fr: "Si activé, le premier utilisateur du client sera également créé.", es: "Si está activado, también se creará el primer usuario del cliente." },
    "customers.fullName": { it: "Nome completo *", en: "Full name *", fr: "Nom complet *", es: "Nombre completo *" },
    "customers.initialPassword": { it: "Password *", en: "Password *", fr: "Mot de passe *", es: "Contraseña *" },
    "customers.initialRole": { it: "Ruolo iniziale", en: "Initial role", fr: "Rôle initial", es: "Rol inicial" },
    "customers.primaryUserOrgNote": { it: "L'utente creato avrà come organizzazione di default il nuovo cliente.", en: "The created user will have this new customer as their default organization.", fr: "L'utilisateur créé aura ce nouveau client comme organisation par défaut.", es: "El usuario creado tendrá este nuevo cliente como organización predeterminada." },
    "customers.finalCheck": { it: "Controllo finale", en: "Final check", fr: "Vérification finale", es: "Verificación final" },
    "customers.activeManufacturer": { it: "Costruttore attivo", en: "Active manufacturer", fr: "Constructeur actif", es: "Fabricante activo" },
    "customers.activeOrgType": { it: "Tipo organizzazione attiva", en: "Active organization type", fr: "Type d'organisation active", es: "Tipo de organización activa" },
    "customers.activeRole": { it: "Ruolo attivo", en: "Active role", fr: "Rôle actif", es: "Rol activo" },
    "customers.creating": { it: "Creazione...", en: "Creating...", fr: "Création...", es: "Creando..." },
    "customers.ownerAdminOnly": { it: "Questa pagina è disponibile solo per admin/supervisor lato costruttore.", en: "This page is available only for admin/supervisor in manufacturer context.", fr: "Cette page est disponible uniquement pour admin/supervisor côté constructeur.", es: "Esta página solo está disponible para admin/supervisor en contexto fabricante." },
    "customers.errorNameRequired": { it: "Inserisci il nome del cliente.", en: "Please enter the customer name.", fr: "Veuillez saisir le nom du client.", es: "Ingrese el nombre del cliente." },
    "customers.errorPrimaryUserRequired": { it: "Compila i dati dell'utente principale.", en: "Please fill in primary user details.", fr: "Veuillez remplir les données de l'utilisateur principal.", es: "Complete los datos del usuario principal." },
    "customers.created": { it: "Cliente creato", en: "Customer created", fr: "Client créé", es: "Cliente creado" },
    "customers.errorCreate": { it: "Errore creazione cliente", en: "Error creating customer", fr: "Erreur création client", es: "Error al crear cliente" },
    "customers.detailTitle": { it: "Dettaglio cliente", en: "Customer detail", fr: "Détail client", es: "Detalle del cliente" },
    "customers.editTitle": { it: "Modifica cliente", en: "Edit customer", fr: "Modifier le client", es: "Editar cliente" },
    "customers.deleteConfirm": { it: "Sei sicuro di voler eliminare questo cliente?", en: "Are you sure you want to delete this customer?", fr: "Êtes-vous sûr de vouloir supprimer ce client ?", es: "¿Está seguro de eliminar este cliente?" },
    "customers.deleted": { it: "Cliente eliminato", en: "Customer deleted", fr: "Client supprimé", es: "Cliente eliminado" },
    "customers.updated": { it: "Cliente aggiornato", en: "Customer updated", fr: "Client mis à jour", es: "Cliente actualizado" },
    "customers.machines": { it: "Macchine assegnate", en: "Assigned machines", fr: "Machines attribuées", es: "Máquinas asignadas" },
    "customers.noMachines": { it: "Nessuna macchina assegnata a questo cliente.", en: "No machines assigned to this customer.", fr: "Aucune machine attribuée à ce client.", es: "No hay máquinas asignadas a este cliente." },
    "customers.assignMachine": { it: "Assegna macchina", en: "Assign machine", fr: "Attribuer machine", es: "Asignar máquina" },
    "customers.removeMachine": { it: "Rimuovi assegnazione", en: "Remove assignment", fr: "Supprimer l'attribution", es: "Eliminar asignación" },

    // --- assignments ---
    "assignments.title": { it: "Assegnazioni", en: "Assignments", fr: "Affectations", es: "Asignaciones" },
    "assignments.subtitle": { it: "Collegamenti attivi tra macchine prodotte e clienti finali.", en: "Active links between produced machines and end customers.", fr: "Liens actifs entre les machines produites et les clients finaux.", es: "Vínculos activos entre máquinas producidas y clientes finales." },
    "assignments.kpi.active": { it: "Assegnazioni Attive", en: "Active Assignments", fr: "Affectations Actives", es: "Asignaciones Activas" },
    "assignments.listTitle": { it: "Elenco Assegnazioni", en: "Assignment List", fr: "Liste des Affectations", es: "Lista de Asignaciones" },
    "assignments.loading": { it: "Caricamento assegnazioni...", en: "Loading assignments...", fr: "Chargement des affectations...", es: "Cargando asignaciones..." },
    "assignments.noResults": { it: "Nessuna assegnazione attiva.", en: "No active assignment.", fr: "Aucune affectation active.", es: "No hay asignaciones activas." },
    "assignments.machineFallback": { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" },
    "assignments.customerFallback": { it: "Cliente", en: "Customer", fr: "Client", es: "Cliente" },
    "assignments.assignedMachine": { it: "Macchina assegnata", en: "Assigned machine", fr: "Machine attribuée", es: "Máquina asignada" },
    "assignments.destinationCustomer": { it: "Cliente destinatario", en: "Destination customer", fr: "Client destinataire", es: "Cliente destinatario" },

    // --- analytics ---
    "analytics.title": { it: "Analytics", en: "Analytics", fr: "Analyses", es: "Análisis" },
    "analytics.subtitle": { it: "Punto unico per consultare i dati operativi del contesto attivo.", en: "Single place to review operational data for the active context.", fr: "Point unique pour consulter les données opérationnelles du contexte actif.", es: "Punto único para consultar los datos operativos del contexto activo." },
    "analytics.item.checklists.title": { it: "Storico checklist", en: "Checklist history", fr: "Historique des check-lists", es: "Historial de checklists" },
    "analytics.item.checklists.description": { it: "Analizza le esecuzioni checklist nel contesto organizzativo attivo.", en: "Analyze checklist executions in the active organizational context.", fr: "Analysez les exécutions de check-lists dans le contexte organisationnel actif.", es: "Analiza las ejecuciones de checklist en el contexto organizativo activo." },
    "analytics.item.workOrders.title": { it: "Work orders", en: "Work orders", fr: "Ordres de travail", es: "Órdenes de trabajo" },
    "analytics.item.workOrders.description": { it: "Controlla andamento e tracciabilità operativa degli ordini di lavoro.", en: "Check progress and operational traceability of work orders.", fr: "Contrôlez l'avancement et la traçabilité opérationnelle des ordres de travail.", es: "Controla el avance y la trazabilidad operativa de las órdenes de trabajo." },

    // --- compliance ---
    "compliance.title": { it: "Compliance", en: "Compliance", fr: "Conformité", es: "Cumplimiento" },
    "compliance.subtitle": { it: "Hub di accesso rapido ai moduli utili per conformità, audit e tracciabilità.", en: "Quick access hub for modules useful for compliance, audits and traceability.", fr: "Hub d'accès rapide aux modules utiles pour la conformité, les audits et la traçabilité.", es: "Hub de acceso rápido a los módulos útiles para cumplimiento, auditorías y trazabilidad." },
    "compliance.item.documents.title": { it: "Documentazione di conformità", en: "Compliance documentation", fr: "Documentation de conformité", es: "Documentación de cumplimiento" },
    "compliance.item.documents.description": { it: "Manuali, dichiarazioni, schemi e documenti rilevanti per la conformità.", en: "Manuals, declarations, diagrams and relevant compliance documents.", fr: "Manuels, déclarations, schémas et documents pertinents pour la conformité.", es: "Manuales, declaraciones, esquemas y documentos relevantes para el cumplimiento." },
    "compliance.item.analytics.title": { it: "Analytics e storico", en: "Analytics and history", fr: "Analyses et historique", es: "Análisis e histórico" },
    "compliance.item.analytics.description": { it: "Storico esecuzioni checklist e dati utili per audit interni.", en: "Checklist execution history and useful data for internal audits.", fr: "Historique des exécutions de check-lists et données utiles pour les audits internes.", es: "Histórico de ejecuciones de checklist y datos útiles para auditorías internas." },
    "compliance.item.executions.title": { it: "Esecuzioni checklist", en: "Checklist executions", fr: "Exécutions de check-lists", es: "Ejecuciones de checklist" },
    "compliance.item.executions.description": { it: "Verifica esecuzioni e prove operative collegate al contesto attivo.", en: "Review executions and operational evidence linked to the active context.", fr: "Vérifiez les exécutions et les preuves opérationnelles liées au contexte actif.", es: "Verifica ejecuciones y evidencias operativas vinculadas al contexto activo." },

    // --- users ---
    "users.title": { it: "Utenti", en: "Users", fr: "Utilisateurs", es: "Usuarios" },
    "users.subtitle": { it: "Gestisci utenti e ruoli per", en: "Manage users and roles for", fr: "Gérez les utilisateurs et rôles pour", es: "Gestiona usuarios y roles para" },
    "users.activeOrganizationFallback": { it: "l'organizzazione attiva", en: "the active organization", fr: "l'organisation active", es: "la organización activa" },
    "users.new": { it: "Nuovo utente", en: "New user", fr: "Nouvel utilisateur", es: "Nuevo usuario" },
    "users.supervisorMode": { it: "Modalità supervisore: puoi vedere gli utenti, ma creazione, modifica e disattivazione restano disponibili solo agli admin.", en: "Supervisor mode: you can view users, but creation, editing and deactivation remain available only to admins.", fr: "Mode superviseur : vous pouvez voir les utilisateurs, mais la création, la modification et la désactivation restent réservées aux admins.", es: "Modo supervisor: puedes ver los usuarios, pero la creación, edición y desactivación siguen disponibles solo para los administradores." },
    "users.kpi.total": { it: "Utenti totali", en: "Total users", fr: "Utilisateurs totaux", es: "Usuarios totales" },
    "users.kpi.active": { it: "Utenti attivi", en: "Active users", fr: "Utilisateurs actifs", es: "Usuarios activos" },
    "users.kpi.inactive": { it: "Utenti disattivi", en: "Inactive users", fr: "Utilisateurs inactifs", es: "Usuarios inactivos" },
    "users.organizationMembers": { it: "Membri organizzazione", en: "Organization members", fr: "Membres de l'organisation", es: "Miembros de la organización" },
    "users.searchPlaceholder": { it: "Cerca per nome, email o ruolo", en: "Search by name, email or role", fr: "Rechercher par nom, email ou rôle", es: "Buscar por nombre, email o rol" },
    "users.noResults": { it: "Nessun utente trovato.", en: "No users found.", fr: "Aucun utilisateur trouvé.", es: "No se encontraron usuarios." },
    "users.fallbackUnnamed": { it: "Utente senza nome", en: "Unnamed user", fr: "Utilisateur sans nom", es: "Usuario sin nombre" },
    "users.table.user": { it: "Utente", en: "User", fr: "Utilisateur", es: "Usuario" },
    "users.table.role": { it: "Ruolo", en: "Role", fr: "Rôle", es: "Rol" },
    "users.table.status": { it: "Stato", en: "Status", fr: "Statut", es: "Estado" },
    "users.table.acceptance": { it: "Accettazione", en: "Acceptance", fr: "Acceptation", es: "Aceptación" },
    "users.table.actions": { it: "Azioni", en: "Actions", fr: "Actions", es: "Acciones" },
    "users.role.admin": { it: "Admin", en: "Admin", fr: "Admin", es: "Admin" },
    "users.role.supervisor": { it: "Supervisor", en: "Supervisor", fr: "Superviseur", es: "Supervisor" },
    "users.role.technician": { it: "Tecnico", en: "Technician", fr: "Technicien", es: "Técnico" },
    "users.status.active": { it: "Attivo", en: "Active", fr: "Actif", es: "Activo" },
    "users.status.inactive": { it: "Disattivo", en: "Inactive", fr: "Inactif", es: "Inactivo" },
    "users.status.pending": { it: "In attesa", en: "Pending", fr: "En attente", es: "Pendiente" },
    "users.field.fullName": { it: "Nome completo", en: "Full name", fr: "Nom complet", es: "Nombre completo" },
    "users.field.displayName": { it: "Nome visualizzato", en: "Display name", fr: "Nom affiché", es: "Nombre visible" },
    "users.field.email": { it: "Email", en: "Email", fr: "Email", es: "Email" },
    "users.field.password": { it: "Password", en: "Password", fr: "Mot de passe", es: "Contraseña" },
    "users.field.role": { it: "Ruolo", en: "Role", fr: "Rôle", es: "Rol" },
    "users.field.status": { it: "Stato", en: "Status", fr: "Statut", es: "Estado" },
    "users.dialog.create.title": { it: "Nuovo utente", en: "New user", fr: "Nouvel utilisateur", es: "Nuevo usuario" },
    "users.dialog.create.description": { it: "Crea un nuovo utente nell'organizzazione attiva.", en: "Create a new user in the active organization.", fr: "Créez un nouvel utilisateur dans l'organisation active.", es: "Crea un nuevo usuario en la organización activa." },
    "users.dialog.create.confirm": { it: "Crea utente", en: "Create user", fr: "Créer l'utilisateur", es: "Crear usuario" },
    "users.dialog.edit.title": { it: "Modifica utente", en: "Edit user", fr: "Modifier l'utilisateur", es: "Editar usuario" },
    "users.dialog.edit.description": { it: "Aggiorna nome, ruolo e stato dell'utente selezionato.", en: "Update name, role and status of the selected user.", fr: "Mettez à jour le nom, le rôle et le statut de l'utilisateur sélectionné.", es: "Actualiza el nombre, rol y estado del usuario seleccionado." },
    "users.dialog.edit.confirm": { it: "Salva modifiche", en: "Save changes", fr: "Enregistrer les modifications", es: "Guardar cambios" },
    "users.dialog.deactivate.title": { it: "Disattiva utente", en: "Deactivate user", fr: "Désactiver l'utilisateur", es: "Desactivar usuario" },
    "users.dialog.deactivate.description": { it: "Vuoi davvero disattivare", en: "Do you really want to deactivate", fr: "Voulez-vous vraiment désactiver", es: "¿De verdad quieres desactivar a" },
    "users.dialog.deactivate.confirm": { it: "Disattiva", en: "Deactivate", fr: "Désactiver", es: "Desactivar" },
    "users.toast.error": { it: "Errore", en: "Error", fr: "Erreur", es: "Error" },
    "users.toast.loadError": { it: "Impossibile caricare gli utenti dell'organizzazione.", en: "Unable to load organization users.", fr: "Impossible de charger les utilisateurs de l'organisation.", es: "No se pudieron cargar los usuarios de la organización." },
    "users.toast.permissionDenied": { it: "Permesso negato", en: "Permission denied", fr: "Permission refusée", es: "Permiso denegado" },
    "users.toast.adminOnlyCreate": { it: "Solo gli admin possono creare utenti.", en: "Only admins can create users.", fr: "Seuls les admins peuvent créer des utilisateurs.", es: "Solo los administradores pueden crear usuarios." },
    "users.toast.adminOnlyEdit": { it: "Solo gli admin possono modificare utenti.", en: "Only admins can edit users.", fr: "Seuls les admins peuvent modifier des utilisateurs.", es: "Solo los administradores pueden editar usuarios." },
    "users.toast.adminOnlyDeactivate": { it: "Solo gli admin possono disattivare utenti.", en: "Only admins can deactivate users.", fr: "Seuls les admins peuvent désactiver des utilisateurs.", es: "Solo los administradores pueden desactivar usuarios." },
    "users.toast.missingData": { it: "Dati mancanti", en: "Missing data", fr: "Données manquantes", es: "Datos faltantes" },
    "users.toast.emailPasswordRequired": { it: "Email e password sono obbligatorie.", en: "Email and password are required.", fr: "Email et mot de passe sont obligatoires.", es: "El email y la contraseña son obligatorios." },
    "users.toast.sessionExpired": { it: "Sessione scaduta, effettua di nuovo il login", en: "Session expired, please log in again", fr: "Session expirée, reconnectez-vous", es: "Sesión expirada, inicia sesión de nuevo" },
    "users.toast.createFailed": { it: "Creazione utente fallita", en: "User creation failed", fr: "Échec de création de l'utilisateur", es: "La creación del usuario falló" },
    "users.toast.userCreated": { it: "Utente creato", en: "User created", fr: "Utilisateur créé", es: "Usuario creado" },
    "users.toast.createError": { it: "Errore creazione utente", en: "User creation error", fr: "Erreur de création utilisateur", es: "Error al crear usuario" },
    "users.toast.userUpdated": { it: "Utente aggiornato", en: "User updated", fr: "Utilisateur mis à jour", es: "Usuario actualizado" },
    "users.toast.updateError": { it: "Errore aggiornamento utente", en: "User update error", fr: "Erreur de mise à jour utilisateur", es: "Error al actualizar usuario" },
    "users.toast.operationNotAllowed": { it: "Operazione non consentita", en: "Operation not allowed", fr: "Opération non autorisée", es: "Operación no permitida" },
    "users.toast.cannotDeactivateSelf": { it: "Non puoi disattivare te stesso.", en: "You cannot deactivate yourself.", fr: "Vous ne pouvez pas vous désactiver vous-même.", es: "No puedes desactivarte a ti mismo." },
    "users.toast.userDeactivated": { it: "Utente disattivato", en: "User deactivated", fr: "Utilisateur désactivé", es: "Usuario desactivado" },
    "users.toast.deactivateError": { it: "Errore disattivazione utente", en: "User deactivation error", fr: "Erreur de désactivation utilisateur", es: "Error al desactivar usuario" },
    "users.kpiTotal": { it: "Utenti totali", en: "Total users", fr: "Utilisateurs totaux", es: "Usuarios totales" },
    "users.kpiActive": { it: "Utenti attivi", en: "Active users", fr: "Utilisateurs actifs", es: "Usuarios activos" },
    "users.kpiAdmins": { it: "Ruoli gestionali", en: "Admin roles", fr: "Rôles de gestion", es: "Roles de gestión" },
    "users.kpiViewers": { it: "Viewer", en: "Viewers", fr: "Lecteurs", es: "Lectores" },
    "users.allRoles": { it: "Tutti i ruoli", en: "All roles", fr: "Tous les rôles", es: "Todos los roles" },
    "users.allStatuses": { it: "Tutti gli stati", en: "All statuses", fr: "Tous les statuts", es: "Todos los estados" },

    // --- activeOrg ---
    "activeOrg.title": { it: "Organizzazione attiva", en: "Active organization", fr: "Organisation active", es: "Organización activa" },
    "activeOrg.description": { it: "Qui scegli il contesto reale della webapp. Tutte le viste MACHINA devono leggere questa organizzazione da profiles.default_organization_id.", en: "Here you choose the real app context. All MACHINA views must read this organization from profiles.default_organization_id.", fr: "Ici, vous choisissez le contexte réel de l'application web. Toutes les vues MACHINA doivent lire cette organisation depuis profiles.default_organization_id.", es: "Aquí eliges el contexto real de la aplicación web. Todas las vistas de MACHINA deben leer esta organización desde profiles.default_organization_id." },
    "activeOrg.noMemberships": { it: "Non risultano membership attive. Senza almeno una membership attiva la webapp non può determinare il contesto organizzativo.", en: "No active memberships found. Without at least one active membership, the web app cannot determine the organizational context.", fr: "Aucune adhésion active trouvée. Sans au moins une adhésion active, l'application web ne peut pas déterminer le contexte organisationnel.", es: "No se encontraron membresías activas. Sin al menos una membresía activa, la aplicación web no puede determinar el contexto organizativo." },
    "activeOrg.membershipsTitle": { it: "Membership attive", en: "Active memberships", fr: "Adhésions actives", es: "Membresías activas" },
    "activeOrg.membershipsDescription": { it: "Verifica rapidamente in quali organizzazioni sei attivo e con quale ruolo.", en: "Quickly check which organizations you are active in and with which role.", fr: "Vérifiez rapidement dans quelles organisations vous êtes actif et avec quel rôle.", es: "Verifica rápidamente en qué organizaciones estás activo y con qué rol." },
    "activeOrg.activeBadge": { it: "Attiva", en: "Active", fr: "Active", es: "Activa" },
    "activeOrg.fallbackOrganization": { it: "organizzazione", en: "organization", fr: "organisation", es: "organización" },

    // --- trash ---
    "trash.title": { it: "Cestino", en: "Trash", fr: "Corbeille", es: "Papelera" },
    "trash.subtitle": { it: "Elementi eliminati. Possono essere ripristinati.", en: "Deleted items. Can be restored.", fr: "Éléments supprimés. Peuvent être restaurés.", es: "Elementos eliminados. Pueden ser restaurados." },
    "trash.loading": { it: "Caricamento...", en: "Loading...", fr: "Chargement...", es: "Cargando..." },
    "trash.noResults": { it: "Il cestino è vuoto.", en: "Trash is empty.", fr: "La corbeille est vide.", es: "La papelera está vacía." },
    "trash.restore": { it: "Ripristina", en: "Restore", fr: "Restaurer", es: "Restaurar" },
    "trash.restoreConfirm": { it: "Vuoi ripristinare questo elemento?", en: "Restore this item?", fr: "Restaurer cet élément ?", es: "¿Restaurar este elemento?" },
    "trash.restored": { it: "Elemento ripristinato", en: "Item restored", fr: "Élément restauré", es: "Elemento restaurado" },
    "trash.deletePermanently": { it: "Elimina definitivamente", en: "Delete permanently", fr: "Supprimer définitivement", es: "Eliminar permanentemente" },
    "trash.deleteConfirm": { it: "Sei sicuro? Questa azione è irreversibile.", en: "Are you sure? This action cannot be undone.", fr: "Êtes-vous sûr ? Cette action est irréversible.", es: "¿Estás seguro? Esta acción no se puede deshacer." },
    "trash.tab.machines": { it: "Macchine", en: "Machines", fr: "Machines", es: "Máquinas" },
    "trash.tab.documents": { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" },
    "trash.tab.customers": { it: "Clienti", en: "Customers", fr: "Clients", es: "Clientes" },

    // --- machines ---
    "machines.title": { it: "Macchine", en: "Machines", fr: "Machines", es: "Máquinas" },
    "machines.subtitle": { it: "Registro macchine dell'organizzazione.", en: "Organization machine registry.", fr: "Registre des machines de l'organisation.", es: "Registro de máquinas de la organización." },
    "machines.new": { it: "Nuova macchina", en: "New machine", fr: "Nouvelle machine", es: "Nueva máquina" },
    "machines.loading": { it: "Caricamento macchine...", en: "Loading machines...", fr: "Chargement des machines...", es: "Cargando máquinas..." },
    "machines.noResults": { it: "Nessuna macchina trovata.", en: "No machines found.", fr: "Aucune machine trouvée.", es: "No se encontraron máquinas." },
    "machines.search": { it: "Cerca macchina...", en: "Search machine...", fr: "Rechercher machine...", es: "Buscar máquina..." },
    "machines.detail": { it: "Dettaglio macchina", en: "Machine detail", fr: "Détail de la machine", es: "Detalle de máquina" },
    "machines.serialNumber": { it: "Numero di serie", en: "Serial number", fr: "Numéro de série", es: "Número de serie" },
    "machines.model": { it: "Modello", en: "Model", fr: "Modèle", es: "Modelo" },
    "machines.manufacturer": { it: "Costruttore", en: "Manufacturer", fr: "Constructeur", es: "Fabricante" },
    "machines.year": { it: "Anno", en: "Year", fr: "Année", es: "Año" },
    "machines.status": { it: "Stato", en: "Status", fr: "Statut", es: "Estado" },
};

// Alias legacy: chiavi vecchie che puntano a chiavi nuove
const translationAliases: Record<string, string[]> = {
    "workOrders.search": ["workOrders.searchPlaceholder"],
    "workOrders.statusOpen": ["workOrders.status.open"],
    "workOrders.statusInProgress": ["workOrders.status.inProgress"],
    "workOrders.machineFallback": ["workOrders.fallbackTitle"],
};

// ============================================================================
// BUILD: espande DICT in Record<Language, Record<string, string>>
// ============================================================================
const translations: Record<Language, Record<string, string>> = {
    it: {},
    en: {},
    fr: {},
    es: {},
};
for (const [key, t4] of Object.entries(DICT)) {
    translations.it[key] = t4.it;
    translations.en[key] = t4.en;
    translations.fr[key] = t4.fr;
    translations.es[key] = t4.es;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Legge localStorage in modo sincrono; _app.tsx ha il mounted guard.
function getInitialLanguage(): Language {
    if (typeof window === "undefined") return "it";
    const stored = localStorage.getItem("app-language");
    if (stored === "it" || stored === "en" || stored === "fr" || stored === "es") return stored;
    return "it";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app-language", lang);
    };

    const t = (key: string): string => {
        const candidates = [key, ...(translationAliases[key] ?? [])];

        for (const candidate of candidates) {
            const translated = translations[language]?.[candidate] || translations.it?.[candidate];
            if (translated) return translated;
        }

        return key;
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

