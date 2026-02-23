// src/lib/legacyApi.ts
import type { NextApiRequest, NextApiResponse } from "next";

export function legacyGone(req: NextApiRequest, res: NextApiResponse) {
    res.status(410).json({
        error: "Legacy API disabled",
        message:
            "This endpoint belongs to the old schema (equipment/tenants/tenant_id). " +
            "Use Supabase client + RLS on the new schema (machines/organizations/...).",
        path: req.url,
        method: req.method,
    });
}