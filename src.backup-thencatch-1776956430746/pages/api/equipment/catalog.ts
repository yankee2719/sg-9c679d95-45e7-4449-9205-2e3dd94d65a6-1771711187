import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { EquipmentCatalogError, listEquipmentCatalog } from "@/lib/server/equipmentCatalogService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const data = await listEquipmentCatalog(getServiceSupabase(), req.user);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error("Equipment catalog API error:", error);
        if (error instanceof EquipmentCatalogError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Failed to load equipment catalog" });
    }
}

export default withAuth(ALL_APP_ROLES, handler, { allowPlatformAdmin: true });
