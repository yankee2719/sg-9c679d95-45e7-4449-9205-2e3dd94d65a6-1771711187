import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { isManagerRole } from "@/lib/roles";

type MachineAssignmentRow = { id: string; machine_id: string; customer_org_id: string | null; manufacturer_org_id: string; assigned_by: string | null; assigned_at: string | null; is_active: boolean; };
function normalizeOptionalString(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

async function listMachineAssignments(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const orgId = req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: "No active organization context" });
    if (req.user.organizationType !== "manufacturer" && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Assignments are available only in manufacturer context" });

    const wantsOptions = req.query.options === "1" || req.query.options === "true";
    if (wantsOptions) {
        const [machinesRes, customersRes] = await Promise.all([
            serviceSupabase.from("machines").select("id, name, internal_code, serial_number, model, brand, plant_id, area").eq("organization_id", orgId).eq("is_archived", false).or("is_deleted.is.null,is_deleted.eq.false").order("name", { ascending: true }),
            serviceSupabase.from("organizations").select("id, name, city, email").eq("manufacturer_org_id", orgId).eq("type", "customer").or("is_deleted.is.null,is_deleted.eq.false").order("name", { ascending: true }),
        ]);
        if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });
        if (customersRes.error) return res.status(500).json({ error: customersRes.error.message });

        const customerIds = (customersRes.data ?? []).map((row: any) => row.id).filter(Boolean);
        let customerPlants: any[] = [];
        if (customerIds.length > 0) {
            const { data, error } = await serviceSupabase.from("plants").select("id, name, organization_id").in("organization_id", customerIds).order("name", { ascending: true });
            if (error) return res.status(500).json({ error: error.message });
            customerPlants = data ?? [];
        }
        return res.status(200).json({ machines: machinesRes.data ?? [], customers: customersRes.data ?? [], customer_plants: customerPlants });
    }

    const { data: assignments, error: assignmentsError } = await serviceSupabase.from("machine_assignments").select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active").eq("manufacturer_org_id", orgId).eq("is_active", true).order("assigned_at", { ascending: false });
    if (assignmentsError) return res.status(500).json({ error: assignmentsError.message });

    const rows = (assignments ?? []) as MachineAssignmentRow[];
    const machineIds = Array.from(new Set(rows.map((row) => row.machine_id).filter(Boolean)));
    const customerIds = Array.from(new Set(rows.map((row) => row.customer_org_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((row) => row.assigned_by).filter(Boolean))) as string[];

    let machineMap = new Map<string, any>();
    let customerMap = new Map<string, any>();
    let userMap = new Map<string, any>();
    let plantMap = new Map<string, any>();

    if (machineIds.length > 0) {
        const { data, error } = await serviceSupabase.from("machines").select("id, name, internal_code, serial_number, model, brand, plant_id, area").in("id", machineIds);
        if (error) return res.status(500).json({ error: error.message });
        machineMap = new Map((data ?? []).map((row: any) => [row.id, row]));
        const plantIds = Array.from(new Set((data ?? []).map((row: any) => row.plant_id).filter(Boolean)));
        if (plantIds.length > 0) {
            const { data: plantRows, error: plantError } = await serviceSupabase.from("plants").select("id, name, organization_id").in("id", plantIds);
            if (plantError) return res.status(500).json({ error: plantError.message });
            plantMap = new Map((plantRows ?? []).map((row: any) => [row.id, row]));
        }
    }

    if (customerIds.length > 0) {
        const { data, error } = await serviceSupabase.from("organizations").select("id, name, city, email").in("id", customerIds);
        if (error) return res.status(500).json({ error: error.message });
        customerMap = new Map((data ?? []).map((row: any) => [row.id, row]));
    }
    if (userIds.length > 0) {
        const { data, error } = await serviceSupabase.from("profiles").select("id, display_name, first_name, last_name, email").in("id", userIds);
        if (error) return res.status(500).json({ error: error.message });
        userMap = new Map((data ?? []).map((row: any) => [row.id, row]));
    }

    return res.status(200).json(rows.map((row) => {
        const machine = machineMap.get(row.machine_id) ?? null;
        const machinePlant = machine?.plant_id ? plantMap.get(machine.plant_id) ?? null : null;
        return { ...row, machine, machine_plant: machinePlant, customer: row.customer_org_id ? customerMap.get(row.customer_org_id) ?? null : null, assigned_user: row.assigned_by ? userMap.get(row.assigned_by) ?? null : null };
    }));
}

