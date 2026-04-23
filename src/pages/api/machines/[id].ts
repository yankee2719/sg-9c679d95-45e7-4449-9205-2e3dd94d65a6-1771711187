import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { hasMinimumRole } from "@/lib/roles";

export default withAuth(
    ALL_APP_ROLES,
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;
        const machineId = String(req.query.id || "");

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (!machineId) {
            return res.status(400).json({ error: "Missing machine id" });
        }

        try {
            const { data: machine, error: machineError } = await serviceSupabase
                .from("machines")
                .select("*")
                .eq("id", machineId)
                .maybeSingle();

            if (machineError) return res.status(500).json({ error: machineError.message });
            if (!machine) return res.status(404).json({ error: "Machine not found" });

            let allowed = false;

            if (organizationType === "manufacturer") {
                allowed = machine.organization_id === organizationId;
            } else {
                if (machine.organization_id === organizationId) {
                    allowed = true;
                } else {
                    const { data: assignment, error: assignmentError } = await serviceSupabase
                        .from("machine_assignments")
                        .select("id")
                        .eq("machine_id", machineId)
                        .eq("customer_org_id", organizationId)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (assignmentError) {
                        return res.status(500).json({ error: assignmentError.message });
                    }

                    allowed = !!assignment;
                }
            }

            if (!allowed) {
                return res.status(403).json({ error: "Access denied" });
            }

            if (req.method === "GET") {
                return res.status(200).json(machine);
            }

            if (req.method === "PUT") {
                if (!hasMinimumRole(req.user.role, "supervisor")) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                if (machine.organization_id !== organizationId) {
                    return res.status(403).json({
                        error: "Only owning organization can update machine",
                    });
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

                const endUser =
                    organizationType === "customer" || organizationType === "enterprise";

                const payload: any = {
                    name: name?.trim() || machine.name,
                    internal_code:
                        internal_code !== undefined
                            ? internal_code?.trim() || null
                            : machine.internal_code,
                    serial_number:
                        serial_number !== undefined
                            ? serial_number?.trim() || null
                            : machine.serial_number,
                    model: model !== undefined ? model?.trim() || null : machine.model,
                    brand: brand !== undefined ? brand?.trim() || null : machine.brand,
                    notes: notes !== undefined ? notes?.trim() || null : machine.notes,
                    lifecycle_state: lifecycle_state || machine.lifecycle_state,
                    plant_id:
                        endUser
                            ? plant_id !== undefined
                                ? plant_id || null
                                : machine.plant_id
                            : null,
                    production_line_id:
                        endUser
                            ? production_line_id !== undefined
                                ? production_line_id || null
                                : machine.production_line_id
                            : null,
                    updated_at: new Date().toISOString(),
                };

                const { error: updateError } = await serviceSupabase
                    .from("machines")
                    .update(payload)
                    .eq("id", machineId);

                if (updateError) return res.status(500).json({ error: updateError.message });

                // Fetch updated row separately to avoid FOR UPDATE + aggregate conflict
                const { data, error: fetchError } = await serviceSupabase
                    .from("machines")
                    .select("*")
                    .eq("id", machineId)
                    .single();

                if (fetchError) return res.status(500).json({ error: fetchError.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "machine",
                    entity_id: data.id,
                    action: "update",
                    machine_id: data.id,
                    old_data: {
                        name: machine.name,
                        lifecycle_state: machine.lifecycle_state,
                    },
                    new_data: {
                        name: data.name,
                        lifecycle_state: data.lifecycle_state,
                    },
                });

                return res.status(200).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Machine detail API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);