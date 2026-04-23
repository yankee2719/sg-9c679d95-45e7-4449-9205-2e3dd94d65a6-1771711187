import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest } from "@/lib/apiAuth";

async function handler(_req: AuthenticatedRequest, res: NextApiResponse) {
    return res.status(410).json({
        success: false,
        error: "Deprecated endpoint",
        message:
            "This legacy /api/documents/work-orders endpoint has been retired. Use /api/work-orders and the dedicated work-order APIs instead.",
    });
}

export default withAuth(ALL_APP_ROLES, handler);
