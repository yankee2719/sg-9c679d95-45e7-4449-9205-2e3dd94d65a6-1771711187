// src/pages/api/equipment/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { legacyGone } from "@/lib/legacyApi";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    return legacyGone(req, res);
}