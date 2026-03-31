export type ChecklistItemResponseType = "boolean" | "numeric" | "text";

export type ChecklistItemMeta = {
  responseType: ChecklistItemResponseType;
  allowPhoto: boolean;
};

const META_START = "<!-- MACHINA_CHECKLIST_META:";
const META_END = "-->";

const DEFAULT_META: ChecklistItemMeta = {
  responseType: "boolean",
  allowPhoto: false,
};

export function inferChecklistItemMeta(input: {
  description?: string | null;
  expected_value?: string | null;
  measurement_unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
}): ChecklistItemMeta {
  const parsed = parseChecklistItemDescription(input.description ?? null);
  if (parsed.meta) return parsed.meta;

  const hasNumericHints = Boolean(
    (input.expected_value ?? "").trim() ||
      (input.measurement_unit ?? "").trim() ||
      input.min_value !== null ||
      input.max_value !== null,
  );

  return {
    responseType: hasNumericHints ? "numeric" : "boolean",
    allowPhoto: false,
  };
}

export function parseChecklistItemDescription(description: string | null | undefined): {
  cleanDescription: string;
  meta: ChecklistItemMeta | null;
} {
  const raw = String(description ?? "");
  const start = raw.indexOf(META_START);
  if (start < 0) {
    return { cleanDescription: raw.trim(), meta: null };
  }

  const end = raw.indexOf(META_END, start);
  if (end < 0) {
    return { cleanDescription: raw.trim(), meta: null };
  }

  const jsonChunk = raw.slice(start + META_START.length, end).trim();
  const visible = `${raw.slice(0, start)}${raw.slice(end + META_END.length)}`.trim();

  try {
    const parsed = JSON.parse(jsonChunk);
    const responseType = parsed?.responseType;
    const allowPhoto = Boolean(parsed?.allowPhoto);
    if (responseType === "boolean" || responseType === "numeric" || responseType === "text") {
      return {
        cleanDescription: visible,
        meta: { responseType, allowPhoto },
      };
    }
  } catch {
    // ignore invalid metadata
  }

  return { cleanDescription: visible, meta: null };
}

export function buildChecklistItemDescription(visibleDescription: string, meta: ChecklistItemMeta): string | null {
  const description = visibleDescription.trim();
  const payload = JSON.stringify({ responseType: meta.responseType, allowPhoto: meta.allowPhoto });
  const marker = `${META_START}${payload}${META_END}`;
  const combined = description ? `${description}\n\n${marker}` : marker;
  return combined;
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
