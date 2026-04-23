import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

type OrgType = "manufacturer" | "enterprise" | "customer" | null;

type OrgTypeResult = {
    orgType: OrgType;
    isManufacturer: boolean;
    isEnterprise: boolean;
    isCustomer: boolean;
    /**
     * True for `customer` OR `enterprise`. End-user organizations: those that
     * organise their machines by plant + production line and execute
     * maintenance / checklists.
     */
    isEndUser: boolean;
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
    canManagePlants: boolean;
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
        const isEnterprise = orgType === "enterprise";
        // End-user orgs (customer OR enterprise): manage operational context
        // (plants, lines, maintenance) on their own machines.
        const isEndUser = isCustomer || isEnterprise;

        const plantLabel = isManufacturer ? "Cliente" : "Stabilimento";
        const plantsLabel = isManufacturer ? "Clienti" : "Stabilimenti";
        const machineContextLabel = isManufacturer ? "Cliente → Macchina" : "Stabilimento → Macchina";
        const checklistsLabel = isManufacturer ? "Template checklist" : "Checklist";
        const maintenanceLabel = isManufacturer ? "Piani di manutenzione" : "Manutenzione";
        const orgTypeLabel = isManufacturer
            ? "Costruttore"
            : isCustomer
                ? "Cliente"
                : isEnterprise
                    ? "Impresa"
                    : "Organizzazione";

        const canExecuteChecklist =
            isEndUser && ["admin", "supervisor", "technician"].includes(role ?? "");

        // Manufacturer creates its catalogue, enterprise creates its own fleet.
        // Customer cannot create — receives assignments from a manufacturer.
        const canCreateMachine =
            (isManufacturer || isEnterprise) && ["admin", "supervisor"].includes(role ?? "");

        const canManageMaintenance =
            isEndUser && ["admin", "supervisor"].includes(role ?? "");

        // Plants/lines exist only for end-user orgs.
        const canManagePlants =
            isEndUser && ["admin", "supervisor"].includes(role ?? "");

        return {
            orgType,
            isManufacturer,
            isEnterprise,
            isCustomer,
            isEndUser,
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
            canManagePlants,
        };
    }, [membership?.role, organization?.type]);
}

export default useOrgType;
