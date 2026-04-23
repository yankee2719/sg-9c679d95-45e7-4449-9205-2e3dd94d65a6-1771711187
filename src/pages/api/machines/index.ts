import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { hasMinimumRole } from "@/lib/roles";

// End-user orgs (customer, enterprise) organise their machines by plant and
// production line. Manufacturers don't use plant_id / production_line_id on
// their own catalogue entries.
function isEndUserOrg(orgType: string | null | undefined) {
    return orgType === "customer" || orgType === "enterprise";
}

export default withAuth(
    ALL_APP_ROLES,
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        try {
            if (req.method === "GET") {
                if (organizationType === "manufacturer") {
                    const { data, error } = await serviceSupabase
                        .from("machines")
                        .select(`
                            id,
                            name,
                            internal_code,
                            serial_number,
                            model,
                            brand,
                            notes,
                            lifecycle_state,
                            organization_id,
                            plant_id,
                            production_line_id,
                            is_archived,
                            is_deleted,
                            photo_url,
                            created_at,
                            updated_at
                        `)
                        .eq("organization_id", organizationId)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false")
                        .order("created_at", { ascending: false });

                    if (error) return res.status(500).json({ error: error.message });
                    return res.status(200).json(data ?? []);
                }

                // customer + enterprise: own machines plus any machines assigned to
                // this org as a customer. Enterprise will normally have 0 assignments
                // but the query is harmless and keeps paths unified.
                const { data: ownMachines, error: ownError } = await serviceSupabase
                    .from("machines")
                    .select(`
                        id,
                        name,
                        internal_code,
                        serial_number,
                        model,
                        brand,
                        notes,
                        lifecycle_state,
                        organization_id,
                        plant_id,
                        production_line_id,
                        is_archived,
                        is_deleted,
                        photo_url,
                        created_at,
                        updated_at
                    `)
                    .eq("organization_id", organizationId)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false");

                if (ownError) return res.status(500).json({ error: ownError.message });

                const { data: assignments, error: assignmentsError } = await serviceSupabase
                    .from("machine_assignments")
                    .select("machine_id")
                    .eq("customer_org_id", organizationId)
                    .eq("is_active", true);

                if (assignmentsError) {
                    return res.status(500).json({ error: assignmentsError.message });
                }

                const assignedIds = Array.from(
                    new Set((assignments ?? []).map((row: any) => row.machine_id).filter(Boolean))
                );

                let assignedMachines: any[] = [];
                if (assignedIds.length > 0) {
                    const { data, error } = await serviceSupabase
                        .from("machines")
                        .select(`
                            id,
                            name,
                            internal_code,
                            serial_number,
                            model,
                            brand,
                            notes,
                            lifecycle_state,
                            organization_id,
                            plant_id,
                            production_line_id,
                            is_archived,
                            is_deleted,
                            photo_url,
                            created_at,
                            updated_at
                        `)
                        .in("id", assignedIds)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false");

                    if (error) return res.status(500).json({ error: error.message });
                    assignedMachines = data ?? [];
                }

                const merged = new Map < string, any> ();
                for (const row of ownMachines ?? []) merged.set(row.id, row);
                for (const row of assignedMachines) merged.set(row.id, row);

                return res.status(200).json(Array.from(merged.values()));
            }

            if (req.method === "POST") {
                if (!hasMinimumRole(req.user.role, "supervisor")) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const {
                    name,
                    internal_code,
                    serial_number,
                    model,
                    brand,
                    notes,
                    lifecycle_state,
                    plant_id,
                    production_line_id,
                } = req.body ?? {};

                if (!name?.trim()) {
                    return res.status(400).json({ error: "Machine name is required" });
                }

                const endUser = isEndUserOrg(organizationType);

                const payload: any = {
                    organization_id: organizationId,
                    name: name.trim(),
                    internal_code: internal_code?.trim() || null,
                    serial_number: serial_number?.trim() || null,
                    model: model?.trim() || null,
                    brand: brand?.trim() || null,
                    notes: notes?.trim() || null,
                    lifecycle_state: lifecycle_state || "active",
                    // End-user orgs (customer/enterprise) structure their fleet by
                    // plant + production line. Manufacturers don't.
                    plant_id: endUser ? plant_id || null : null,
                    production_line_id: endUser ? production_line_id || null : null,
                };

                const { data, error } = await serviceSupabase
                    .from("machines")
                    .insert(payload)
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "machine",
                    entity_id: data.id,
                    action: "create",
                    machine_id: data.id,
                    new_data: {
                        name: data.name,
                        internal_code: data.internal_code,
                        lifecycle_state: data.lifecycle_state,
                    },
                });

                return res.status(201).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Machines API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
