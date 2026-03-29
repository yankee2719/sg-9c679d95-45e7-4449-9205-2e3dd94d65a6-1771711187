import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["POST"] });
    }

    return res.status(410).json({
        error: "Deprecated endpoint",
        message: "Use /api/documents/upload/upload for new document uploads.",
    });
}

export default withAuth(ALL_APP_ROLES, handler);
