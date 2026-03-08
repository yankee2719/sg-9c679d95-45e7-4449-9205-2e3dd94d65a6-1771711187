import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "it" | "en" | "fr" | "es";

type TranslationDict = Record<string, string>;

const translations: Record<Language, TranslationDict> = {
    it: {
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
        "nav.settings": "Impostazioni",

        "common.logout": "Esci",
        "common.language": "Lingua",
        "common.theme": "Tema",
        "common.notifications": "Notifiche",
        "common.profile": "Profilo",

        "org.manufacturer": "Costruttore",
        "org.customer": "Utilizzatore finale",
    },
    en: {
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
        "nav.settings": "Settings",

        "common.logout": "Logout",
        "common.language": "Language",
        "common.theme": "Theme",
        "common.notifications": "Notifications",
        "common.profile": "Profile",

        "org.manufacturer": "Manufacturer",
        "org.customer": "End user",
    },
    fr: {
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
        "nav.settings": "Paramètres",

        "common.logout": "Déconnexion",
        "common.language": "Langue",
        "common.theme": "Thème",
        "common.notifications": "Notifications",
        "common.profile": "Profil",

        "org.manufacturer": "Constructeur",
        "org.customer": "Utilisateur final",
    },
    es: {
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
        "nav.settings": "Configuración",

        "common.logout": "Salir",
        "common.language": "Idioma",
        "common.theme": "Tema",
        "common.notifications": "Notificaciones",
        "common.profile": "Perfil",

        "org.manufacturer": "Fabricante",
        "org.customer": "Usuario final",
    },
};

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext < LanguageContextType | undefined > (undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState < Language > ("it");

    useEffect(() => {
        const saved = localStorage.getItem("app-language") as Language | null;
        if (saved && ["it", "en", "fr", "es"].includes(saved)) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app-language", lang);
    };

    const t = useMemo(() => {
        return (key: string) => translations[language]?.[key] ?? key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error("useLanguage must be used inside LanguageProvider");
    }
    return ctx;
}