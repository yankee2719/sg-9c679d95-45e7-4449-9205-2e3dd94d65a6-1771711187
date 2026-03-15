import type { Language } from "@/contexts/LanguageContext";

type RedirectText = {
    title: string;
    description: string;
    body: string;
    action: string;
    loading: string;
};

type ExecuteText = {
    pageTitle: string;
    emptyExecutionTitle: string;
    backToChecklists: string;
    back: string;
    operator: string;
    operatorPlaceholder: string;
    signatureOptional: string;
    signatureReady: string;
    itemsTitle: string;
    emptyItems: string;
    boolOk: string;
    boolKo: string;
    boolNa: string;
    numberPlaceholder: string;
    numberPlaceholderWithUnit: string;
    rangeLabel: string;
    textPlaceholder: string;
    selectPlaceholder: string;
    uploadPhotos: string;
    filesSelected: string;
    itemNotesPlaceholder: string;
    incompleteTitle: string;
    incompleteDescription: string;
    completedTitle: string;
    completedDescription: string;
    createError: string;
    loadError: string;
    completeError: string;
    saving: string;
    complete: string;
    signatureTitle: string;
    saveSignature: string;
    clear: string;
    close: string;
    useSignature: string;
};

type WorkOrderExecuteText = {
    loading: string;
    notFound: string;
    backToWorkOrder: string;
    title: string;
    descriptionPrefix: string;
    assignedChecklist: string;
    selectChecklist: string;
    noAssignedChecklist: string;
    formTitle: string;
    emptyTemplate: string;
    requiredPrefix: string;
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
    savedTitle: string;
    savedDescription: string;
    save: string;
    saving: string;
    loadError: string;
    loadChecklistError: string;
    loadItemsError: string;
    unauthenticated: string;
    activeOrgMissing: string;
    workOrderMachineMissing: string;
};

type ChecklistFlowTexts = {
    redirects: {
        legacyExecution: RedirectText;
        legacyWorkOrder: RedirectText;
        reportsIndex: RedirectText;
        reportsChecklists: RedirectText;
    };
    execute: ExecuteText;
    workOrderExecute: WorkOrderExecuteText;
};

