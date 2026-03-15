
import type { Language } from "@/contexts/LanguageContext";

type ChecklistTexts = {
    common: {
        loading: string;
        back: string;
        refresh: string;
        search: string;
        save: string;
        saving: string;
        create: string;
        edit: string;
        delete: string;
        cancel: string;
        active: string;
        inactive: string;
        yes: string;
        no: string;
        all: string;
        details: string;
        noneFound: string;
        loginRedirect: string;
        error: string;
    };
    legacy: {
        title: string;
        description: string;
        body: string;
        action: string;
    };
    templates: {
        title: string;
        subtitle: string;
        new: string;
        total: string;
        active: string;
        items: string;
        listTitle: string;
        noResults: string;
        targetMachine: string;
        targetLine: string;
        version: string;
        itemCount: string;
        statusActive: string;
        statusInactive: string;
        editTemplate: string;
        newTemplate: string;
        editorSubtitle: string;
        name: string;
        description: string;
        target: string;
        enabled: string;
        itemsTitle: string;
        noItems: string;
        addItem: string;
        itemTitle: string;
        itemDescription: string;
        inputType: string;
        required: string;
        removeItem: string;
        saveSuccessCreate: string;
        saveSuccessUpdate: string;
        saveError: string;
        loadError: string;
        validationName: string;
        validationItem: string;
        deleteConfirm: string;
        targetHelp: string;
    };
    inputs: {
        boolean: string;
        text: string;
        number: string;
        value: string;
    };
    assignments: {
        title: string;
        subtitle: string;
        newTitle: string;
        newDescription: string;
        template: string;
        machine: string;
        selectTemplate: string;
        selectMachine: string;
        assign: string;
        assigning: string;
        historyTitle: string;
        noResults: string;
        permissionDenied: string;
        onlyManagers: string;
        missingSelection: string;
        duplicate: string;
        assigned: string;
        assignError: string;
        deactivateConfirm: string;
        deactivated: string;
        deactivateError: string;
        openMachine: string;
        deactivate: string;
        activeAssignments: string;
        totalAssignments: string;
        activeOnly: string;
    };
    executions: {
        title: string;
        subtitleCustomer: string;
        subtitleManufacturer: string;
        total: string;
        completed: string;
        inProgress: string;
        failed: string;
        filters: string;
        searchPlaceholder: string;
        status: string;
        plant: string;
        allStatuses: string;
        allPlants: string;
        results: string;
        noResults: string;
        detail: string;
        customerView: string;
        manufacturerView: string;
        templateFallback: string;
        machineFallback: string;
        workOrderFallback: string;
        startedAt: string;
        executedAt: string;
        completedAt: string;
        template: string;
        machine: string;
        workOrder: string;
        notes: string;
        answers: string;
        noAnswers: string;
        ok: string;
        ko: string;
        value: string;
        accessRules: string;
        customerRule: string;
        manufacturerRule: string;
        readonlyRule: string;
        detailTitle: string;
        executionNotFound: string;
        loadError: string;
    };
};

