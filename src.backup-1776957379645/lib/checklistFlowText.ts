export type SupportedChecklistLanguage = "it" | "en" | "fr" | "es";

type RedirectText = {
    title: string;
    description: string;
    body: string;
    loading: string;
    action: string;
};

type ExecuteTexts = {
    pageTitle: string;
    back: string;
    backToChecklists: string;
    operator: string;
    operatorPlaceholder: string;
    itemsTitle: string;
    boolOk: string;
    boolKo: string;
    boolNa: string;
    selectPlaceholder: string;
    numberPlaceholder: string;
    numberPlaceholderWithUnit: string;
    textPlaceholder: string;
    itemNotesPlaceholder: string;
    uploadPhotos: string;
    filesSelected: string;
    signatureTitle: string;
    signatureOptional: string;
    useSignature: string;
    saveSignature: string;
    signatureReady: string;
    clear: string;
    close: string;
    complete: string;
    saving: string;
    createError: string;
    loadError: string;
    completeError: string;
    incompleteTitle: string;
    incompleteDescription: string;
    completedTitle: string;
    completedDescription: string;
    emptyExecutionTitle: string;
    emptyItems: string;
    rangeLabel: string;
};

type WorkOrderExecuteTexts = {
    title: string;
    formTitle: string;
    loading: string;
    notFound: string;
    backToWorkOrder: string;
    assignedChecklist: string;
    noAssignedChecklist: string;
    emptyTemplate: string;
    selectChecklist: string;
    descriptionPrefix: string;
    selectResponse: string;
    boolYes: string;
    boolNo: string;
    boolNa: string;
    numberPlaceholder: string;
    textPlaceholder: string;
    genericPlaceholder: string;
    itemNotes: string;
    itemNotesPlaceholder: string;
    finalNotes: string;
    finalNotesPlaceholder: string;
    requiredPrefix: string;
    save: string;
    saving: string;
    savedTitle: string;
    savedDescription: string;
    loadError: string;
    loadChecklistError: string;
    loadItemsError: string;
    activeOrgMissing: string;
    workOrderMachineMissing: string;
};

type ChecklistFlowTexts = {
    redirects: {
        legacyExecution: RedirectText;
        legacyWorkOrder: RedirectText;
        reportsIndex: RedirectText;
    };
    execute: ExecuteTexts;
    workOrderExecute: WorkOrderExecuteTexts;
};

