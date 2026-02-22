import { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase, authenticateRequest } from "@/lib/apiAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { user, error: authError } = await authenticateRequest(req);
    if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });
    if (!["admin", "supervisor"].includes(user.role)) return res.status(403).json({ error: "Forbidden" });

    const { name, description, target_type, category, equipment_type, items } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Il titolo è obbligatorio" });
    if (!items?.length) return res.status(400).json({ error: "Aggiungi almeno un elemento" });

    const supabase = getServiceSupabase();

    // Create template
    const { data: tpl, error: tplError } = await supabase
        .from("checklist_templates")
        .insert({
            organization_id: user.organizationId,
            name: name.trim(),
            description: description?.trim() || null,
            target_type: target_type || "machine",
            category: category?.trim() || null,
            equipment_type: equipment_type?.trim() || null,
            version: 1,
            is_active: true,
        })
        .select("id")
        .single();

    if (tplError) {
        console.error("Template creation error:", tplError);
        return res.status(500).json({ error: tplError.message });
    }

    // Create items
    const rows = items.map((it: any, idx: number) => ({
        template_id: tpl.id,
        organization_id: user.organizationId,
        title: it.title.trim(),
        description: it.description?.trim() || null,
        input_type: it.input_type || "boolean",
        is_required: it.is_required ?? true,
        order_index: idx,
        metadata: { requiresPhoto: it.requires_photo ?? false },
    }));

    const { error: itemsError } = await supabase.from("checklist_template_items").insert(rows);
    if (itemsError) {
        console.error("Items creation error:", itemsError);
        await supabase.from("checklist_templates").delete().eq("id", tpl.id);
        return res.status(500).json({ error: itemsError.message });
    }

    return res.status(201).json({ id: tpl.id, name });
}