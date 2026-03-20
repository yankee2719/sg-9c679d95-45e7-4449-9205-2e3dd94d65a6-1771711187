import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
    organizationId: string;
    entityType: string;
    entityId?: string | null;
    action: string;
    machineId?: string | null;
    documentId?: string | null;
    metadata?: any;
}) {
    try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) return;

        await fetch("/api/audit-log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(params),
        });
    } catch (err) {
        // ⚠️ NON bloccare mai la UI per audit
        console.warn("Audit log failed (non-blocking)", err);
    }
}