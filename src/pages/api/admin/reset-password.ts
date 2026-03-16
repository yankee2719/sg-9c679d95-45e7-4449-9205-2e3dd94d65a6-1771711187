import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return res.status(410).json({
        success: false,
        error: "Endpoint disabled. Use the standard password reset flow.",
    });
}