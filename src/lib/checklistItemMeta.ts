export type ChecklistItemResponseType = "boolean" | "numeric" | "text";

export type ChecklistItemMeta = {
    responseType: ChecklistItemResponseType;
    allowPhoto: boolean;
};

const META_START = "<!-- MACHINA_CHECKLIST_META:";
const META_END = "-->";

export function parseChecklistItemDescription(description: string | null | undefined): {
    cleanDescription: string;
    meta: ChecklistItemMeta | null;
} {
    const raw = String(description ?? "");
    const start = raw.indexOf(META_START);
    if (start < 0) return { cleanDescription: raw.trim(), meta: null };

    const end = raw.indexOf(META_END, start);
    if (end < 0) return { cleanDescription: raw.trim(), meta: null };

    const visible = `${raw.slice(0, start)}${raw.slice(end + META_END.length)}`.trim();
    const chunk = raw.slice(start + META_START.length, end).trim();

    try {
        const parsed = JSON.parse(chunk);
        const responseType = parsed?.responseType;
        const allowPhoto = Boolean(parsed?.allowPhoto);
        if (responseType === "boolean" || responseType === "numeric" || responseType === "text") {
            return { cleanDescription: visible, meta: { responseType, allowPhoto } };
        }
    } catch {
        // ignore invalid metadata
    }

    return { cleanDescription: visible, meta: null };
}

export function inferChecklistItemMeta(input: {
    description?: string | null;
    expected_value?: string | null;
    measurement_unit?: string | null;
    min_value?: number | null;
    max_value?: number | null;
}): ChecklistItemMeta {
    const parsed = parseChecklistItemDescription(input.description);
    if (parsed.meta) return parsed.meta;

    const hasNumericHints = Boolean(
        String(input.expected_value ?? "").trim() ||
        String(input.measurement_unit ?? "").trim() ||
        input.min_value !== null ||
        input.max_value !== null,
    );

    return { responseType: hasNumericHints ? "numeric" : "boolean", allowPhoto: false };
}

export function buildChecklistItemDescription(visibleDescription: string, meta: ChecklistItemMeta): string | null {
    const description = visibleDescription.trim();
    const marker = `${META_START}${JSON.stringify(meta)}${META_END}`;
    return description ? `${description}

${marker}` : marker;
}

export function responseTypeLabel(value: ChecklistItemResponseType): string {
    switch (value) {
        case "numeric":
            return "Valore numerico";
        case "text":
            return "Testo / note";
        default:
            return "Conferma semplice";
    }
}
