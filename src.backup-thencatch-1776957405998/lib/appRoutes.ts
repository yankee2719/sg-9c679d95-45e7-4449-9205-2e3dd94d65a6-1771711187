// src/lib/appRoutes.ts
export const APP_ROUTES = {
    home: "/",
    login: "/login",
    dashboard: "/dashboard",

    equipment: {
        index: "/equipment",
        new: "/equipment/new",
        detail: (id: string) => `/equipment/${id}`,
        maintenance: (id: string) => `/equipment/${id}/maintenance`,
    },

    machines: {
        index: "/machines",
        new: "/machines/new",
        detail: (id: string) => `/machines/${id}`,
    },

    documents: {
        index: "/documents",
        detail: (id: string) => `/documents/${id}`,
    },

    files: {
        index: "/files",
        detail: (id: string) => `/files/${id}`,
    },

    workOrders: {
        index: "/work-orders",
        create: "/work-orders/create",
        detail: (id: string) => `/work-orders/${id}`,
        executeChecklist: (id: string) => `/work-orders/${id}/execute-checklist`,
    },

    checklists: {
        templates: "/checklists/templates",
        templateDetail: (id: string) => `/checklists/templates/${id}`,
        assignments: "/checklists/assignments",
        executions: "/checklists/executions",
        executionDetail: (id: string) => `/checklists/executions/${id}`,
    },

    maintenance: {
        index: "/maintenance",
        new: "/maintenance/new",
        detail: (id: string) => `/maintenance/${id}`,
        edit: (id: string) => `/maintenance/edit/${id}`,
    },

    compliance: {
        index: "/compliance",
        alias: "/regulatory",
    },

    analytics: {
        index: "/analytics",
        alias: "/reports",
        checklistExecutions: "/analytics/checklist-executions",
        checklistExecutionsAlias: "/reports/checklists",
    },

    plants: "/plants",
    users: "/users",
    qr: "/qr",

    settings: {
        index: "/settings",
        organization: "/settings/organization",
    },
} as const;

export default APP_ROUTES;