const texts: Record<Language, ChecklistFlowTexts> = {
    it: {
        redirects: {
            legacyExecution: {
                title: "Redirect esecuzione checklist",
                description: "Questo percorso legacy ora punta al dettaglio esecuzione nel nuovo dominio checklists/executions.",
                body: "Stiamo reindirizzando automaticamente al dettaglio esecuzione checklist.",
                action: "Vai ora",
                loading: "Reindirizzamento in corso...",
            },
            legacyWorkOrder: {
                title: "Redirect work order checklist",
                description: "Questo percorso legacy è stato riallineato al dettaglio work order.",
                body: "Stiamo reindirizzando automaticamente al work order, dove trovi il flusso checklist aggiornato.",
                action: "Apri work order",
                loading: "Reindirizzamento in corso...",
            },
            reportsIndex: {
                title: "Redirect report",
                description: "La sezione report legacy è stata riallineata alla dashboard analytics.",
                body: "Stiamo reindirizzando automaticamente alla sezione analytics.",
                action: "Vai ora",
                loading: "Reindirizzamento in corso...",
            },
            reportsChecklists: {
                title: "Redirect report checklist",
                description: "Il report checklist legacy ora coincide con lo storico esecuzioni checklist.",
                body: "Stiamo reindirizzando automaticamente alla lista delle checklist eseguite.",
                action: "Apri esecuzioni",
                loading: "Reindirizzamento in corso...",
            },
        },
        execute: {
            pageTitle: "Esegui checklist",
            emptyExecutionTitle: "Esecuzione non trovata",
            backToChecklists: "Torna alle checklist",
            back: "Indietro",
            operator: "Operatore",
            operatorPlaceholder: "Nome tecnico",
            signatureOptional: "Firma (opzionale)",
            signatureReady: "Firma pronta",
            itemsTitle: "Elementi",
            emptyItems: "Nessun elemento nella checklist. Aggiungi elementi al template.",
            boolOk: "OK / Conforme",
            boolKo: "KO / Non conforme",
            boolNa: "N/D",
            numberPlaceholder: "Valore",
            numberPlaceholderWithUnit: "Valore",
            rangeLabel: "Range",
            textPlaceholder: "Testo",
            selectPlaceholder: "Seleziona…",
            uploadPhotos: "Carica una o più foto",
            filesSelected: "file selezionati",
            itemNotesPlaceholder: "Note (opzionale)",
            incompleteTitle: "Checklist incompleta",
            incompleteDescription: "Compila i campi obbligatori prima di completare la checklist.",
            completedTitle: "Completata",
            completedDescription: "Checklist completata con successo.",
            createError: "Errore creazione esecuzione checklist.",
            loadError: "Errore caricamento checklist.",
            completeError: "Errore completamento checklist.",
            saving: "Salvataggio…",
            complete: "Completa",
            signatureTitle: "Firma",
            saveSignature: "Salva firma nell’esecuzione",
            clear: "Pulisci",
            close: "Chiudi",
            useSignature: "Usa firma",
        },
        workOrderExecute: {
            loading: "Caricamento...",
            notFound: "Work order non trovato.",
            backToWorkOrder: "Torna al work order",
            title: "Esegui checklist",
            descriptionPrefix: "Compilazione checklist collegata al work order:",
            assignedChecklist: "Checklist assegnata",
            selectChecklist: "Seleziona checklist",
            noAssignedChecklist: "Nessuna checklist assegnata",
            formTitle: "Compilazione",
            emptyTemplate: "Questo template non contiene ancora elementi.",
            requiredPrefix: "Completa il controllo obbligatorio:",
            selectResponse: "Seleziona risposta",
            boolYes: "Sì",
            boolNo: "No",
            boolNa: "—",
            numberPlaceholder: "Inserisci valore numerico",
            textPlaceholder: "Inserisci testo",
            genericPlaceholder: "Inserisci valore",
            itemNotes: "Note elemento",
            itemNotesPlaceholder: "Note opzionali",
            finalNotes: "Note finali",
            finalNotesPlaceholder: "Note finali sulla checklist",
            savedTitle: "OK",
            savedDescription: "Checklist salvata correttamente.",
            save: "Salva checklist",
            saving: "Salvataggio...",
            loadError: "Errore caricamento checklist",
            loadChecklistError: "Errore caricamento checklist",
            loadItemsError: "Errore caricamento elementi checklist",
            unauthenticated: "Utente non autenticato.",
            activeOrgMissing: "Organizzazione attiva non trovata nel contesto utente.",
            workOrderMachineMissing: "Il work order non ha una macchina associata.",
        },
    },
    en: {
        redirects: {
            legacyExecution: {
                title: "Checklist execution redirect",
                description: "This legacy route now points to the execution detail inside the new checklists/executions domain.",
                body: "We are automatically redirecting you to the checklist execution detail.",
                action: "Go now",
                loading: "Redirecting...",
            },
            legacyWorkOrder: {
                title: "Work order checklist redirect",
                description: "This legacy route has been aligned with the work order detail page.",
                body: "We are automatically redirecting you to the work order, where the updated checklist flow lives.",
                action: "Open work order",
                loading: "Redirecting...",
            },
            reportsIndex: {
                title: "Reports redirect",
                description: "The legacy reports section has been aligned with the analytics dashboard.",
                body: "We are automatically redirecting you to analytics.",
                action: "Go now",
                loading: "Redirecting...",
            },
            reportsChecklists: {
                title: "Checklist reports redirect",
                description: "The legacy checklist report now maps to the checklist execution history.",
                body: "We are automatically redirecting you to the checklist execution list.",
                action: "Open executions",
                loading: "Redirecting...",
            },
        },
        execute: {
            pageTitle: "Run checklist",
            emptyExecutionTitle: "Execution not found",
            backToChecklists: "Back to checklists",
            back: "Back",
            operator: "Operator",
            operatorPlaceholder: "Technician name",
            signatureOptional: "Signature (optional)",
            signatureReady: "Signature ready",
            itemsTitle: "Items",
            emptyItems: "This checklist has no items yet. Add items to the template.",
            boolOk: "OK / Compliant",
            boolKo: "KO / Not compliant",
            boolNa: "N/A",
            numberPlaceholder: "Value",
            numberPlaceholderWithUnit: "Value",
            rangeLabel: "Range",
            textPlaceholder: "Text",
            selectPlaceholder: "Select…",
            uploadPhotos: "Upload one or more photos",
            filesSelected: "selected files",
            itemNotesPlaceholder: "Notes (optional)",
            incompleteTitle: "Checklist incomplete",
            incompleteDescription: "Complete the required fields before finishing the checklist.",
            completedTitle: "Completed",
            completedDescription: "Checklist completed successfully.",
            createError: "Error creating checklist execution.",
            loadError: "Error loading checklist.",
            completeError: "Error completing checklist.",
            saving: "Saving…",
            complete: "Complete",
            signatureTitle: "Signature",
            saveSignature: "Save signature with execution",
            clear: "Clear",
            close: "Close",
            useSignature: "Use signature",
        },
        workOrderExecute: {
            loading: "Loading...",
            notFound: "Work order not found.",
            backToWorkOrder: "Back to work order",
            title: "Run checklist",
            descriptionPrefix: "Checklist execution linked to work order:",
            assignedChecklist: "Assigned checklist",
            selectChecklist: "Select checklist",
            noAssignedChecklist: "No assigned checklist",
            formTitle: "Execution",
            emptyTemplate: "This template has no items yet.",
            requiredPrefix: "Complete the required check:",
            selectResponse: "Select response",
            boolYes: "Yes",
            boolNo: "No",
            boolNa: "—",
            numberPlaceholder: "Enter numeric value",
            textPlaceholder: "Enter text",
            genericPlaceholder: "Enter value",
            itemNotes: "Item notes",
            itemNotesPlaceholder: "Optional notes",
            finalNotes: "Final notes",
            finalNotesPlaceholder: "Final checklist notes",
            savedTitle: "OK",
            savedDescription: "Checklist saved successfully.",
            save: "Save checklist",
            saving: "Saving...",
            loadError: "Error loading checklist",
            loadChecklistError: "Error loading checklist",
            loadItemsError: "Error loading checklist items",
            unauthenticated: "User is not authenticated.",
            activeOrgMissing: "No active organization found in user context.",
            workOrderMachineMissing: "The work order is not linked to a machine.",
        },
    },
    fr: {
        redirects: {
            legacyExecution: {
                title: "Redirection exécution checklist",
                description: "Cet ancien chemin pointe maintenant vers le détail d’exécution dans le nouveau domaine checklists/executions.",
                body: "Nous vous redirigeons automatiquement vers le détail d’exécution de la checklist.",
                action: "Aller maintenant",
                loading: "Redirection en cours...",
            },
            legacyWorkOrder: {
                title: "Redirection checklist ordre de travail",
                description: "Cet ancien chemin a été réaligné sur la page détail de l’ordre de travail.",
                body: "Nous vous redirigeons automatiquement vers l’ordre de travail, où se trouve le flux checklist mis à jour.",
                action: "Ouvrir l’ordre de travail",
                loading: "Redirection en cours...",
            },
            reportsIndex: {
                title: "Redirection rapports",
                description: "L’ancienne section rapports a été réalignée sur le tableau de bord analytics.",
                body: "Nous vous redirigeons automatiquement vers analytics.",
                action: "Aller maintenant",
                loading: "Redirection en cours...",
            },
            reportsChecklists: {
                title: "Redirection rapport checklist",
                description: "L’ancien rapport checklist correspond maintenant à l’historique des exécutions.",
                body: "Nous vous redirigeons automatiquement vers la liste des exécutions checklist.",
                action: "Ouvrir les exécutions",
                loading: "Redirection en cours...",
            },
        },
        execute: {
            pageTitle: "Exécuter checklist",
            emptyExecutionTitle: "Exécution introuvable",
            backToChecklists: "Retour aux checklists",
            back: "Retour",
            operator: "Opérateur",
            operatorPlaceholder: "Nom du technicien",
            signatureOptional: "Signature (optionnelle)",
            signatureReady: "Signature prête",
            itemsTitle: "Éléments",
            emptyItems: "Aucun élément dans cette checklist. Ajoutez des éléments au modèle.",
            boolOk: "OK / Conforme",
            boolKo: "KO / Non conforme",
            boolNa: "N/A",
            numberPlaceholder: "Valeur",
            numberPlaceholderWithUnit: "Valeur",
            rangeLabel: "Plage",
            textPlaceholder: "Texte",
            selectPlaceholder: "Sélectionner…",
            uploadPhotos: "Télécharger une ou plusieurs photos",
            filesSelected: "fichiers sélectionnés",
            itemNotesPlaceholder: "Notes (optionnelles)",
            incompleteTitle: "Checklist incomplète",
            incompleteDescription: "Complétez les champs obligatoires avant de terminer la checklist.",
            completedTitle: "Terminée",
            completedDescription: "Checklist terminée avec succès.",
            createError: "Erreur lors de la création de l’exécution checklist.",
            loadError: "Erreur lors du chargement de la checklist.",
            completeError: "Erreur lors de la finalisation de la checklist.",
            saving: "Enregistrement…",
            complete: "Terminer",
            signatureTitle: "Signature",
            saveSignature: "Enregistrer la signature avec l’exécution",
            clear: "Effacer",
            close: "Fermer",
            useSignature: "Utiliser la signature",
        },
        workOrderExecute: {
            loading: "Chargement...",
            notFound: "Ordre de travail introuvable.",
            backToWorkOrder: "Retour à l’ordre de travail",
            title: "Exécuter checklist",
            descriptionPrefix: "Exécution checklist liée à l’ordre de travail :",
            assignedChecklist: "Checklist assignée",
            selectChecklist: "Sélectionner checklist",
            noAssignedChecklist: "Aucune checklist assignée",
            formTitle: "Exécution",
            emptyTemplate: "Ce modèle ne contient encore aucun élément.",
            requiredPrefix: "Complétez le contrôle obligatoire :",
            selectResponse: "Sélectionner une réponse",
            boolYes: "Oui",
            boolNo: "Non",
            boolNa: "—",
            numberPlaceholder: "Saisir une valeur numérique",
            textPlaceholder: "Saisir du texte",
            genericPlaceholder: "Saisir une valeur",
            itemNotes: "Notes élément",
            itemNotesPlaceholder: "Notes optionnelles",
            finalNotes: "Notes finales",
            finalNotesPlaceholder: "Notes finales de la checklist",
            savedTitle: "OK",
            savedDescription: "Checklist enregistrée avec succès.",
            save: "Enregistrer checklist",
            saving: "Enregistrement...",
            loadError: "Erreur chargement checklist",
            loadChecklistError: "Erreur chargement checklist",
            loadItemsError: "Erreur chargement des éléments checklist",
            unauthenticated: "Utilisateur non authentifié.",
            activeOrgMissing: "Aucune organisation active trouvée dans le contexte utilisateur.",
            workOrderMachineMissing: "L’ordre de travail n’est lié à aucune machine.",
        },
    },
    es: {
        redirects: {
            legacyExecution: {
                title: "Redirección de ejecución checklist",
                description: "Esta ruta legacy ahora apunta al detalle de ejecución dentro del nuevo dominio checklists/executions.",
                body: "Te estamos redirigiendo automáticamente al detalle de ejecución de la checklist.",
                action: "Ir ahora",
                loading: "Redirigiendo...",
            },
            legacyWorkOrder: {
                title: "Redirección checklist orden de trabajo",
                description: "Esta ruta legacy se ha alineado con la página de detalle de la orden de trabajo.",
                body: "Te estamos redirigiendo automáticamente a la orden de trabajo, donde vive el flujo checklist actualizado.",
                action: "Abrir orden de trabajo",
                loading: "Redirigiendo...",
            },
            reportsIndex: {
                title: "Redirección de informes",
                description: "La sección legacy de informes se ha alineado con el panel de analytics.",
                body: "Te estamos redirigiendo automáticamente a analytics.",
                action: "Ir ahora",
                loading: "Redirigiendo...",
            },
            reportsChecklists: {
                title: "Redirección informe checklist",
                description: "El informe legacy de checklist ahora coincide con el historial de ejecuciones.",
                body: "Te estamos redirigiendo automáticamente a la lista de ejecuciones checklist.",
                action: "Abrir ejecuciones",
                loading: "Redirigiendo...",
            },
        },
        execute: {
            pageTitle: "Ejecutar checklist",
            emptyExecutionTitle: "Ejecución no encontrada",
            backToChecklists: "Volver a checklists",
            back: "Atrás",
            operator: "Operador",
            operatorPlaceholder: "Nombre del técnico",
            signatureOptional: "Firma (opcional)",
            signatureReady: "Firma lista",
            itemsTitle: "Elementos",
            emptyItems: "No hay elementos en esta checklist. Añade elementos a la plantilla.",
            boolOk: "OK / Conforme",
            boolKo: "KO / No conforme",
            boolNa: "N/A",
            numberPlaceholder: "Valor",
            numberPlaceholderWithUnit: "Valor",
            rangeLabel: "Rango",
            textPlaceholder: "Texto",
            selectPlaceholder: "Seleccionar…",
            uploadPhotos: "Sube una o más fotos",
            filesSelected: "archivos seleccionados",
            itemNotesPlaceholder: "Notas (opcionales)",
            incompleteTitle: "Checklist incompleta",
            incompleteDescription: "Completa los campos obligatorios antes de finalizar la checklist.",
            completedTitle: "Completada",
            completedDescription: "Checklist completada correctamente.",
            createError: "Error al crear la ejecución de la checklist.",
            loadError: "Error al cargar la checklist.",
            completeError: "Error al completar la checklist.",
            saving: "Guardando…",
            complete: "Completar",
            signatureTitle: "Firma",
            saveSignature: "Guardar firma en la ejecución",
            clear: "Limpiar",
            close: "Cerrar",
            useSignature: "Usar firma",
        },
        workOrderExecute: {
            loading: "Cargando...",
            notFound: "Orden de trabajo no encontrada.",
            backToWorkOrder: "Volver a la orden de trabajo",
            title: "Ejecutar checklist",
            descriptionPrefix: "Ejecución de checklist vinculada a la orden de trabajo:",
            assignedChecklist: "Checklist asignada",
            selectChecklist: "Seleccionar checklist",
            noAssignedChecklist: "No hay checklist asignada",
            formTitle: "Ejecución",
            emptyTemplate: "Esta plantilla todavía no contiene elementos.",
            requiredPrefix: "Completa el control obligatorio:",
            selectResponse: "Selecciona respuesta",
            boolYes: "Sí",
            boolNo: "No",
            boolNa: "—",
            numberPlaceholder: "Introduce un valor numérico",
            textPlaceholder: "Introduce texto",
            genericPlaceholder: "Introduce un valor",
            itemNotes: "Notas del elemento",
            itemNotesPlaceholder: "Notas opcionales",
            finalNotes: "Notas finales",
            finalNotesPlaceholder: "Notas finales de la checklist",
            savedTitle: "OK",
            savedDescription: "Checklist guardada correctamente.",
            save: "Guardar checklist",
            saving: "Guardando...",
            loadError: "Error al cargar checklist",
            loadChecklistError: "Error al cargar checklist",
            loadItemsError: "Error al cargar elementos de checklist",
            unauthenticated: "Usuario no autenticado.",
            activeOrgMissing: "No se encontró una organización activa en el contexto del usuario.",
            workOrderMachineMissing: "La orden de trabajo no tiene una máquina asociada.",
        },
    },
};

export function getChecklistFlowTexts(language: Language): ChecklistFlowTexts {
    return texts[language] ?? texts.en;
}
