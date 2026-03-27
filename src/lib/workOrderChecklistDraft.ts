export type ChecklistDraftValue = {
    value: string | null;
    notes: string | null;
    bool?: "yes" | "no" | "na";
};

export interface WorkOrderChecklistDraft {
    selectedAssignmentId: string | null;
    values: Record<string, ChecklistDraftValue>;
    globalNotes: string;
    updatedAt: string;
}

const PREFIX = "machina:wo-checklist-draft:";

function key(workOrderId: string) {
    return `${PREFIX}${workOrderId}`;
}

export function loadWorkOrderChecklistDraft(workOrderId: string): WorkOrderChecklistDraft | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(key(workOrderId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return {
            selectedAssignmentId:
                typeof parsed.selectedAssignmentId === "string" ? parsed.selectedAssignmentId : null,
            values: typeof parsed.values === "object" && parsed.values ? parsed.values : {},
            globalNotes: typeof parsed.globalNotes === "string" ? parsed.globalNotes : "",
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

export function saveWorkOrderChecklistDraft(
    workOrderId: string,
    draft: Omit<WorkOrderChecklistDraft, "updatedAt">
) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        key(workOrderId),
        JSON.stringify({
            ...draft,
            updatedAt: new Date().toISOString(),
        })
    );
}

export function clearWorkOrderChecklistDraft(workOrderId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key(workOrderId));
}

