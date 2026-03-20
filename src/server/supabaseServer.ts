import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

export function getServerSupabase(req: NextApiRequest, res: NextApiResponse) {
    return createServerClient({ req, res });
}