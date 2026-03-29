import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const supabase = getServiceSupabase();
        const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
        const machineId = typeof req.query.machineId === "string"
            ? req.query.machineId
            : typeof req.query.equipmentId === "string"
                ? req.query.equipmentId
                : "";
        const complianceTagsParam = typeof req.query.complianceTags === "string" ? req.query.complianceTags : "";
        const complianceTags = complianceTagsParam
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

        let dbQuery = supabase
            .from("documents")
            .select(`
                id,
                organization_id,
                machine_id,
                title,
                description,
                category,
                language,
                regulatory_reference,
                version_count,
                file_size,
                updated_at,
                created_at,
                is_archived,
                tags
            `)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false })
            .limit(limit);

        if (category) {
            dbQuery = dbQuery.eq("category", category);
        }
        if (machineId) {
            dbQuery = dbQuery.eq("machine_id", machineId);
        }
        if (query) {
            const escaped = query.replace(/,/g, " ");
            dbQuery = dbQuery.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,regulatory_reference.ilike.%${escaped}%`);
        }

        const { data, error } = await dbQuery;
        if (error) throw error;

        let rows = (data ?? []).filter((row: any) => {
            if (req.user.isPlatformAdmin) return true;
            return row.organization_id === req.user.organizationId;
        });

        if (complianceTags.length > 0) {
            rows = rows.filter((row: any) => {
                const ref = String(row.regulatory_reference ?? "").toLowerCase();
                return complianceTags.some((tag) => ref.includes(tag.toLowerCase()));
            });
        }

        const documents = rows.map((row: any) => ({
            ...row,
            compliance_tags: row.regulatory_reference
                ? String(row.regulatory_reference)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : [],
        }));

        const stats = {
            total: documents.length,
            byCategory: documents.reduce((acc: Record<string, number>, doc: any) => {
                const key = doc.category || "other";
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
            byCompliance: documents.reduce((acc: Record<string, number>, doc: any) => {
                for (const tag of doc.compliance_tags ?? []) {
                    acc[tag] = (acc[tag] || 0) + 1;
                }
                return acc;
            }, {}),
        };

        return res.status(200).json({
            success: true,
            documents,
            stats,
            filters: {
                query: query || null,
                category: category || null,
                machineId: machineId || null,
                complianceTags: complianceTags.length > 0 ? complianceTags : null,
                limit,
            },
        });
    } catch (error) {
        console.error("Search API error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Search failed",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
