import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
    | "maintenance_due"
    | "maintenance_overdue"
    | "equipment_status"
    | "checklist_assigned"
    | "wo_assigned"
    | "wo_completed"
    | "checklist_completed"
    | "system";

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    is_read: boolean;
    created_at: string;
    link?: string | null;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
    is_email_sent?: boolean | null;
}

function buildNotificationLink(relatedEntityType?: string, relatedEntityId?: string) {
    if (!relatedEntityType || !relatedEntityId) return null;

    switch (relatedEntityType) {
        case "work_order":
            return `/work-orders/${relatedEntityId}`;
        case "maintenance_plan":
            return `/maintenance/${relatedEntityId}`;
        case "machine":
            return `/equipment/${relatedEntityId}`;
        case "checklist_execution":
            return `/checklist/${relatedEntityId}`;
        default:
            return null;
    }
}

function normalizeNotification(row: any): Notification {
    return {
        id: String(row?.id ?? ""),
        user_id: String(row?.user_id ?? ""),
        title: String(row?.title ?? ""),
        message: String(row?.message ?? ""),
        type: (row?.type ?? "system") as NotificationType,
        is_read: Boolean(row?.is_read),
        created_at: row?.created_at ?? new Date().toISOString(),
        link: row?.link ?? buildNotificationLink(row?.related_entity_type, row?.related_entity_id),
        related_entity_type: row?.related_entity_type ?? null,
        related_entity_id: row?.related_entity_id ?? null,
        is_email_sent: row?.is_email_sent ?? null,
    };
}

async function insertNotificationRow(payload: Record<string, unknown>) {
    const { error } = await supabase.from("notifications").insert(payload as any);
    if (!error) return;

    const fallbackPayload = {
        user_id: payload.user_id,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        is_read: payload.is_read,
        link: payload.link ?? null,
    };

    const fallback = await supabase.from("notifications").insert(fallbackPayload as any);
    if (fallback.error) {
        throw fallback.error;
    }
}

async function insertNotificationRows(rows: Record<string, unknown>[]) {
    const { error } = await supabase.from("notifications").insert(rows as any);
    if (!error) return;

    const fallbackRows = rows.map((row) => ({
        user_id: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        is_read: row.is_read,
        link: row.link ?? null,
    }));

    const fallback = await supabase.from("notifications").insert(fallbackRows as any);
    if (fallback.error) {
        throw fallback.error;
    }
}