const texts: Record<Language, ChecklistTexts> = {
    it: {
        common: {
            loading: "Caricamento...",
            back: "Indietro",
            refresh: "Aggiorna",
            search: "Cerca",
            save: "Salva",
            saving: "Salvataggio...",
            create: "Crea",
            edit: "Modifica",
            delete: "Elimina",
            cancel: "Annulla",
            active: "Attivo",
            inactive: "Disattivo",
            yes: "Sì",
            no: "No",
            all: "Tutti",
            details: "Dettaglio",
            noneFound: "Nessun elemento trovato.",
            loginRedirect: "Reindirizzamento in corso...",
            error: "Errore",
        },
        legacy: {
            title: "Redirect checklist legacy",
            description: "Questo percorso legacy è stato riallineato al nuovo dominio checklist/templates.",
            body: "Stiamo reindirizzando automaticamente alla nuova sezione template checklist.",
            action: "Vai ora",
        },
        templates: {
            title: "Template checklist",
            subtitle: "Definisci i modelli operativi e le relative voci di controllo nel contesto attivo.",
            new: "Nuovo template",
            total: "Template totali",
            active: "Template attivi",
            items: "Voci totali",
            listTitle: "Elenco template",
            noResults: "Nessun template checklist trovato.",
            targetMachine: "Macchina",
            targetLine: "Linea produttiva",
            version: "Versione",
            itemCount: "voci",
            statusActive: "Attivo",
            statusInactive: "Disattivo",
            editTemplate: "Modifica template",
            newTemplate: "Nuovo template",
            editorSubtitle: "Configura struttura, target e voci della checklist.",
            name: "Nome template",
            description: "Descrizione",
            target: "Target",
            enabled: "Template attivo",
            itemsTitle: "Voci checklist",
            noItems: "Nessuna voce presente. Aggiungi almeno una voce per rendere il template operativo.",
            addItem: "Aggiungi voce",
            itemTitle: "Titolo voce",
            itemDescription: "Descrizione voce",
            inputType: "Tipo input",
            required: "Obbligatoria",
            removeItem: "Rimuovi voce",
            saveSuccessCreate: "Template creato correttamente.",
            saveSuccessUpdate: "Template aggiornato correttamente.",
            saveError: "Errore durante il salvataggio del template.",
            loadError: "Errore caricamento template checklist.",
            validationName: "Il nome del template è obbligatorio.",
            validationItem: "Ogni voce checklist deve avere un titolo.",
            deleteConfirm: "Vuoi davvero rimuovere questa voce?",
            targetHelp: "Scegli se il template si applica a una macchina singola o a una linea produttiva.",
        },
        inputs: {
            boolean: "Sì / No",
            text: "Testo",
            number: "Numero",
            value: "Valore",
        },
        assignments: {
            title: "Assegnazioni checklist",
            subtitle: "Collega i template checklist alle macchine del contesto attivo.",
            newTitle: "Nuova assegnazione",
            newDescription: "Associa un template attivo a una macchina della tua organizzazione.",
            template: "Template",
            machine: "Macchina",
            selectTemplate: "Seleziona template",
            selectMachine: "Seleziona macchina",
            assign: "Assegna checklist",
            assigning: "Assegnazione...",
            historyTitle: "Assegnazioni attive e storiche",
            noResults: "Nessuna assegnazione checklist trovata.",
            permissionDenied: "Permesso negato",
            onlyManagers: "Solo admin e supervisor possono gestire le assegnazioni checklist.",
            missingSelection: "Seleziona template e macchina.",
            duplicate: "Questa checklist è già assegnata alla macchina selezionata.",
            assigned: "Checklist assegnata correttamente.",
            assignError: "Errore assegnazione checklist.",
            deactivateConfirm: "Vuoi davvero disattivare questa assegnazione checklist?",
            deactivated: "Assegnazione disattivata.",
            deactivateError: "Errore disattivazione assegnazione.",
            openMachine: "Apri macchina",
            deactivate: "Disattiva",
            activeAssignments: "Assegnazioni attive",
            totalAssignments: "Assegnazioni totali",
            activeOnly: "Solo attive",
        },
        executions: {
            title: "Checklist eseguite",
            subtitleCustomer: "Storico delle checklist completate nel tuo contesto operativo.",
            subtitleManufacturer: "Storico delle checklist eseguite sulle macchine collegate ai tuoi clienti.",
            total: "Totali",
            completed: "Completate",
            inProgress: "In corso",
            failed: "KO / annullate",
            filters: "Filtri",
            searchPlaceholder: "Template, macchina, work order...",
            status: "Stato",
            plant: "Stabilimento",
            allStatuses: "Tutti gli stati",
            allPlants: "Tutti gli stabilimenti",
            results: "risultati",
            noResults: "Nessuna esecuzione trovata.",
            detail: "Dettaglio",
            customerView: "Vista cliente",
            manufacturerView: "Vista costruttore",
            templateFallback: "Checklist senza titolo",
            machineFallback: "Macchina non trovata",
            workOrderFallback: "—",
            startedAt: "Avvio",
            executedAt: "Eseguita il",
            completedAt: "Completata il",
            template: "Template",
            machine: "Macchina",
            workOrder: "Work order",
            notes: "Note",
            answers: "Dettaglio risposte",
            noAnswers: "Nessuna risposta registrata.",
            ok: "OK",
            ko: "KO",
            value: "Valore risposta",
            accessRules: "Regole di accesso",
            customerRule: "Il cliente finale gestisce l'esecuzione operativa nel proprio contesto.",
            manufacturerRule: "Il costruttore può consultare lo storico solo per macchine collegate attivamente alla propria organizzazione.",
            readonlyRule: "Questa pagina è in sola lettura: l'editing resta confinato ai flussi operativi del customer owner.",
            detailTitle: "Dettaglio esecuzione",
            executionNotFound: "Esecuzione checklist non trovata.",
            loadError: "Errore caricamento esecuzione checklist.",
        },
    },
    en: {
        common: {
            loading: "Loading...",
            back: "Back",
            refresh: "Refresh",
            search: "Search",
            save: "Save",
            saving: "Saving...",
            create: "Create",
            edit: "Edit",
            delete: "Delete",
            cancel: "Cancel",
            active: "Active",
            inactive: "Inactive",
            yes: "Yes",
            no: "No",
            all: "All",
            details: "Details",
            noneFound: "No items found.",
            loginRedirect: "Redirecting...",
            error: "Error",
        },
        legacy: {
            title: "Legacy checklist redirect",
            description: "This legacy route has been aligned with the new checklist/templates domain.",
            body: "We are automatically redirecting you to the new checklist template section.",
            action: "Go now",
        },
        templates: {
            title: "Checklist templates",
            subtitle: "Define operational templates and their control items in the active context.",
            new: "New template",
            total: "Total templates",
            active: "Active templates",
            items: "Total items",
            listTitle: "Template list",
            noResults: "No checklist template found.",
            targetMachine: "Machine",
            targetLine: "Production line",
            version: "Version",
            itemCount: "items",
            statusActive: "Active",
            statusInactive: "Inactive",
            editTemplate: "Edit template",
            newTemplate: "New template",
            editorSubtitle: "Configure structure, target and checklist items.",
            name: "Template name",
            description: "Description",
            target: "Target",
            enabled: "Template enabled",
            itemsTitle: "Checklist items",
            noItems: "No items yet. Add at least one item to make the template operational.",
            addItem: "Add item",
            itemTitle: "Item title",
            itemDescription: "Item description",
            inputType: "Input type",
            required: "Required",
            removeItem: "Remove item",
            saveSuccessCreate: "Template created successfully.",
            saveSuccessUpdate: "Template updated successfully.",
            saveError: "Error while saving the checklist template.",
            loadError: "Error loading checklist template.",
            validationName: "Template name is required.",
            validationItem: "Every checklist item must have a title.",
            deleteConfirm: "Do you really want to remove this item?",
            targetHelp: "Choose whether the template applies to a single machine or to a production line.",
        },
        inputs: {
            boolean: "Yes / No",
            text: "Text",
            number: "Number",
            value: "Value",
        },
        assignments: {
            title: "Checklist assignments",
            subtitle: "Link checklist templates to machines in the active context.",
            newTitle: "New assignment",
            newDescription: "Attach an active template to a machine in your organization.",
            template: "Template",
            machine: "Machine",
            selectTemplate: "Select template",
            selectMachine: "Select machine",
            assign: "Assign checklist",
            assigning: "Assigning...",
            historyTitle: "Active and historical assignments",
            noResults: "No checklist assignment found.",
            permissionDenied: "Permission denied",
            onlyManagers: "Only admins and supervisors can manage checklist assignments.",
            missingSelection: "Select both template and machine.",
            duplicate: "This checklist is already assigned to the selected machine.",
            assigned: "Checklist assigned successfully.",
            assignError: "Checklist assignment error.",
            deactivateConfirm: "Do you really want to deactivate this checklist assignment?",
            deactivated: "Assignment deactivated.",
            deactivateError: "Error while deactivating assignment.",
            openMachine: "Open machine",
            deactivate: "Deactivate",
            activeAssignments: "Active assignments",
            totalAssignments: "Total assignments",
            activeOnly: "Active only",
        },
        executions: {
            title: "Completed checklists",
            subtitleCustomer: "History of completed checklists in your operational context.",
            subtitleManufacturer: "History of checklists executed on machines linked to your customers.",
            total: "Total",
            completed: "Completed",
            inProgress: "In progress",
            failed: "Failed / cancelled",
            filters: "Filters",
            searchPlaceholder: "Template, machine, work order...",
            status: "Status",
            plant: "Plant",
            allStatuses: "All statuses",
            allPlants: "All plants",
            results: "results",
            noResults: "No execution found.",
            detail: "Details",
            customerView: "Customer view",
            manufacturerView: "Manufacturer view",
            templateFallback: "Untitled checklist",
            machineFallback: "Machine not found",
            workOrderFallback: "—",
            startedAt: "Started",
            executedAt: "Executed on",
            completedAt: "Completed on",
            template: "Template",
            machine: "Machine",
            workOrder: "Work order",
            notes: "Notes",
            answers: "Answer details",
            noAnswers: "No answer recorded.",
            ok: "OK",
            ko: "KO",
            value: "Answer value",
            accessRules: "Access rules",
            customerRule: "The end customer manages operational execution in its own context.",
            manufacturerRule: "The manufacturer can review history only for machines actively linked to its organization.",
            readonlyRule: "This page is read-only: editing remains confined to customer operational flows.",
            detailTitle: "Execution details",
            executionNotFound: "Checklist execution not found.",
            loadError: "Error loading checklist execution.",
        },
    },
    fr: {
        common: {
            loading: "Chargement...",
            back: "Retour",
            refresh: "Actualiser",
            search: "Rechercher",
            save: "Enregistrer",
            saving: "Enregistrement...",
            create: "Créer",
            edit: "Modifier",
            delete: "Supprimer",
            cancel: "Annuler",
            active: "Actif",
            inactive: "Inactif",
            yes: "Oui",
            no: "Non",
            all: "Tous",
            details: "Détail",
            noneFound: "Aucun élément trouvé.",
            loginRedirect: "Redirection en cours...",
            error: "Erreur",
        },
        legacy: {
            title: "Redirection checklist legacy",
            description: "Cette route legacy a été réalignée sur le nouveau domaine checklist/templates.",
            body: "Nous vous redirigeons automatiquement vers la nouvelle section des modèles de checklist.",
            action: "Aller maintenant",
        },
        templates: {
            title: "Modèles de checklist",
            subtitle: "Définissez les modèles opérationnels et leurs éléments de contrôle dans le contexte actif.",
            new: "Nouveau modèle",
            total: "Modèles totaux",
            active: "Modèles actifs",
            items: "Éléments totaux",
            listTitle: "Liste des modèles",
            noResults: "Aucun modèle de checklist trouvé.",
            targetMachine: "Machine",
            targetLine: "Ligne de production",
            version: "Version",
            itemCount: "éléments",
            statusActive: "Actif",
            statusInactive: "Inactif",
            editTemplate: "Modifier le modèle",
            newTemplate: "Nouveau modèle",
            editorSubtitle: "Configurez la structure, la cible et les éléments de la checklist.",
            name: "Nom du modèle",
            description: "Description",
            target: "Cible",
            enabled: "Modèle actif",
            itemsTitle: "Éléments de checklist",
            noItems: "Aucun élément pour l'instant. Ajoutez au moins un élément pour rendre le modèle opérationnel.",
            addItem: "Ajouter un élément",
            itemTitle: "Titre de l'élément",
            itemDescription: "Description de l'élément",
            inputType: "Type de saisie",
            required: "Obligatoire",
            removeItem: "Supprimer l'élément",
            saveSuccessCreate: "Modèle créé avec succès.",
            saveSuccessUpdate: "Modèle mis à jour avec succès.",
            saveError: "Erreur lors de l'enregistrement du modèle de checklist.",
            loadError: "Erreur de chargement du modèle de checklist.",
            validationName: "Le nom du modèle est obligatoire.",
            validationItem: "Chaque élément de checklist doit avoir un titre.",
            deleteConfirm: "Voulez-vous vraiment supprimer cet élément ?",
            targetHelp: "Choisissez si le modèle s'applique à une machine unique ou à une ligne de production.",
        },
        inputs: {
            boolean: "Oui / Non",
            text: "Texte",
            number: "Nombre",
            value: "Valeur",
        },
        assignments: {
            title: "Affectations checklist",
            subtitle: "Reliez les modèles de checklist aux machines du contexte actif.",
            newTitle: "Nouvelle affectation",
            newDescription: "Associez un modèle actif à une machine de votre organisation.",
            template: "Modèle",
            machine: "Machine",
            selectTemplate: "Sélectionner un modèle",
            selectMachine: "Sélectionner une machine",
            assign: "Affecter la checklist",
            assigning: "Affectation...",
            historyTitle: "Affectations actives et historiques",
            noResults: "Aucune affectation de checklist trouvée.",
            permissionDenied: "Permission refusée",
            onlyManagers: "Seuls les admins et superviseurs peuvent gérer les affectations checklist.",
            missingSelection: "Sélectionnez le modèle et la machine.",
            duplicate: "Cette checklist est déjà affectée à la machine sélectionnée.",
            assigned: "Checklist affectée avec succès.",
            assignError: "Erreur d'affectation de la checklist.",
            deactivateConfirm: "Voulez-vous vraiment désactiver cette affectation checklist ?",
            deactivated: "Affectation désactivée.",
            deactivateError: "Erreur lors de la désactivation de l'affectation.",
            openMachine: "Ouvrir la machine",
            deactivate: "Désactiver",
            activeAssignments: "Affectations actives",
            totalAssignments: "Affectations totales",
            activeOnly: "Actives seulement",
        },
        executions: {
            title: "Checklists exécutées",
            subtitleCustomer: "Historique des checklists terminées dans votre contexte opérationnel.",
            subtitleManufacturer: "Historique des checklists exécutées sur les machines liées à vos clients.",
            total: "Total",
            completed: "Terminées",
            inProgress: "En cours",
            failed: "KO / annulées",
            filters: "Filtres",
            searchPlaceholder: "Modèle, machine, ordre de travail...",
            status: "Statut",
            plant: "Usine",
            allStatuses: "Tous les statuts",
            allPlants: "Toutes les usines",
            results: "résultats",
            noResults: "Aucune exécution trouvée.",
            detail: "Détail",
            customerView: "Vue client",
            manufacturerView: "Vue constructeur",
            templateFallback: "Checklist sans titre",
            machineFallback: "Machine introuvable",
            workOrderFallback: "—",
            startedAt: "Début",
            executedAt: "Exécutée le",
            completedAt: "Terminée le",
            template: "Modèle",
            machine: "Machine",
            workOrder: "Ordre de travail",
            notes: "Notes",
            answers: "Détail des réponses",
            noAnswers: "Aucune réponse enregistrée.",
            ok: "OK",
            ko: "KO",
            value: "Valeur de réponse",
            accessRules: "Règles d'accès",
            customerRule: "Le client final gère l'exécution opérationnelle dans son propre contexte.",
            manufacturerRule: "Le constructeur peut consulter l'historique uniquement pour les machines activement liées à son organisation.",
            readonlyRule: "Cette page est en lecture seule : l'édition reste confinée aux flux opérationnels du client.",
            detailTitle: "Détail d'exécution",
            executionNotFound: "Exécution de checklist introuvable.",
            loadError: "Erreur de chargement de l'exécution de checklist.",
        },
    },
    es: {
        common: {
            loading: "Cargando...",
            back: "Atrás",
            refresh: "Actualizar",
            search: "Buscar",
            save: "Guardar",
            saving: "Guardando...",
            create: "Crear",
            edit: "Editar",
            delete: "Eliminar",
            cancel: "Cancelar",
            active: "Activo",
            inactive: "Inactivo",
            yes: "Sí",
            no: "No",
            all: "Todos",
            details: "Detalle",
            noneFound: "No se encontró ningún elemento.",
            loginRedirect: "Redirigiendo...",
            error: "Error",
        },
        legacy: {
            title: "Redirección checklist legacy",
            description: "Esta ruta legacy se ha alineado con el nuevo dominio checklist/templates.",
            body: "Te estamos redirigiendo automáticamente a la nueva sección de plantillas de checklist.",
            action: "Ir ahora",
        },
        templates: {
            title: "Plantillas de checklist",
            subtitle: "Define las plantillas operativas y sus elementos de control en el contexto activo.",
            new: "Nueva plantilla",
            total: "Plantillas totales",
            active: "Plantillas activas",
            items: "Elementos totales",
            listTitle: "Lista de plantillas",
            noResults: "No se encontró ninguna plantilla de checklist.",
            targetMachine: "Máquina",
            targetLine: "Línea de producción",
            version: "Versión",
            itemCount: "elementos",
            statusActive: "Activa",
            statusInactive: "Inactiva",
            editTemplate: "Editar plantilla",
            newTemplate: "Nueva plantilla",
            editorSubtitle: "Configura estructura, objetivo y elementos de la checklist.",
            name: "Nombre de la plantilla",
            description: "Descripción",
            target: "Objetivo",
            enabled: "Plantilla activa",
            itemsTitle: "Elementos de checklist",
            noItems: "Todavía no hay elementos. Añade al menos uno para que la plantilla sea operativa.",
            addItem: "Añadir elemento",
            itemTitle: "Título del elemento",
            itemDescription: "Descripción del elemento",
            inputType: "Tipo de entrada",
            required: "Obligatorio",
            removeItem: "Eliminar elemento",
            saveSuccessCreate: "Plantilla creada correctamente.",
            saveSuccessUpdate: "Plantilla actualizada correctamente.",
            saveError: "Error al guardar la plantilla de checklist.",
            loadError: "Error al cargar la plantilla de checklist.",
            validationName: "El nombre de la plantilla es obligatorio.",
            validationItem: "Cada elemento de la checklist debe tener un título.",
            deleteConfirm: "¿De verdad quieres eliminar este elemento?",
            targetHelp: "Elige si la plantilla se aplica a una sola máquina o a una línea de producción.",
        },
        inputs: {
            boolean: "Sí / No",
            text: "Texto",
            number: "Número",
            value: "Valor",
        },
        assignments: {
            title: "Asignaciones de checklist",
            subtitle: "Vincula plantillas de checklist a las máquinas del contexto activo.",
            newTitle: "Nueva asignación",
            newDescription: "Asocia una plantilla activa a una máquina de tu organización.",
            template: "Plantilla",
            machine: "Máquina",
            selectTemplate: "Seleccionar plantilla",
            selectMachine: "Seleccionar máquina",
            assign: "Asignar checklist",
            assigning: "Asignando...",
            historyTitle: "Asignaciones activas e históricas",
            noResults: "No se encontró ninguna asignación de checklist.",
            permissionDenied: "Permiso denegado",
            onlyManagers: "Solo admins y supervisores pueden gestionar asignaciones de checklist.",
            missingSelection: "Selecciona plantilla y máquina.",
            duplicate: "Esta checklist ya está asignada a la máquina seleccionada.",
            assigned: "Checklist asignada correctamente.",
            assignError: "Error al asignar la checklist.",
            deactivateConfirm: "¿De verdad quieres desactivar esta asignación de checklist?",
            deactivated: "Asignación desactivada.",
            deactivateError: "Error al desactivar la asignación.",
            openMachine: "Abrir máquina",
            deactivate: "Desactivar",
            activeAssignments: "Asignaciones activas",
            totalAssignments: "Asignaciones totales",
            activeOnly: "Solo activas",
        },
        executions: {
            title: "Checklists ejecutadas",
            subtitleCustomer: "Historial de checklists completadas en tu contexto operativo.",
            subtitleManufacturer: "Historial de checklists ejecutadas en máquinas vinculadas a tus clientes.",
            total: "Totales",
            completed: "Completadas",
            inProgress: "En curso",
            failed: "KO / canceladas",
            filters: "Filtros",
            searchPlaceholder: "Plantilla, máquina, orden de trabajo...",
            status: "Estado",
            plant: "Planta",
            allStatuses: "Todos los estados",
            allPlants: "Todas las plantas",
            results: "resultados",
            noResults: "No se encontró ninguna ejecución.",
            detail: "Detalle",
            customerView: "Vista cliente",
            manufacturerView: "Vista fabricante",
            templateFallback: "Checklist sin título",
            machineFallback: "Máquina no encontrada",
            workOrderFallback: "—",
            startedAt: "Inicio",
            executedAt: "Ejecutada el",
            completedAt: "Completada el",
            template: "Plantilla",
            machine: "Máquina",
            workOrder: "Orden de trabajo",
            notes: "Notas",
            answers: "Detalle de respuestas",
            noAnswers: "No hay respuestas registradas.",
            ok: "OK",
            ko: "KO",
            value: "Valor de respuesta",
            accessRules: "Reglas de acceso",
            customerRule: "El cliente final gestiona la ejecución operativa dentro de su propio contexto.",
            manufacturerRule: "El fabricante puede consultar el historial solo para máquinas vinculadas activamente a su organización.",
            readonlyRule: "Esta página es de solo lectura: la edición permanece en los flujos operativos del cliente.",
            detailTitle: "Detalle de ejecución",
            executionNotFound: "Ejecución de checklist no encontrada.",
            loadError: "Error al cargar la ejecución de checklist.",
        },
    },
};

