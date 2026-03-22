import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || organizationType !== "manufacturer") {
            return res.status(403).json({ error: "Only manufacturer organizations can manage assignments" });
        }

        try {
            // POST: Create assignment
            if (req.method === "POST") {
                const { machine_id, customer_org_id } = req.body ?? {};

                if (!machine_id || !customer_org_id) {
                    return res.status(400).json({ error: "machine_id and customer_org_id are required" });
                }

                // Verify machine belongs to this manufacturer
                const { data: machine, error: machineError } = await serviceSupabase
                    .from("machines")
                    .select("id, organization_id")
                    .eq("id", machine_id)
                    .eq("organization_id", organizationId)
                    .maybeSingle();

                if (machineError) return res.status(500).json({ error: machineError.message });
                if (!machine) return res.status(404).json({ error: "Machine not found or not owned by this organization" });

                // Verify customer belongs to this manufacturer
                const { data: customer, error: customerError } = await serviceSupabase
                    .from("organizations")
                    .select("id, name")
                    .eq("id", customer_org_id)
                    .eq("manufacturer_org_id", organizationId)
                    .eq("type", "customer")
                    .maybeSingle();

                if (customerError) return res.status(500).json({ error: customerError.message });
                if (!customer) return res.status(404).json({ error: "Customer not found or not linked to this manufacturer" });

                // Check if active assignment already exists
                const { data: existing } = await serviceSupabase
                    .from("machine_assignments")
                    .select("id")
                    .eq("machine_id", machine_id)
                    .eq("customer_org_id", customer_org_id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (existing) {
                    return res.status(409).json({ error: "This machine is already assigned to this customer" });
                }

                const { data, error } = await serviceSupabase
                    .from("machine_assignments")
                    .insert({
                        machine_id,
                        customer_org_id,
                        manufacturer_org_id: organizationId,
                        assigned_by: req.user.userId,
                        assigned_at: new Date().toISOString(),
                        is_active: true,
                    })
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                // Audit log
                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "machine_assignment",
                    entity_id: data.id,
                    action: "create",
                    machine_id,
                    new_data: {
                        machine_id,
                        customer_org_id,
                        customer_name: customer.name,
                    },
                });

                return res.status(201).json(data);
            }

            // DELETE: Deactivate assignment
            if (req.method === "DELETE") {
                const { assignment_id } = req.body ?? {};

                if (!assignment_id) {
                    return res.status(400).json({ error: "assignment_id is required" });
                }

                const { data: assignment, error: fetchError } = await serviceSupabase
                    .from("machine_assignments")
                    .select("id, machine_id, customer_org_id, manufacturer_org_id")
                    .eq("id", assignment_id)
                    .eq("manufacturer_org_id", organizationId)
                    .eq("is_active", true)
                    .maybeSingle();

                if (fetchError) return res.status(500).json({ error: fetchError.message });
                if (!assignment) return res.status(404).json({ error: "Assignment not found" });

                const { error: updateError } = await serviceSupabase
                    .from("machine_assignments")
                    .update({ is_active: false })
                    .eq("id", assignment_id);

                if (updateError) return res.status(500).json({ error: updateError.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "machine_assignment",
                    entity_id: assignment_id,
                    action: "delete",
                    machine_id: assignment.machine_id,
                });

                return res.status(200).json({ success: true });
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Assignments API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
