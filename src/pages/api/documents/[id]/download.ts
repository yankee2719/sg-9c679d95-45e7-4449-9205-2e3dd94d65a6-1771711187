import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!id) {
        return res.status(400).json({ error: "Document ID is required" });
    }

    return res.status(200).json({
        success: false,
        message: "Temporary stub: download route disabled to unblock build.",
        documentId: id,
    });
}

export default withAuth(ALL_APP_ROLES, handler);