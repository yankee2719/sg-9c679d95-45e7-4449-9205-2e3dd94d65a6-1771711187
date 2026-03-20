import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabase = createServerClient({ req, res });

    // 🔐 AUTH UTENTE
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const {
        organizationId,
        entityType,
        entityId,
        action,
        metadata,
        machineId,
        documentId,
    } = req.body;

    if (!organizationId || !entityType || !action) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const { error } = await supabase.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId ?? null,
        action,
        machine_id: machineId ?? null,
        document_id: documentId ?? null,
        metadata: metadata ?? {},
    });

    if (error) {
        console.error("AUDIT LOG ERROR:", error);
        return res.status(500).json({ error: "Failed to write audit log" });
    }

    return res.status(200).json({ success: true });
}