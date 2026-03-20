import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabase = createServerClient({ req, res });

    // 🔐 AUTH
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // 🔎 recupero organization attiva da query o header
    const organizationId =
        (req.query.organizationId as string) ||
        req.headers["x-org-id"]?.toString();

    if (!organizationId) {
        return res.status(400).json({ error: "Missing organizationId" });
    }

    // 📦 query dati
    const { data, error } = await supabase
        .from("machines")
        .select(`
            id,
            name,
            internal_code,
            lifecycle_state,
            plant_id,
            production_line_id,
            created_at
        `)
        .eq("organization_id", organizationId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Export machines error:", error);
        return res.status(500).json({ error: "Failed to fetch machines" });
    }

    // 📄 CSV generation
    const header = [
        "ID",
        "Nome",
        "Codice",
        "Stato",
        "Plant",
        "Linea",
        "Creato il",
    ];

    const rows = (data ?? []).map((m) => [
        m.id,
        m.name ?? "",
        m.internal_code ?? "",
        m.lifecycle_state ?? "",
        m.plant_id ?? "",
        m.production_line_id ?? "",
        m.created_at ?? "",
    ]);

    const csv = [
        header.join(";"),
        ...rows.map((r) =>
            r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")
        ),
    ].join("\n");

    // 📤 response
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="machines_export_${Date.now()}.csv"`
    );

    return res.status(200).send(csv);
}