export const notificationService = {
    async getMyNotifications(opts?: {
        limit?: number;
        isRead?: boolean;
        type?: NotificationType;
    }): Promise<{ notifications: Notification[]; unreadCount: number }> {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { notifications: [], unreadCount: 0 };

        let query = supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(opts?.limit || 50);

        if (opts?.isRead !== undefined) {
            query = query.eq("is_read", opts.isRead);
        }
        if (opts?.type) {
            query = query.eq("type", opts.type);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching notifications:", error);
            return { notifications: [], unreadCount: 0 };
        }

        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        return {
            notifications: (data || []).map(normalizeNotification),
            unreadCount: count || 0,
        };
    },

    async getUnreadCount(): Promise<number> {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        return count || 0;
    },

    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);

        if (error) throw error;
    },

    async markAllAsRead(): Promise<void> {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) throw error;
    },

    async deleteNotification(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", notificationId);

        if (error) throw error;
    },

    async deleteAllRead(): Promise<void> {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", user.id)
            .eq("is_read", true);

        if (error) throw error;
    },

    async create(params: {
        userId: string;
        title: string;
        message: string;
        type: NotificationType;
        relatedEntityType?: string;
        relatedEntityId?: string;
    }): Promise<void> {
        try {
            await insertNotificationRow({
                user_id: params.userId,
                title: params.title,
                message: params.message,
                type: params.type,
                related_entity_type: params.relatedEntityType || null,
                related_entity_id: params.relatedEntityId || null,
                link: buildNotificationLink(params.relatedEntityType, params.relatedEntityId),
                is_read: false,
                is_email_sent: false,
            });
        } catch (error) {
            console.error("Error creating notification:", error);
        }
    },

    async createBulk(params: {
        userIds: string[];
        title: string;
        message: string;
        type: NotificationType;
        relatedEntityType?: string;
        relatedEntityId?: string;
    }): Promise<void> {
        const rows = params.userIds.map((uid) => ({
            user_id: uid,
            title: params.title,
            message: params.message,
            type: params.type,
            related_entity_type: params.relatedEntityType || null,
            related_entity_id: params.relatedEntityId || null,
            link: buildNotificationLink(params.relatedEntityType, params.relatedEntityId),
            is_read: false,
            is_email_sent: false,
        }));

        try {
            await insertNotificationRows(rows);
        } catch (error) {
            console.error("Error creating bulk notifications:", error);
        }
    },

    async notifyWOAssigned(woId: string, woTitle: string, assigneeId: string): Promise<void> {
        await this.create({
            userId: assigneeId,
            title: "Ordine di lavoro assegnato",
            message: `Ti è stato assegnato: "${woTitle}"`,
            type: "wo_assigned",
            relatedEntityType: "work_order",
            relatedEntityId: woId,
        });
    },

    async notifyWOCompleted(woId: string, woTitle: string, supervisorIds: string[]): Promise<void> {
        await this.createBulk({
            userIds: supervisorIds,
            title: "Ordine di lavoro completato",
            message: `"${woTitle}" è stato completato e richiede approvazione`,
            type: "wo_completed",
            relatedEntityType: "work_order",
            relatedEntityId: woId,
        });
    },

    async notifyChecklistCompleted(
        checklistName: string,
        executionId: string,
        executorName: string,
        supervisorIds: string[]
    ): Promise<void> {
        await this.createBulk({
            userIds: supervisorIds,
            title: "Checklist completata",
            message: `"${checklistName}" completata da ${executorName}`,
            type: "checklist_completed",
            relatedEntityType: "checklist_execution",
            relatedEntityId: executionId,
        });
    },

    async notifyMaintenanceDue(
        planTitle: string,
        planId: string,
        dueDate: string,
        technicianIds: string[]
    ): Promise<void> {
        const d = new Date(dueDate).toLocaleDateString("it-IT");
        await this.createBulk({
            userIds: technicianIds,
            title: "Manutenzione in scadenza",
            message: `"${planTitle}" scade il ${d}`,
            type: "maintenance_due",
            relatedEntityType: "maintenance_plan",
            relatedEntityId: planId,
        });
    },

    async notifyMaintenanceOverdue(
        planTitle: string,
        planId: string,
        technicianIds: string[]
    ): Promise<void> {
        await this.createBulk({
            userIds: technicianIds,
            title: "⚠ Manutenzione scaduta",
            message: `"${planTitle}" è scaduta e richiede attenzione immediata`,
            type: "maintenance_overdue",
            relatedEntityType: "maintenance_plan",
            relatedEntityId: planId,
        });
    },

    async notifyEquipmentStatusChange(
        machineName: string,
        machineId: string,
        newStatus: string,
        supervisorIds: string[]
    ): Promise<void> {
        const labels: Record<string, string> = {
            active: "attivo",
            inactive: "inattivo",
            under_maintenance: "in manutenzione",
            decommissioned: "dismesso",
        };
        await this.createBulk({
            userIds: supervisorIds,
            title: "Cambio stato macchina",
            message: `"${machineName}" ora è ${labels[newStatus] || newStatus}`,
            type: "equipment_status",
            relatedEntityType: "machine",
            relatedEntityId: machineId,
        });
    },

    subscribeToMyNotifications(userId: string, onNew: (notification: Notification) => void) {
        return supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onNew(normalizeNotification(payload.new));
                }
            )
            .subscribe();
    },

    unsubscribe(channel: any) {
        if (channel) supabase.removeChannel(channel);
    },
};
