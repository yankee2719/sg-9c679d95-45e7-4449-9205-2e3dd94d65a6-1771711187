import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Language = "it" | "en" | "fr" | "es";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    it: {
        // common
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

        // ✅ NAV (fix sidebar)
        "nav.dashboard": "Dashboard",
        "nav.equipment": "Macchine",
        "nav.maintenance": "Manutenzione",
        "nav.workOrders": "Ordini di lavoro",
        "nav.checklists": "Checklist",
        "nav.scanner": "Scanner",
        "nav.analytics": "Analisi",
        "nav.compliance": "Compliance",

        // pages
        "dashboard.title": "Dashboard",
        "dashboard.subtitle": "Panoramica del sistema",

        "equipment.title": "Macchine",
        "equipment.subtitle": "Gestione macchine e attrezzature",
        "equipment.new": "Nuova macchina",
        "equipment.noEquipment": "Nessuna macchina trovata",
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

        // ✅ NAV
        "nav.dashboard": "Dashboard",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Work Orders",
        "nav.checklists": "Checklists",
        "nav.scanner": "Scanner",
        "nav.analytics": "Analytics",
        "nav.compliance": "Compliance",

        "dashboard.title": "Dashboard",
        "dashboard.subtitle": "System overview",

        "equipment.title": "Machines",
        "equipment.subtitle": "Machines & equipment management",
        "equipment.new": "New machine",
        "equipment.noEquipment": "No machines found",
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

        // ✅ NAV
        "nav.dashboard": "Tableau de bord",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Ordres de travail",
        "nav.checklists": "Listes de contrôle",
        "nav.scanner": "Scanner",
        "nav.analytics": "Analyses",
        "nav.compliance": "Conformité",

        "dashboard.title": "Tableau de bord",
        "dashboard.subtitle": "Aperçu du système",

        "equipment.title": "Machines",
        "equipment.subtitle": "Gestion des machines",
        "equipment.new": "Nouvelle machine",
        "equipment.noEquipment": "Aucune machine trouvée",
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

        // ✅ NAV
        "nav.dashboard": "Panel",
        "nav.equipment": "Máquinas",
        "nav.maintenance": "Mantenimiento",
        "nav.workOrders": "Órdenes de trabajo",
        "nav.checklists": "Listas de verificación",
        "nav.scanner": "Escáner",
        "nav.analytics": "Analíticas",
        "nav.compliance": "Cumplimiento",

        "dashboard.title": "Panel",
        "dashboard.subtitle": "Resumen del sistema",

        "equipment.title": "Máquinas",
        "equipment.subtitle": "Gestión de máquinas",
        "equipment.new": "Nueva máquina",
        "equipment.noEquipment": "No se encontraron máquinas",
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
        return translations[language]?.[key] || translations["it"]?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) throw new Error("useLanguage must be used within a LanguageProvider");
    return context;
}

// exports richiesti dalla dashboard
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