export function getChecklistTexts(language: Language) {
    return texts[language] ?? texts.it;
}

export function formatChecklistDate(value: string | null | undefined, language: Language) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    const localeMap: Record<Language, string> = {
        it: "it-IT",
        en: "en-GB",
        fr: "fr-FR",
        es: "es-ES",
    };

    return date.toLocaleString(localeMap[language] ?? "it-IT");
}

export function canManageChecklists(role?: string | null) {
    return role === "admin" || role === "supervisor";
}

export function translateChecklistTarget(
    value: string | null | undefined,
    language: Language
) {
    const t = getChecklistTexts(language);
    return value === "production_line"
        ? t.templates.targetLine
        : t.templates.targetMachine;
}

export function translateChecklistInputType(
    value: string | null | undefined,
    language: Language
) {
    const t = getChecklistTexts(language);
    switch (value) {
        case "text":
            return t.inputs.text;
        case "number":
            return t.inputs.number;
        case "value":
            return t.inputs.value;
        default:
            return t.inputs.boolean;
    }
}

export function normalizeExecutionStatus(raw?: string | null) {
    const value = String(raw ?? "").toLowerCase();

    if (["completed", "passed", "ok"].includes(value)) return "completed";
    if (["in_progress", "open", "pending", "draft"].includes(value)) return "in_progress";
    if (["failed", "ko", "cancelled", "canceled"].includes(value)) return "failed";

    return value || "in_progress";
}
