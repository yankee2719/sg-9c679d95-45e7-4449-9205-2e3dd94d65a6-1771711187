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

        "common.viewAll": "Vedi tutti",

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

        "dashboard.title": "Dashboard",
        "dashboard.subtitle": "Panoramica del sistema",

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
        "common.viewAll": "View all",

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
        "common.viewAll": "Voir tout",

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
        "common.viewAll": "Ver todos",

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
    },
};

const LanguageContext = createContext < LanguageContextType | undefined > (undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState < Language > ("it");

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