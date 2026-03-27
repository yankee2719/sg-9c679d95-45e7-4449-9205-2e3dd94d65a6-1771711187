export interface ChecklistDraftItemValue {
    value: string | null;
    notes: string | null;
    bool?: "yes" | "no" | "na";
}

export interface WorkOrderChecklistDraftPayload {
    values: Record<string, ChecklistDraftItemValue>;
    globalNotes: string;
    updatedAt: string;
}

function draftKey(workOrderId: string, assignmentId: string) {
    return `machina:wo-checklist-draft:${workOrderId}:${assignmentId}`;
}

export function loadWorkOrderChecklistDraft(workOrderId: string, assignmentId: string): WorkOrderChecklistDraftPayload | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(draftKey(workOrderId, assignmentId));
        if (!raw) return null;
        return JSON.parse(raw) as WorkOrderChecklistDraftPayload;
    } catch {
        return null;
    }
}

export function saveWorkOrderChecklistDraft(
    workOrderId: string,
    assignmentId: string,
    payload: Omit<WorkOrderChecklistDraftPayload, "updatedAt">
) {
    if (typeof window === "undefined") return;
    try {
        const data: WorkOrderChecklistDraftPayload = {
            ...payload,
            updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(draftKey(workOrderId, assignmentId), JSON.stringify(data));
    } catch {
        // ignore quota / private mode errors
    }
}

export function clearWorkOrderChecklistDraft(workOrderId: string, assignmentId: string) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(draftKey(workOrderId, assignmentId));
    } catch {
        // ignore
    }
}
