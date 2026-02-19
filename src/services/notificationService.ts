// src/services/notificationService.ts
// ============================================================================
// NOTIFICATION SERVICE — Crea, legge, gestisce notifiche reali
// ============================================================================

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
    related_entity_type: string | null;
    related_entity_id: string | null;
    is_read: boolean;
    is_email_sent: boolean;
    created_at: string;
}

export const notificationService = {

    // ─── FETCH ──────────────────────────────────────────────────────────

    async getMyNotifications(opts?: {
        limit?: number;
        isRead?: boolean;
        type?: NotificationType;
    }): Promise<{ notifications: Notification[]; unreadCount: number }> {
        const { data: { user } } = await supabase.auth.getUser();
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

        // Unread count
        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        return {
            notifications: (data || []) as Notification[],
            unreadCount: count || 0,
        };
    },

    async getUnreadCount(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        return count || 0;
    },

    // ─── MARK READ ──────────────────────────────────────────────────────

    async markAsRead(notificationId: string): Promise<void> {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);
    },

    async markAllAsRead(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
    },

    // ─── DELETE ──────────────────────────────────────────────────────────

    async deleteNotification(notificationId: string): Promise<void> {
        await supabase
            .from("notifications")
            .delete()
            .eq("id", notificationId);
    },

    async deleteAllRead(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from("notifications")
            .delete()
            .eq("user_id", user.id)
            .eq("is_read", true);
    },

    // ─── CREATE (used internally by other services) ─────────────────────

    async create(params: {
        userId: string;
        title: string;
        message: string;
        type: NotificationType;
        relatedEntityType?: string;
        relatedEntityId?: string;
    }): Promise<void> {
        const { error } = await supabase
            .from("notifications")
            .insert({
                user_id: params.userId,
                title: params.title,
                message: params.message,
                type: params.type as string,
                related_entity_type: params.relatedEntityType || null,
                related_entity_id: params.relatedEntityId || null,
                is_read: false,
                is_email_sent: false,
            });

        if (error) console.error("Error creating notification:", error);
    },

    // Send to multiple users
    async createBulk(params: {
        userIds: string[];
        title: string;
        message: string;
        type: NotificationType;
        relatedEntityType?: string;
        relatedEntityId?: string;
    }): Promise<void> {
        const rows = params.userIds.map(uid => ({
            user_id: uid,
            title: params.title,
            message: params.message,
            type: params.type as string,
            related_entity_type: params.relatedEntityType || null,
            related_entity_id: params.relatedEntityId || null,
            is_read: false,
            is_email_sent: false,
        }));

        const { error } = await supabase.from("notifications").insert(rows);
        if (error) console.error("Error creating bulk notifications:", error);
    },

    // ─── HIGH-LEVEL NOTIFICATION CREATORS ───────────────────────────────

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
            active: "attivo", inactive: "inattivo", under_maintenance: "in manutenzione", decommissioned: "dismesso",
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

    // ─── REALTIME SUBSCRIPTION ──────────────────────────────────────────

    subscribeToMyNotifications(
        userId: string,
        onNew: (notification: Notification) => void
    ) {
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
                    onNew(payload.new as Notification);
                }
            )
            .subscribe();
    },

    unsubscribe(channel: any) {
        if (channel) supabase.removeChannel(channel);
    },
};

