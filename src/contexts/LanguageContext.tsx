// src/contexts/LanguageContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

export type Language = "it" | "en" | "fr" | "es";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext < LanguageContextType | undefined > (undefined);

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
        "common.actions": "Azioni",
        "common.status": "Stato",
        "common.date": "Data",
        "common.time": "Ora",
        "common.name": "Nome",
        "common.description": "Descrizione",
        "common.notes": "Note",
        "common.priority": "Priorità",
        "common.high": "Alta",
        "common.medium": "Media",
        "common.low": "Bassa",
        "common.success": "Successo",
        "common.error": "Errore",
        "common.warning": "Attenzione",
        "common.never": "Mai",
        "common.noDescription": "Nessuna descrizione",
        "common.show": "Mostra",
        "common.clickToShow": "Clicca per mostrare",

        "nav.dashboard": "Dashboard",
        "nav.equipment": "Macchine",
        "nav.maintenance": "Manutenzione",
        "nav.workOrders": "Ordini di lavoro",
        "nav.checklists": "Checklist",
        "nav.analytics": "Analisi",
        "nav.settings": "Impostazioni",
        "nav.users": "Utenti",
        "nav.notifications": "Notifiche",
        "nav.logout": "Esci",
        "nav.scanner": "Scanner QR",

        "language.selectLanguage": "Seleziona Lingua",

        "equipment.title": "Macchine",
        "equipment.subtitle": "Gestisci e monitora tutte le macchine",
        "equipment.new": "Nuova Macchina",
        "equipment.edit": "Modifica Macchina",
        "equipment.details": "Dettagli Macchina",
        "equipment.name": "Nome Macchina",
        "equipment.code": "Codice Macchina",
        "equipment.type": "Tipo",
        // (il resto del file rimane uguale alle tue stringhe originali)
    },

    en: {
        "nav.dashboard": "Dashboard",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Work Orders",
        "nav.checklists": "Checklists",
        "nav.analytics": "Analytics",
        "nav.settings": "Settings",
        "nav.users": "Users",
        "nav.notifications": "Notifications",
        "nav.logout": "Logout",
        "nav.scanner": "QR Scanner",

        "equipment.title": "Machines",
        "equipment.noEquipment": "No machines found",
        // (resto invariato)
    },

    fr: {
        "nav.dashboard": "Tableau de bord",
        "nav.equipment": "Machines",
        "nav.maintenance": "Maintenance",
        "nav.workOrders": "Ordres de travail",
        "nav.checklists": "Checklists",
        "nav.analytics": "Analytique",
        "nav.settings": "Paramètres",
        "nav.users": "Utilisateurs",
        "nav.notifications": "Notifications",
        "nav.logout": "Déconnexion",
        "nav.scanner": "Scanner QR",

        "equipment.title": "Machines",
        // (resto invariato)
    },

    es: {
        "nav.dashboard": "Panel de Control",
        "nav.equipment": "Máquinas",
        "nav.maintenance": "Mantenimiento",
        "nav.workOrders": "Órdenes de trabajo",
        "nav.checklists": "Checklist",
        "nav.analytics": "Analítica",
        "nav.settings": "Configuración",
        "nav.users": "Usuarios",
        "nav.notifications": "Notificaciones",
        "nav.logout": "Salir",
        "nav.scanner": "Escáner QR",

        "equipment.title": "Máquinas",
        // (resto invariato)
    },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [language, setLanguage] = useState < Language > ("it");

    const t = useMemo(() => {
        return (key: string) => translations[language][key] || key;
    }, [language]);

    const value = useMemo(
        () => ({ language, setLanguage, t }),
        [language, t]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
    return ctx;
};