import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

type OrgType = "manufacturer" | "enterprise" | "customer" | null;

type OrgTypeResult = {
    orgType: OrgType;
    isManufacturer: boolean;
    isEnterprise: boolean;
    isCustomer: boolean;
    role: string | null;
    plantLabel: string;
    plantsLabel: string;
    machineContextLabel: string;
    checklistsLabel: string;
    maintenanceLabel: string;
    orgTypeLabel: string;
    canExecuteChecklist: boolean;
    canCreateMachine: boolean;
    canManageMaintenance: boolean;
};

function normalizeOrgType(value: unknown): OrgType {
    const raw = String(value ?? "").toLowerCase();
    if (raw === "manufacturer") return "manufacturer";
    if (raw === "enterprise") return "enterprise";
    if (raw === "customer") return "customer";
    return null;
}

export function useOrgType(): OrgTypeResult {
    const { organization, membership } = useAuth();

    return useMemo(() => {
        const orgType = normalizeOrgType(organization?.type);
        const role = membership?.role ?? null;
        const isManufacturer = orgType === "manufacturer";
        const isCustomer = orgType === "customer";
        const isEnterprise = orgType === "enterprise" || isCustomer;
        const plantLabel = isManufacturer ? "Cliente" : "Stabilimento";
        const plantsLabel = isManufacturer ? "Clienti" : "Stabilimenti";
        const machineContextLabel = isManufacturer ? "Cliente → Macchina" : "Stabilimento → Macchina";
        const checklistsLabel = isManufacturer ? "Template checklist" : "Checklist";
        const maintenanceLabel = isManufacturer ? "Piani di manutenzione" : "Manutenzione";
        const orgTypeLabel = isManufacturer ? "Costruttore" : isCustomer ? "Cliente" : isEnterprise ? "Impresa" : "Organizzazione";
        const canExecuteChecklist = !isManufacturer && ["admin", "supervisor", "technician"].includes(role ?? "");
        const canCreateMachine = isManufacturer && ["admin", "supervisor"].includes(role ?? "");
        const canManageMaintenance = ["admin", "supervisor"].includes(role ?? "");

        return {
            orgType,
            isManufacturer,
            isEnterprise,
            isCustomer,
            role,
            plantLabel,
            plantsLabel,
            machineContextLabel,
            checklistsLabel,
            maintenanceLabel,
            orgTypeLabel,
            canExecuteChecklist,
            canCreateMachine,
            canManageMaintenance,
        };
    }, [membership?.role, organization?.type]);
}

export default useOrgType;

