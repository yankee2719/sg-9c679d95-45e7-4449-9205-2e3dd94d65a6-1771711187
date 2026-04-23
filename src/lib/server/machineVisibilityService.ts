import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export interface MachineVisibilityResult {
    machine: any | null;
    assignments: Array<{
        manufacturer_org_id: string | null;
        customer_org_id: string | null;
        is_active: boolean;
    }>;
    isOwner: boolean;
    isAssignedCustomer: boolean;
    isAssignedManufacturer: boolean;
    canView: boolean;
    canEditOperationalData: boolean;
    canManageManufacturerData: boolean;
    canArchive: boolean;
}

function normalizeManagerRole(role: string | null | undefined) {
    const raw = String(role ?? "").trim().toLowerCase();
    if (raw === "owner") return "admin";
    if (raw === "plant_manager") return "supervisor";
    if (raw === "viewer" || raw === "operator") return "technician";
    return raw;
}

// "End-user" organizations: those that own operational context (plants, lines,
// maintenance) over their own machines. Includes both `customer` (machines
// assigned by a manufacturer) and `enterprise` (owns its own machines entirely).
function isEndUserOrg(orgType: string | null | undefined) {
    return orgType === "customer" || orgType === "enterprise";
}

export async function getMachineVisibilityForUser(
    supabase: SupabaseClient,
    user: ApiUser,
    machineId: string
): Promise<MachineVisibilityResult | null> {
    if (!machineId || !user.organizationId || !user.organizationType) {
        return null;
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, organization_id, is_archived, name, internal_code, lifecycle_state")
        .eq("id", machineId)
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine) return null;

    const { data: assignments, error: assignmentsError } = await supabase
        .from("machine_assignments")
        .select("manufacturer_org_id, customer_org_id, is_active")
        .eq("machine_id", machineId)
        .eq("is_active", true);

    if (assignmentsError) throw assignmentsError;

    const activeAssignments = (assignments ?? []) as Array<{
        manufacturer_org_id: string | null;
        customer_org_id: string | null;
        is_active: boolean;
    }>;

    const isOwner = (machine as any).organization_id === user.organizationId;
    const isAssignedCustomer = activeAssignments.some(
        (assignment) => assignment.customer_org_id === user.organizationId
    );
    const isAssignedManufacturer = activeAssignments.some(
        (assignment) => assignment.manufacturer_org_id === user.organizationId
    );

    const canView =
        user.isPlatformAdmin || isOwner || isAssignedCustomer || isAssignedManufacturer;

    const normalizedRole = normalizeManagerRole(user.role);
    const isOperationalManager = normalizedRole === "admin" || normalizedRole === "supervisor";

    // End-user orgs (customer OR enterprise) can edit operational data on their
    // own machines. Enterprise owns its machines outright; customer manages the
    // operational context of machines assigned to them.
    const canEditOperationalData =
        isEndUserOrg(user.organizationType) &&
        isOwner &&
        (isOperationalManager || normalizedRole === "technician");

    const canManageManufacturerData =
        user.organizationType === "manufacturer" &&
        (isOwner || isAssignedManufacturer) &&
        isOperationalManager;

    const canArchive =
        isOperationalManager &&
        isOwner &&
        !activeAssignments.some((assignment) => !!assignment.customer_org_id);

    return {
        machine,
        assignments: activeAssignments,
        isOwner,
        isAssignedCustomer,
        isAssignedManufacturer,
        canView,
        canEditOperationalData,
        canManageManufacturerData,
        canArchive,
    };
}
