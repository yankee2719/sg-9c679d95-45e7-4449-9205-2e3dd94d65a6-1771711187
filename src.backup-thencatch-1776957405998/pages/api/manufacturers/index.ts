import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

type ManufacturerRow = {
    id: string;
    organization_id: string;
    name: string;
    country: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    is_archived: boolean | null;
};

function normalizeOptionalString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const supabase = getServiceSupabase();
    const organizationId = req.user.organizationId;

    if (!organizationId && !req.user.isPlatformAdmin) {
        return res.status(400).json({ error: "Active organization context is required" });
    }

    try {
        if (req.method === "GET") {
            let query = supabase
                .from("manufacturers")
                .select("id, organization_id, name, country, website, email, phone, address, notes, is_archived")
                .order("name", { ascending: true });

            if (!req.user.isPlatformAdmin || organizationId) {
                query = query.eq("organization_id", organizationId);
            }

            const { data, error } = await query;
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            const items = (data ?? []).filter((row: any) => !row?.is_archived) as ManufacturerRow[];
            return res.status(200).json({ success: true, data: items });
        }

        if (req.method === "POST") {
            if (!["owner", "admin", "supervisor"].includes(req.user.role) && !req.user.isPlatformAdmin) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const name = String(req.body?.name ?? "").trim();
            if (!name) {
                return res.status(400).json({ error: "Manufacturer name is required" });
            }

            const payload = {
                organization_id: organizationId,
                name,
                country: normalizeOptionalString(req.body?.country),
                website: normalizeOptionalString(req.body?.website),
                email: normalizeOptionalString(req.body?.email),
                phone: normalizeOptionalString(req.body?.phone),
                address: normalizeOptionalString(req.body?.address),
                notes: normalizeOptionalString(req.body?.notes),
                is_archived: false,
            };

            const { data, error } = await supabase
                .from("manufacturers")
                .insert(payload as any)
                .select("id, organization_id, name, country, website, email, phone, address, notes, is_archived")
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(201).json({ success: true, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Manufacturers index API error:", error);
        return res.status(500).json({ error: error?.message || "Manufacturers request failed" });
    }
});
