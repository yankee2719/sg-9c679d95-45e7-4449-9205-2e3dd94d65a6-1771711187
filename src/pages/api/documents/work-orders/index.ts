// ============================================================================
// API: GET/POST /api/documents/work-orders
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getMaintenanceService } from "@/services/maintenanceService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const maintenanceService = getMaintenanceService();

    try {
        // ====================================================================
        // POST: Create work order
        // ====================================================================
        if (req.method === "POST") {
            const body = req.body;

            if (
                !body.equipment_id ||
                !body.plant_id ||
                !body.title ||
                !body.wo_type
            ) {
                return res.status(400).json({
                    error: "equipment_id, plant_id, title, and wo_type are required",
                });
            }

            if (!req.user.organizationId) {
                return res
                    .status(400)
                    .json({ error: "User organization not found" });
            }

            const workOrder = await maintenanceService.createWorkOrder(
                {
                    equipment_id: body.equipment_id,
                    plant_id: body.plant_id,
                    maintenance_plan_id: body.maintenance_plan_id,
                    title: body.title,
                    description: body.description,
                    priority: body.priority || "medium",
                    wo_type: body.wo_type,
                    scheduled_start: body.scheduled_start,
                    scheduled_end: body.scheduled_end,
                    estimated_duration_minutes:
                        body.estimated_duration_minutes,
                },
                req.user.userId,
                req.user.organizationId
            );

            return res.status(201).json({
                success: true,
                message: "Work order created successfully",
                workOrder,
            });
        }

        // ====================================================================
        // GET: List work orders
        // ====================================================================
        else if (req.method === "GET") {
            const { equipment_id, status, my_orders } = req.query;

            let workOrders;

            if (my_orders === "true") {
                workOrders = await maintenanceService.getMyWorkOrders(
                    req.user.userId
                );
            } else if (equipment_id) {
                const statusFilter = status
                    ? ((Array.isArray(status) ? status : [status]) as any[])
                    : undefined;

                workOrders =
                    await maintenanceService.getWorkOrdersByEquipment(
                        equipment_id as string,
                        { status: statusFilter }
                    );
            } else {
                return res.status(400).json({
                    error: "Either equipment_id or my_orders=true is required",
                });
            }

            return res.status(200).json({
                success: true,
                workOrders,
                total: workOrders.length,
            });
        }

        // ====================================================================
        else {
            return res.status(405).json({
                error: "Method not allowed",
                allowedMethods: ["GET", "POST"],
            });
        }
    } catch (error) {
        console.error("Work Orders API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