async function createMachineAssignment(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const orgId = req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: "No active organization context" });
    if (req.user.organizationType !== "manufacturer" && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Assignments are available only in manufacturer context" });
    if (!isManagerRole(req.user.role) && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Only admins and supervisors can manage assignments" });

    const machineId = normalizeOptionalString(req.body?.machine_id);
    const customerOrgId = normalizeOptionalString(req.body?.customer_org_id);
    const customerPlantId = normalizeOptionalString(req.body?.customer_plant_id);
    const areaValue = typeof req.body?.area === "string" ? req.body.area : undefined;
    if (!machineId || !customerOrgId) return res.status(400).json({ error: "machine_id and customer_org_id are required" });

    const [machineRes, customerRes, duplicateRes] = await Promise.all([
        serviceSupabase.from("machines").select("id, organization_id, is_archived, is_deleted, plant_id, area").eq("id", machineId).eq("organization_id", orgId).maybeSingle(),
        serviceSupabase.from("organizations").select("id, manufacturer_org_id, type, is_deleted").eq("id", customerOrgId).maybeSingle(),
        serviceSupabase.from("machine_assignments").select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active").eq("manufacturer_org_id", orgId).eq("machine_id", machineId).eq("customer_org_id", customerOrgId).eq("is_active", true).maybeSingle(),
    ]);
    if (machineRes.error) return res.status(500).json({ error: machineRes.error.message });
    if (customerRes.error) return res.status(500).json({ error: customerRes.error.message });
    if (duplicateRes.error) return res.status(500).json({ error: duplicateRes.error.message });
    if (!machineRes.data) return res.status(404).json({ error: "Machine not found" });
    if (machineRes.data.is_archived || machineRes.data.is_deleted === true) return res.status(409).json({ error: "Cannot assign an archived machine" });
    if (!customerRes.data || customerRes.data.type !== "customer" || customerRes.data.manufacturer_org_id !== orgId || customerRes.data.is_deleted === true) {
        return res.status(404).json({ error: "Customer not found in active manufacturer context" });
    }

    let validatedPlant: any = null;
    if (customerPlantId) {
        const { data, error } = await serviceSupabase.from("plants").select("id, name, organization_id").eq("id", customerPlantId).maybeSingle();
        if (error) return res.status(500).json({ error: error.message });
        if (!data || data.organization_id !== customerOrgId) return res.status(400).json({ error: "The selected plant does not belong to the chosen customer" });
        validatedPlant = data;
    }

    const machinePatch: Record<string, unknown> = {};
    if (customerPlantId) machinePatch.plant_id = customerPlantId;
    if (areaValue !== undefined) machinePatch.area = areaValue.trim() || null;

    if (duplicateRes.data?.id) {
        if (Object.keys(machinePatch).length === 0) return res.status(409).json({ error: "This machine is already assigned to the selected customer" });
        const { error: machineUpdateError } = await serviceSupabase.from("machines").update(machinePatch as any).eq("id", machineId).eq("organization_id", orgId);
        if (machineUpdateError) return res.status(500).json({ error: machineUpdateError.message });
        return res.status(200).json({ ...duplicateRes.data, reused_existing: true, updated_machine_context: true, machine_plant: validatedPlant });
    }

    const { data, error } = await serviceSupabase.from("machine_assignments").insert({
        manufacturer_org_id: orgId, customer_org_id: customerOrgId, machine_id: machineId, assigned_by: req.user.id, assigned_at: new Date().toISOString(), is_active: true,
    } as any).select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active").single();
    if (error) return res.status(500).json({ error: error.message });

    if (Object.keys(machinePatch).length > 0) {
        const { error: machineUpdateError } = await serviceSupabase.from("machines").update(machinePatch as any).eq("id", machineId).eq("organization_id", orgId);
        if (machineUpdateError) return res.status(500).json({ error: machineUpdateError.message });
    }

    await serviceSupabase.from("audit_logs").insert({ organization_id: orgId, actor_user_id: req.user.id, entity_type: "machine_assignment", entity_id: data.id, action: "create", metadata: { machine_id: machineId, customer_org_id: customerOrgId, customer_plant_id: customerPlantId || null, area: areaValue?.trim() || null } } as any).then(undefined, () => undefined);
    return res.status(201).json({ ...data, machine_plant: validatedPlant });
}

async function deactivateMachineAssignment(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const orgId = req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: "No active organization context" });
    if (!isManagerRole(req.user.role) && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Only admins and supervisors can manage assignments" });

    const assignmentId = normalizeOptionalString(req.body?.assignment_id);
    if (!assignmentId) return res.status(400).json({ error: "assignment_id is required" });
    const { error } = await serviceSupabase.from("machine_assignments").update({ is_active: false } as any).eq("id", assignmentId).eq("manufacturer_org_id", orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method === "GET") return listMachineAssignments(req, res);
    if (req.method === "POST") return createMachineAssignment(req, res);
    if (req.method === "DELETE") return deactivateMachineAssignment(req, res);
    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);

