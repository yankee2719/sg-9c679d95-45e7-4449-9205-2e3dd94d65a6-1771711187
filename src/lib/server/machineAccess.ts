import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export async function getAccessibleMachine<T = any>(
    supabase: SupabaseClient,
    user: ApiUser,
    machineId: string,
    selectClause = "*"
): Promise<T | null> {
    if (!user.organizationId || !user.organizationType) {
        throw new Error("No active organization context");
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select(selectClause)
        .eq("id", machineId)
        .eq("is_archived", false)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine) return null;

    let allowed = false;

    if (user.organizationType === "manufacturer") {
        allowed = (machine as any).organization_id === user.organizationId;
    } else {
        if ((machine as any).organization_id === user.organizationId) {
            allowed = true;
        } else {
            const { data: assignment, error: assignmentError } = await supabase
                .from("machine_assignments")
                .select("id")
                .eq("machine_id", machineId)
                .eq("customer_org_id", user.organizationId)
                .eq("is_active", true)
                .maybeSingle();

            if (assignmentError) throw assignmentError;
            allowed = !!assignment;
        }
    }

    if (!allowed) {
        throw new Error("Access denied");
    }

    return machine as T;
}

export function isMachineOwner(user: ApiUser, machineOrganizationId: string | null | undefined) {
    return !!user.organizationId && machineOrganizationId === user.organizationId;
}
