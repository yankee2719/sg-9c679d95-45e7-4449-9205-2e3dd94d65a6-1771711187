export type ChecklistPageLanguage = "it" | "en" | "fr" | "es";

const texts = {
    it: {
        common: {
            loading: "Caricamento...",
            search: "Cerca template...",
            all: "Tutti",
        },
        templates: {
            title: "Template Checklist",
            subtitle: "Gestisci i template checklist dell’organizzazione attiva.",
            new: "Nuovo template",
            total: "Template totali",
            active: "Template attivi",
            items: "Item totali",
            listTitle: "Elenco template",
            noResults: "Nessun template trovato.",
            targetMachine: "Macchina",
            targetLine: "Linea",
            itemCount: "item",
            version: "Versione",
            statusActive: "Attivo",
            statusInactive: "Inattivo",
            newTemplate: "Nuovo template",
        },
    },
    en: {
        common: {
            loading: "Loading...",
            search: "Search template...",
            all: "All",
        },
        templates: {
            title: "Checklist Templates",
            subtitle: "Manage checklist templates in the active organization.",
            new: "New template",
            total: "Total templates",
            active: "Active templates",
            items: "Total items",
            listTitle: "Template list",
            noResults: "No templates found.",
            targetMachine: "Machine",
            targetLine: "Line",
            itemCount: "items",
            version: "Version",
            statusActive: "Active",
            statusInactive: "Inactive",
            newTemplate: "New template",
        },
    },
    fr: {
        common: {
            loading: "Chargement...",
            search: "Rechercher un modèle...",
            all: "Tous",
        },
        templates: {
            title: "Modèles de checklist",
            subtitle: "Gérez les modèles de checklist de l’organisation active.",
            new: "Nouveau modèle",
            total: "Modèles totaux",
            active: "Modèles actifs",
            items: "Éléments totaux",
            listTitle: "Liste des modèles",
            noResults: "Aucun modèle trouvé.",
            targetMachine: "Machine",
            targetLine: "Ligne",
            itemCount: "éléments",
            version: "Version",
            statusActive: "Actif",
            statusInactive: "Inactif",
            newTemplate: "Nouveau modèle",
        },
    },
    es: {
        common: {
            loading: "Cargando...",
            search: "Buscar plantilla...",
            all: "Todos",
        },
        templates: {
            title: "Plantillas de checklist",
            subtitle: "Gestiona las plantillas de checklist de la organización activa.",
            new: "Nueva plantilla",
            total: "Plantillas totales",
            active: "Plantillas activas",
            items: "Ítems totales",
            listTitle: "Lista de plantillas",
            noResults: "No se encontraron plantillas.",
            targetMachine: "Máquina",
            targetLine: "Línea",
            itemCount: "ítems",
            version: "Versión",
            statusActive: "Activa",
            statusInactive: "Inactiva",
            newTemplate: "Nueva plantilla",
        },
    },
} as const;

export function getChecklistTexts(language?: string) {
    const lang = (language || "en") as ChecklistPageLanguage;
    return texts[lang] ?? texts.en;
}

export function translateChecklistTarget(targetType: string | null | undefined, language?: string) {
    const t = getChecklistTexts(language);
    if (targetType === "production_line") return t.templates.targetLine;
    return t.templates.targetMachine;
}

export function formatChecklistDate(value: string | null | undefined, language?: string) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const locale =
        language === "it"
            ? "it-IT"
            : language === "fr"
                ? "fr-FR"
                : language === "es"
                    ? "es-ES"
                    : "en-GB";

    return date.toLocaleDateString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function canManageChecklists(role: string | null | undefined): boolean {
    return ["owner", "admin", "supervisor"].includes(role ?? "");
}

const inputTypeLabels: Record<string, Record<string, string>> = {
    it: {
        checkbox: "Checkbox",
        text: "Testo",
        number: "Numero",
        select: "Selezione",
        photo: "Foto",
        signature: "Firma",
        date: "Data",
        textarea: "Testo lungo",
    },
    en: {
        checkbox: "Checkbox",
        text: "Text",
        number: "Number",
        select: "Selection",
        photo: "Photo",
        signature: "Signature",
        date: "Date",
        textarea: "Long text",
    },
    fr: {
        checkbox: "Case à cocher",
        text: "Texte",
        number: "Nombre",
        select: "Sélection",
        photo: "Photo",
        signature: "Signature",
        date: "Date",
        textarea: "Texte long",
    },
    es: {
        checkbox: "Casilla",
        text: "Texto",
        number: "Número",
        select: "Selección",
        photo: "Foto",
        signature: "Firma",
        date: "Fecha",
        textarea: "Texto largo",
    },
};

export function translateChecklistInputType(inputType: string | null | undefined, language?: string): string {
    const lang = (language || "it") as ChecklistPageLanguage;
    const labels = inputTypeLabels[lang] ?? inputTypeLabels.it;
    return labels[inputType ?? ""] ?? (inputType || "—");
}