const TEXTS: Record<SupportedChecklistLanguage, ChecklistFlowTexts> = {
    it: {
        redirects: {
            legacyExecution: {
                title: "Esecuzione checklist aggiornata",
                description: "Il vecchio percorso checklist è stato consolidato.",
                body: "Stiamo aprendo la nuova pagina esecuzioni checklist.",
                loading: "Reindirizzamento in corso...",
                action: "Apri la nuova pagina",
            },
            legacyWorkOrder: {
                title: "Checklist work order aggiornata",
                description: "Il flusso checklist legacy del work order è stato accorpato.",
                body: "Stiamo aprendo il dettaglio work order aggiornato.",
                loading: "Reindirizzamento in corso...",
                action: "Apri il work order",
            },
            reportsIndex: {
                title: "Report checklist spostati",
                description: "I report checklist sono stati convogliati nell'area analytics.",
                body: "Stiamo aprendo la dashboard analytics aggiornata.",
                loading: "Reindirizzamento in corso...",
                action: "Apri analytics",
            },
        },
        execute: {
            pageTitle: "Esecuzione checklist",
            back: "Indietro",
            backToChecklists: "Torna alle checklist",
            operator: "Operatore",
            operatorPlaceholder: "Nome tecnico",
            itemsTitle: "Elementi checklist",
            boolOk: "OK",
            boolKo: "KO",
            boolNa: "N/A",
            selectPlaceholder: "Seleziona un valore",
            numberPlaceholder: "Inserisci un valore",
            numberPlaceholderWithUnit: "Inserisci un valore",
            textPlaceholder: "Inserisci una nota",
            itemNotesPlaceholder: "Note elemento",
            uploadPhotos: "Carica foto",
            filesSelected: "file selezionati",
            signatureTitle: "Firma tecnica",
            signatureOptional: "Firma opzionale",
            useSignature: "Usa firma",
            saveSignature: "Salva firma",
            signatureReady: "Firma pronta",
            clear: "Cancella",
            close: "Chiudi",
            complete: "Completa checklist",
            saving: "Salvataggio...",
            createError: "Impossibile creare l'esecuzione checklist.",
            loadError: "Impossibile caricare l'esecuzione checklist.",
            completeError: "Impossibile completare la checklist.",
            incompleteTitle: "Checklist incompleta",
            incompleteDescription: "Compila tutti i campi obbligatori prima di chiudere.",
            completedTitle: "Checklist completata",
            completedDescription: "L'esecuzione checklist è stata salvata correttamente.",
            emptyExecutionTitle: "Esecuzione non trovata",
            emptyItems: "Nessun elemento checklist disponibile.",
            rangeLabel: "Intervallo",
        },
        workOrderExecute: {
            title: "Esegui checklist",
            formTitle: "Checklist del work order",
            loading: "Caricamento checklist...",
            notFound: "Work order non trovato",
            backToWorkOrder: "Torna al work order",
            assignedChecklist: "Checklist assegnata",
            noAssignedChecklist: "Nessuna checklist assegnata a questa macchina.",
            emptyTemplate: "Il template selezionato non contiene elementi.",
            selectChecklist: "Seleziona checklist",
            descriptionPrefix: "Descrizione",
            selectResponse: "Seleziona risposta",
            boolYes: "Sì",
            boolNo: "No",
            boolNa: "N/A",
            numberPlaceholder: "Inserisci un valore",
            textPlaceholder: "Inserisci testo",
            genericPlaceholder: "Inserisci un valore",
            itemNotes: "Note elemento",
            itemNotesPlaceholder: "Aggiungi note opzionali",
            finalNotes: "Note finali",
            finalNotesPlaceholder: "Aggiungi note finali",
            requiredPrefix: "Campo obbligatorio:",
            save: "Salva checklist",
            saving: "Salvataggio...",
            savedTitle: "Checklist salvata",
            savedDescription: "L'esecuzione checklist è stata registrata correttamente.",
            loadError: "Errore durante il caricamento della checklist.",
            loadChecklistError: "Errore caricamento checklist assegnata.",
            loadItemsError: "Errore caricamento elementi checklist.",
            activeOrgMissing: "Nessuna organizzazione attiva selezionata.",
            workOrderMachineMissing: "Il work order non è collegato a una macchina.",
        },
    },
    en: {
        redirects: {
            legacyExecution: {
                title: "Checklist execution updated",
                description: "The legacy checklist route has been consolidated.",
                body: "Opening the new checklist execution page.",
                loading: "Redirecting...",
                action: "Open the new page",
            },
            legacyWorkOrder: {
                title: "Work order checklist updated",
                description: "The legacy work order checklist flow has been merged.",
                body: "Opening the updated work order detail page.",
                loading: "Redirecting...",
                action: "Open work order",
            },
            reportsIndex: {
                title: "Checklist reports moved",
                description: "Checklist reports now live in analytics.",
                body: "Opening the updated analytics dashboard.",
                loading: "Redirecting...",
                action: "Open analytics",
            },
        },
        execute: {
            pageTitle: "Checklist execution",
            back: "Back",
            backToChecklists: "Back to checklists",
            operator: "Operator",
            operatorPlaceholder: "Technician name",
            itemsTitle: "Checklist items",
            boolOk: "OK",
            boolKo: "Not OK",
            boolNa: "N/A",
            selectPlaceholder: "Select a value",
            numberPlaceholder: "Enter a value",
            numberPlaceholderWithUnit: "Enter a value",
            textPlaceholder: "Enter notes",
            itemNotesPlaceholder: "Item notes",
            uploadPhotos: "Upload photos",
            filesSelected: "files selected",
            signatureTitle: "Technician signature",
            signatureOptional: "Optional signature",
            useSignature: "Use signature",
            saveSignature: "Save signature",
            signatureReady: "Signature ready",
            clear: "Clear",
            close: "Close",
            complete: "Complete checklist",
            saving: "Saving...",
            createError: "Unable to create checklist execution.",
            loadError: "Unable to load checklist execution.",
            completeError: "Unable to complete checklist.",
            incompleteTitle: "Checklist incomplete",
            incompleteDescription: "Fill in all required fields before closing.",
            completedTitle: "Checklist completed",
            completedDescription: "The checklist execution has been saved.",
            emptyExecutionTitle: "Execution not found",
            emptyItems: "No checklist items available.",
            rangeLabel: "Range",
        },
        workOrderExecute: {
            title: "Execute checklist",
            formTitle: "Work order checklist",
            loading: "Loading checklist...",
            notFound: "Work order not found",
            backToWorkOrder: "Back to work order",
            assignedChecklist: "Assigned checklist",
            noAssignedChecklist: "No checklist assigned to this machine.",
            emptyTemplate: "The selected template has no items.",
            selectChecklist: "Select checklist",
            descriptionPrefix: "Description",
            selectResponse: "Select response",
            boolYes: "Yes",
            boolNo: "No",
            boolNa: "N/A",
            numberPlaceholder: "Enter a value",
            textPlaceholder: "Enter text",
            genericPlaceholder: "Enter a value",
            itemNotes: "Item notes",
            itemNotesPlaceholder: "Add optional notes",
            finalNotes: "Final notes",
            finalNotesPlaceholder: "Add final notes",
            requiredPrefix: "Required field:",
            save: "Save checklist",
            saving: "Saving...",
            savedTitle: "Checklist saved",
            savedDescription: "The checklist execution has been recorded.",
            loadError: "Error while loading checklist.",
            loadChecklistError: "Error while loading assigned checklist.",
            loadItemsError: "Error while loading checklist items.",
            activeOrgMissing: "No active organization selected.",
            workOrderMachineMissing: "The work order is not linked to a machine.",
        },
    },
    fr: {
        redirects: {
            legacyExecution: {
                title: "Exécution de checklist mise à jour",
                description: "L'ancien parcours checklist a été consolidé.",
                body: "Ouverture de la nouvelle page d'exécution checklist.",
                loading: "Redirection en cours...",
                action: "Ouvrir la nouvelle page",
            },
            legacyWorkOrder: {
                title: "Checklist d'ordre de travail mise à jour",
                description: "L'ancien flux checklist de l'ordre de travail a été fusionné.",
                body: "Ouverture de la page détail ordre de travail mise à jour.",
                loading: "Redirection en cours...",
                action: "Ouvrir l'ordre de travail",
            },
            reportsIndex: {
                title: "Rapports checklist déplacés",
                description: "Les rapports checklist sont désormais dans analytics.",
                body: "Ouverture du tableau analytics mis à jour.",
                loading: "Redirection en cours...",
                action: "Ouvrir analytics",
            },
        },
        execute: {
            pageTitle: "Exécution checklist",
            back: "Retour",
            backToChecklists: "Retour aux checklists",
            operator: "Opérateur",
            operatorPlaceholder: "Nom du technicien",
            itemsTitle: "Éléments de checklist",
            boolOk: "OK",
            boolKo: "KO",
            boolNa: "N/A",
            selectPlaceholder: "Sélectionnez une valeur",
            numberPlaceholder: "Saisissez une valeur",
            numberPlaceholderWithUnit: "Saisissez une valeur",
            textPlaceholder: "Saisissez des notes",
            itemNotesPlaceholder: "Notes de l'élément",
            uploadPhotos: "Téléverser des photos",
            filesSelected: "fichiers sélectionnés",
            signatureTitle: "Signature du technicien",
            signatureOptional: "Signature facultative",
            useSignature: "Utiliser la signature",
            saveSignature: "Enregistrer la signature",
            signatureReady: "Signature prête",
            clear: "Effacer",
            close: "Fermer",
            complete: "Terminer la checklist",
            saving: "Enregistrement...",
            createError: "Impossible de créer l'exécution checklist.",
            loadError: "Impossible de charger l'exécution checklist.",
            completeError: "Impossible de terminer la checklist.",
            incompleteTitle: "Checklist incomplète",
            incompleteDescription: "Renseignez tous les champs obligatoires avant de fermer.",
            completedTitle: "Checklist terminée",
            completedDescription: "L'exécution checklist a bien été enregistrée.",
            emptyExecutionTitle: "Exécution introuvable",
            emptyItems: "Aucun élément checklist disponible.",
            rangeLabel: "Plage",
        },
        workOrderExecute: {
            title: "Exécuter la checklist",
            formTitle: "Checklist de l'ordre de travail",
            loading: "Chargement de la checklist...",
            notFound: "Ordre de travail introuvable",
            backToWorkOrder: "Retour à l'ordre de travail",
            assignedChecklist: "Checklist assignée",
            noAssignedChecklist: "Aucune checklist assignée à cette machine.",
            emptyTemplate: "Le modèle sélectionné ne contient aucun élément.",
            selectChecklist: "Sélectionner une checklist",
            descriptionPrefix: "Description",
            selectResponse: "Sélectionner une réponse",
            boolYes: "Oui",
            boolNo: "Non",
            boolNa: "N/A",
            numberPlaceholder: "Saisissez une valeur",
            textPlaceholder: "Saisissez du texte",
            genericPlaceholder: "Saisissez une valeur",
            itemNotes: "Notes de l'élément",
            itemNotesPlaceholder: "Ajouter des notes facultatives",
            finalNotes: "Notes finales",
            finalNotesPlaceholder: "Ajouter des notes finales",
            requiredPrefix: "Champ obligatoire :",
            save: "Enregistrer la checklist",
            saving: "Enregistrement...",
            savedTitle: "Checklist enregistrée",
            savedDescription: "L'exécution checklist a bien été enregistrée.",
            loadError: "Erreur lors du chargement de la checklist.",
            loadChecklistError: "Erreur lors du chargement de la checklist assignée.",
            loadItemsError: "Erreur lors du chargement des éléments checklist.",
            activeOrgMissing: "Aucune organisation active sélectionnée.",
            workOrderMachineMissing: "L'ordre de travail n'est pas lié à une machine.",
        },
    },
    es: {
        redirects: {
            legacyExecution: {
                title: "Ejecución de checklist actualizada",
                description: "La ruta antigua de checklist ha sido consolidada.",
                body: "Abriendo la nueva página de ejecución de checklist.",
                loading: "Redirigiendo...",
                action: "Abrir la nueva página",
            },
            legacyWorkOrder: {
                title: "Checklist de orden de trabajo actualizada",
                description: "El flujo antiguo de checklist de la orden de trabajo se ha unificado.",
                body: "Abriendo la página actualizada del detalle de la orden de trabajo.",
                loading: "Redirigiendo...",
                action: "Abrir orden de trabajo",
            },
            reportsIndex: {
                title: "Reportes de checklist movidos",
                description: "Los reportes de checklist ahora viven en analytics.",
                body: "Abriendo el panel de analytics actualizado.",
                loading: "Redirigiendo...",
                action: "Abrir analytics",
            },
        },
        execute: {
            pageTitle: "Ejecución de checklist",
            back: "Volver",
            backToChecklists: "Volver a checklists",
            operator: "Operador",
            operatorPlaceholder: "Nombre del técnico",
            itemsTitle: "Elementos de checklist",
            boolOk: "OK",
            boolKo: "KO",
            boolNa: "N/A",
            selectPlaceholder: "Selecciona un valor",
            numberPlaceholder: "Introduce un valor",
            numberPlaceholderWithUnit: "Introduce un valor",
            textPlaceholder: "Introduce notas",
            itemNotesPlaceholder: "Notas del elemento",
            uploadPhotos: "Subir fotos",
            filesSelected: "archivos seleccionados",
            signatureTitle: "Firma del técnico",
            signatureOptional: "Firma opcional",
            useSignature: "Usar firma",
            saveSignature: "Guardar firma",
            signatureReady: "Firma lista",
            clear: "Borrar",
            close: "Cerrar",
            complete: "Completar checklist",
            saving: "Guardando...",
            createError: "No se puede crear la ejecución de checklist.",
            loadError: "No se puede cargar la ejecución de checklist.",
            completeError: "No se puede completar la checklist.",
            incompleteTitle: "Checklist incompleta",
            incompleteDescription: "Completa todos los campos obligatorios antes de cerrar.",
            completedTitle: "Checklist completada",
            completedDescription: "La ejecución de checklist se ha guardado correctamente.",
            emptyExecutionTitle: "Ejecución no encontrada",
            emptyItems: "No hay elementos de checklist disponibles.",
            rangeLabel: "Rango",
        },
        workOrderExecute: {
            title: "Ejecutar checklist",
            formTitle: "Checklist de la orden de trabajo",
            loading: "Cargando checklist...",
            notFound: "Orden de trabajo no encontrada",
            backToWorkOrder: "Volver a la orden de trabajo",
            assignedChecklist: "Checklist asignada",
            noAssignedChecklist: "No hay checklist asignada a esta máquina.",
            emptyTemplate: "La plantilla seleccionada no contiene elementos.",
            selectChecklist: "Seleccionar checklist",
            descriptionPrefix: "Descripción",
            selectResponse: "Seleccionar respuesta",
            boolYes: "Sí",
            boolNo: "No",
            boolNa: "N/A",
            numberPlaceholder: "Introduce un valor",
            textPlaceholder: "Introduce texto",
            genericPlaceholder: "Introduce un valor",
            itemNotes: "Notas del elemento",
            itemNotesPlaceholder: "Añade notas opcionales",
            finalNotes: "Notas finales",
            finalNotesPlaceholder: "Añade notas finales",
            requiredPrefix: "Campo obligatorio:",
            save: "Guardar checklist",
            saving: "Guardando...",
            savedTitle: "Checklist guardada",
            savedDescription: "La ejecución de checklist se ha registrado correctamente.",
            loadError: "Error al cargar la checklist.",
            loadChecklistError: "Error al cargar la checklist asignada.",
            loadItemsError: "Error al cargar los elementos de la checklist.",
            activeOrgMissing: "No hay una organización activa seleccionada.",
            workOrderMachineMissing: "La orden de trabajo no está vinculada a una máquina.",
        },
    },
};

export function getChecklistFlowTexts(language?: string): ChecklistFlowTexts {
    const normalized = (language || "en").toLowerCase();
    if (normalized.startsWith("it")) return TEXTS.it;
    if (normalized.startsWith("fr")) return TEXTS.fr;
    if (normalized.startsWith("es")) return TEXTS.es;
    return TEXTS.en;
}

