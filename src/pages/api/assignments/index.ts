import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function buildAssignmentsList(serviceSupabase: ReturnType<typeof getServiceSupabase>, organizationId: string) {
  const { data: assignments, error } = await serviceSupabase
    .from("machine_assignments")
    .select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active")
    .eq("manufacturer_org_id", organizationId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });
  if (error) throw error;

  const rows = assignments ?? [];
  const machineIds = Array.from(new Set(rows.map((r: any) => r.machine_id).filter(Boolean)));
  const customerIds = Array.from(new Set(rows.map((r: any) => r.customer_org_id).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((r: any) => r.assigned_by).filter(Boolean)));

  const [machinesRes, customersRes, usersRes] = await Promise.all([
    machineIds.length ? serviceSupabase.from("machines").select("id, name, internal_code, serial_number, model, brand").in("id", machineIds) : Promise.resolve({ data: [] as any[], error: null }),
    customerIds.length ? serviceSupabase.from("organizations").select("id, name, city, email").in("id", customerIds) : Promise.resolve({ data: [] as any[], error: null }),
    userIds.length ? serviceSupabase.from("profiles").select("id, display_name, first_name, last_name, email").in("id", userIds) : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (machinesRes.error) throw machinesRes.error;
  if (customersRes.error) throw customersRes.error;
  if (usersRes.error) throw usersRes.error;

  const machineMap = new Map((machinesRes.data ?? []).map((row: any) => [row.id, row]));
  const customerMap = new Map((customersRes.data ?? []).map((row: any) => [row.id, row]));
  const userMap = new Map((usersRes.data ?? []).map((row: any) => [row.id, row]));

  return rows.map((row: any) => ({
    ...row,
    machine: machineMap.get(row.machine_id) ?? null,
    customer: customerMap.get(row.customer_org_id) ?? null,
    assigned_user: userMap.get(row.assigned_by) ?? null,
  }));
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const serviceSupabase = getServiceSupabase();
  const organizationId = req.user.organizationId;
  const organizationType = req.user.organizationType;
  if (!organizationId || organizationType !== "manufacturer") {
    return res.status(403).json({ error: "Only manufacturer organizations can manage assignments" });
  }

  try {
    if (req.method === "GET") {
      if (String(req.query.options || "") === "1") {
        const [machinesRes, customersRes] = await Promise.all([
          serviceSupabase.from("machines").select("id, name, internal_code, serial_number, model, brand").eq("organization_id", organizationId).eq("is_archived", false).or("is_deleted.is.null,is_deleted.eq.false").order("name"),
          serviceSupabase.from("organizations").select("id, name, city, email").eq("manufacturer_org_id", organizationId).eq("type", "customer").or("is_deleted.is.null,is_deleted.eq.false").order("name"),
        ]);
        if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });
        if (customersRes.error) return res.status(500).json({ error: customersRes.error.message });
        return res.status(200).json({ data: { machines: machinesRes.data ?? [], customers: customersRes.data ?? [] } });
      }
      const data = await buildAssignmentsList(serviceSupabase, organizationId);
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const { machine_id, customer_org_id } = req.body ?? {};
      if (!machine_id || !customer_org_id) return res.status(400).json({ error: "machine_id and customer_org_id are required" });
      const { data: machine, error: machineError } = await serviceSupabase.from("machines").select("id, organization_id").eq("id", machine_id).eq("organization_id", organizationId).maybeSingle();
      if (machineError) return res.status(500).json({ error: machineError.message });
      if (!machine) return res.status(404).json({ error: "Machine not found or not owned by this organization" });
      const { data: customer, error: customerError } = await serviceSupabase.from("organizations").select("id, name").eq("id", customer_org_id).eq("manufacturer_org_id", organizationId).eq("type", "customer").maybeSingle();
      if (customerError) return res.status(500).json({ error: customerError.message });
      if (!customer) return res.status(404).json({ error: "Customer not found or not linked to this manufacturer" });
      const { data: existing } = await serviceSupabase.from("machine_assignments").select("id").eq("machine_id", machine_id).eq("customer_org_id", customer_org_id).eq("is_active", true).maybeSingle();
      if (existing) return res.status(409).json({ error: "This machine is already assigned to this customer" });
      const { data, error } = await serviceSupabase.from("machine_assignments").insert({
        machine_id, customer_org_id, manufacturer_org_id: organizationId, assigned_by: req.user.userId, assigned_at: new Date().toISOString(), is_active: true,
      }).select("*").single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ data });
    }

    if (req.method === "DELETE") {
      const { assignment_id } = req.body ?? {};
      if (!assignment_id) return res.status(400).json({ error: "assignment_id is required" });
      const { data: assignment, error: fetchError } = await serviceSupabase.from("machine_assignments").select("id, machine_id").eq("id", assignment_id).eq("manufacturer_org_id", organizationId).eq("is_active", true).maybeSingle();
      if (fetchError) return res.status(500).json({ error: fetchError.message });
      if (!assignment) return res.status(404).json({ error: "Assignment not found" });
      const { error: updateError } = await serviceSupabase.from("machine_assignments").update({ is_active: false }).eq("id", assignment_id);
      if (updateError) return res.status(500).json({ error: updateError.message });
      return res.status(200).json({ data: { success: true } });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Assignments API error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}, { allowPlatformAdmin: true });
