// ============================================================================
// API: GET/POST /api/maintenance/schedules
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    type AppRole,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();

    // ========================================================================
    // GET - List maintenance schedules
    // ========================================================================
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                equipment_id,
                status,
                frequency,
                assigned_to,
                upcoming_days,
                overdue,
                sort = "next_due_date",
                order = "asc",
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(
                parseInt(limit as string, 10),
                100
            );
            const offset = (pageNum - 1) * limitNum;

            let query = serviceSupabase
                .from("maintenance_schedules")
                .select(
                    `*,
                    equipment:equipment(id, name, equipment_code, location, category, organization_id),
                    assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)`,
                    { count: "exact" }
                );

            // Organization filter via equipment
            if (req.user.organizationId) {
                query = query.eq(
                    "equipment.organization_id",
                    req.user.organizationId
                );
            }

            if (equipment_id) {
                query = query.eq("equipment_id", equipment_id);
            }
            if (status) {
                query = query.eq("status", status);
            }
            if (frequency) {
                query = query.eq("frequency", frequency);
            }
            if (assigned_to) {
                query = query.eq("assigned_to", assigned_to);
            }

            if (upcoming_days) {
                const futureDate = new Date();
                futureDate.setDate(
                    futureDate.getDate() +
                    parseInt(upcoming_days as string, 10)
                );
                query = query
                    .lte("next_due_date", futureDate.toISOString())
                    .gte("next_due_date", new Date().toISOString());
            }

            if (overdue === "true") {
                query = query.lt(
                    "next_due_date",
                    new Date().toISOString()
                );
            }

            const validSortFields = [
                "next_due_date",
                "created_at",
                "title",
                "frequency",
            ];
            const sortField = validSortFields.includes(sort as string)
                ? (sort as string)
                : "next_due_date";
            const sortOrder = order === "asc";

            query = query.order(sortField, { ascending: sortOrder });
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw error;
            }

            const filteredData =
                data?.filter((item) => item.equipment !== null) || [];

            return res.status(200).json({
                success: true,
                data: filteredData,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limitNum),
                },
            });
        } catch (error) {
            console.error("Maintenance schedules list error:", error);
            return res.status(500).json({
                error: "Failed to list maintenance schedules",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    // ========================================================================
    // POST - Create new maintenance schedule (admin/supervisor only)
    // ========================================================================
    if (req.method === "POST") {
        if (req.user.role === "technician" || req.user.role === "viewer") {
            return res.status(403).json({
                error: "Only admins and supervisors can create schedules",
            });
        }

        try {
            const {
                equipment_id,
                title,
                description,
                frequency,
                next_due_date,
                assigned_to,
                checklist_id,
                priority,
                estimated_duration_minutes,
                notes,
            } = req.body;

            if (!equipment_id || !title) {
                return res.status(400).json({
                    error: "equipment_id and title are required",
                });
            }

            // Verify equipment exists
            const { data: equipment, error: eqError } = await serviceSupabase
                .from("equipment")
                .select("id, organization_id")
                .eq("id", equipment_id)
                .single();

            if (eqError || !equipment) {
                return res
                    .status(404)
                    .json({ error: "Equipment not found" });
            }

            // Verify same organization
            if (
                req.user.organizationId &&
                equipment.organization_id !== req.user.organizationId
            ) {
                return res
                    .status(403)
                    .json({ error: "Equipment belongs to another organization" });
            }

            const scheduleData = {
                equipment_id,
                title,
                description: description || null,
                frequency: frequency || "monthly",
                next_due_date:
                    next_due_date || new Date().toISOString(),
                assigned_to: assigned_to || null,
                checklist_id: checklist_id || null,
                priority: priority || "medium",
                estimated_duration_minutes:
                    estimated_duration_minutes || null,
                notes: notes || null,
                status: "scheduled",
                created_at: new Date().toISOString(),
            };

            const { data, error } = await serviceSupabase
                .from("maintenance_schedules")
                .insert(scheduleData)
                .select(
                    `*,
                    equipment:equipment(id, name, equipment_code, location),
                    assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)`
                )
                .single();

            if (error) {
                throw error;
            }

            return res.status(201).json({ success: true, data });
        } catch (error) {
            console.error("Maintenance schedule create error:", error);
            return res.status(500).json({
                error: "Failed to create maintenance schedule",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);

