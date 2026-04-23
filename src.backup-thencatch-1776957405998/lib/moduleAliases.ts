// src/lib/moduleAliases.ts
export const MODULE_ALIASES = {
    documents: {
        primary: "/documents",
        aliases: ["/files"],
    },
    compliance: {
        primary: "/compliance",
        aliases: ["/regulatory"],
    },
    analytics: {
        primary: "/analytics",
        aliases: ["/reports"],
    },
    checklistExecutions: {
        primary: "/checklists/executions",
        aliases: ["/reports/checklists"],
    },
} as const;

export default MODULE_ALIASES;
