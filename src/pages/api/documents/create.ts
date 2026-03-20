import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSupabase } from "@/server/supabaseServer";
import { createDocument } from "@/server/services/documentService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabase = getServerSupabase(req, res);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const doc = await createDocument({
            supabase,
            payload: req.body,
            userId: user.id,
        });

        return res.status(200).json(doc);
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
}