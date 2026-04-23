// src/lib/pathConventions.ts
export const PATH_CONVENTIONS = {
    folders: {
        Auth: "src/components/Auth",
        Layout: "src/components/Layout",
        documents: "src/components/documents",
        organization: "src/components/organization",
        ui: "src/components/ui",
    },
    rules: [
        "Usa sempre Auth con A maiuscola.",
        "Usa sempre Layout con L maiuscola.",
        "Usa sempre documents minuscolo.",
        "Usa sempre organization minuscolo.",
        "Non mischiare mai varianti dello stesso path con maiuscole/minuscole diverse.",
    ],
} as const;

export default PATH_CONVENTIONS;
