import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { listAccessibleDocuments } from "@/lib/server/documentVisibility";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    try {
        const docs = await listAccessibleDocuments(req);

        const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
        const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
        const language = typeof req.query.language === "string" ? req.query.language.trim() : "";

        const filtered = docs.filter((doc) => {
            const matchesQuery = !q || [doc.title, doc.description, doc.regulatory_reference]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
            const matchesCategory = !category || category === "all" || doc.category === category;
            const matchesLanguage = !language || language === "all" || doc.language === language;
            return matchesQuery && matchesCategory && matchesLanguage;
        });

        return res.status(200).json({
            success: true,
            data: filtered,
            meta: {
                total: filtered.length,
                totalUnfiltered: docs.length,
            },
        });
    } catch (error) {
        console.error("Documents index API error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unable to load documents",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

