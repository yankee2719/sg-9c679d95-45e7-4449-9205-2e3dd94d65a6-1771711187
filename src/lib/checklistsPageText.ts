export type ChecklistPageLanguage = "it" | "en" | "fr" | "es";

const texts = {
    it: {
        common: {
            loading: "Caricamento...",
            search: "Cerca template...",
            all: "Tutti",
            error: "Errore",
            save: "Salva",
            saving: "Salvataggio...",
            cancel: "Annulla",
            back: "Indietro",
            yes: "Sì",
            no: "No",
            inactive: "Facoltativo",
        },
        templates: {
            title: "Template Checklist",
            subtitle: "Gestisci i template checklist dell'organizzazione attiva.",
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
            editTemplate: "Modifica template",
            editorSubtitle: "Configura nome, target e voci della checklist.",
            name: "Nome template",
            description: "Descrizione",
            target: "Target",
            targetHelp: "Scegli se la checklist è per macchina o per linea produttiva.",
            enabled: "Stato",
            itemsTitle: "Voci della checklist",
            noItems: "Nessuna voce aggiunta.",
            addItem: "Aggiungi voce",
            removeItem: "Rimuovi",
            itemTitle: "Titolo voce",
            itemDescription: "Descrizione voce",
            inputType: "Tipo input",
            required: "Obbligatorio",
            deleteConfirm: "Sei sicuro di voler rimuovere questa voce?",
            validationName: "Il nome del template è obbligatorio.",
            validationItem: "Tutte le voci devono avere un titolo.",
            saveError: "Errore durante il salvataggio.",
            loadError: "Errore durante il caricamento del template.",
            saveSuccessCreate: "Template creato con successo.",
            saveSuccessUpdate: "Template aggiornato con successo.",
        },
        inputs: {
            boolean: "Sì / No",
            text: "Testo",
            number: "Numero",
            value: "Valore",
        },
        assignments: {
            onlyManagers: "Solo admin e supervisor possono modificare i template checklist.",
        },
    },
    en: {
        common: {
            loading: "Loading...",
            search: "Search template...",
            all: "All",
            error: "Error",
            save: "Save",
            saving: "Saving...",
            cancel: "Cancel",
            back: "Back",
            yes: "Yes",
            no: "No",
            inactive: "Optional",
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
            editTemplate: "Edit template",
            editorSubtitle: "Configure name, target and checklist items.",
            name: "Template name",
            description: "Description",
            target: "Target",
            targetHelp: "Choose if the checklist is for a machine or a production line.",
            enabled: "Status",
            itemsTitle: "Checklist items",
            noItems: "No items added.",
            addItem: "Add item",
            removeItem: "Remove",
            itemTitle: "Item title",
            itemDescription: "Item description",
            inputType: "Input type",
            required: "Required",
            deleteConfirm: "Are you sure you want to remove this item?",
            validationName: "Template name is required.",
            validationItem: "All items must have a title.",
            saveError: "Error saving template.",
            loadError: "Error loading template.",
            saveSuccessCreate: "Template created successfully.",
            saveSuccessUpdate: "Template updated successfully.",
        },
        inputs: {
            boolean: "Yes / No",
            text: "Text",
            number: "Number",
            value: "Value",
        },
        assignments: {
            onlyManagers: "Only admins and supervisors can edit checklist templates.",
        },
    },
    fr: {
        common: {
            loading: "Chargement...",
            search: "Rechercher un modèle...",
            all: "Tous",
            error: "Erreur",
            save: "Enregistrer",
            saving: "Enregistrement...",
            cancel: "Annuler",
            back: "Retour",
            yes: "Oui",
            no: "Non",
            inactive: "Facultatif",
        },
        templates: {
            title: "Modèles de checklist",
            subtitle: "Gérez les modèles de checklist de l'organisation active.",
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
            editTemplate: "Modifier le modèle",
            editorSubtitle: "Configurez le nom, la cible et les éléments de la checklist.",
            name: "Nom du modèle",
            description: "Description",
            target: "Cible",
            targetHelp: "Choisissez si la checklist est pour une machine ou une ligne de production.",
            enabled: "Statut",
            itemsTitle: "Éléments de la checklist",
            noItems: "Aucun élément ajouté.",
            addItem: "Ajouter un élément",
            removeItem: "Supprimer",
            itemTitle: "Titre de l'élément",
            itemDescription: "Description de l'élément",
            inputType: "Type d'entrée",
            required: "Obligatoire",
            deleteConfirm: "Êtes-vous sûr de vouloir supprimer cet élément ?",
            validationName: "Le nom du modèle est obligatoire.",
            validationItem: "Tous les éléments doivent avoir un titre.",
            saveError: "Erreur lors de l'enregistrement.",
            loadError: "Erreur lors du chargement du modèle.",
            saveSuccessCreate: "Modèle créé avec succès.",
            saveSuccessUpdate: "Modèle mis à jour avec succès.",
        },
        inputs: {
            boolean: "Oui / Non",
            text: "Texte",
            number: "Nombre",
            value: "Valeur",
        },
        assignments: {
            onlyManagers: "Seuls les admins et superviseurs peuvent modifier les modèles de checklist.",
        },
    },
    es: {
        common: {
            loading: "Cargando...",
            search: "Buscar plantilla...",
            all: "Todos",
            error: "Error",
            save: "Guardar",
            saving: "Guardando...",
            cancel: "Cancelar",
            back: "Atrás",
            yes: "Sí",
            no: "No",
            inactive: "Opcional",
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
            editTemplate: "Editar plantilla",
            editorSubtitle: "Configura nombre, objetivo y elementos de la checklist.",
            name: "Nombre de la plantilla",
            description: "Descripción",
            target: "Objetivo",
            targetHelp: "Elige si la checklist es para una máquina o una línea de producción.",
            enabled: "Estado",
            itemsTitle: "Elementos de la checklist",
            noItems: "No se han añadido elementos.",
            addItem: "Añadir elemento",
            removeItem: "Eliminar",
            itemTitle: "Título del elemento",
            itemDescription: "Descripción del elemento",
            inputType: "Tipo de entrada",
            required: "Obligatorio",
            deleteConfirm: "¿Estás seguro de que quieres eliminar este elemento?",
            validationName: "El nombre de la plantilla es obligatorio.",
            validationItem: "Todos los elementos deben tener un título.",
            saveError: "Error al guardar.",
            loadError: "Error al cargar la plantilla.",
            saveSuccessCreate: "Plantilla creada correctamente.",
            saveSuccessUpdate: "Plantilla actualizada correctamente.",
        },
        inputs: {
            boolean: "Sí / No",
            text: "Texto",
            number: "Número",
            value: "Valor",
        },
        assignments: {
            onlyManagers: "Solo los administradores y supervisores pueden editar las plantillas de checklist.",
        },
    },
} as const;

export function getChecklistTexts(language?: string) {
    const lang = (language || "it") as ChecklistPageLanguage;
    return texts[lang] ?? texts.it;
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
