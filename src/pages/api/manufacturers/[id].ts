import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

function normalizeOptionalString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
}

export default withAuth(["owner", "admin", "supervisor"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
        return res.status(400).json({ error: "Manufacturer id is required" });
    }

    const supabase = getServiceSupabase();
    const organizationId = req.user.organizationId;

    if (!organizationId && !req.user.isPlatformAdmin) {
        return res.status(400).json({ error: "Active organization context is required" });
    }

    try {
        let lookup: any = supabase
            .from("manufacturers")
            .select("id, organization_id")
            .eq("id", id);

        if (!req.user.isPlatformAdmin || organizationId) {
            lookup = lookup.eq("organization_id", organizationId);
        }

        const { data: existing, error: lookupError } = await lookup.limit(1).maybeSingle();
        if (lookupError) {
            return res.status(500).json({ error: lookupError.message });
        }
        if (!existing) {
            return res.status(404).json({ error: "Manufacturer not found" });
        }

        if (req.method === "PATCH") {
            const name = req.body?.name === undefined ? undefined : String(req.body.name ?? "").trim();
            if (name !== undefined && !name) {
                return res.status(400).json({ error: "Manufacturer name cannot be empty" });
            }

            const payload = {
                ...(name !== undefined ? { name } : {}),
                ...(req.body?.country !== undefined ? { country: normalizeOptionalString(req.body.country) } : {}),
                ...(req.body?.website !== undefined ? { website: normalizeOptionalString(req.body.website) } : {}),
                ...(req.body?.email !== undefined ? { email: normalizeOptionalString(req.body.email) } : {}),
                ...(req.body?.phone !== undefined ? { phone: normalizeOptionalString(req.body.phone) } : {}),
                ...(req.body?.address !== undefined ? { address: normalizeOptionalString(req.body.address) } : {}),
                ...(req.body?.notes !== undefined ? { notes: normalizeOptionalString(req.body.notes) } : {}),
            };

            const { data, error } = await supabase
                .from("manufacturers")
                .update(payload as any)
                .eq("id", id)
                .select("id, organization_id, name, country, website, email, phone, address, notes, is_archived")
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ success: true, data });
        }

        if (req.method === "DELETE") {
            const { error } = await supabase.from("manufacturers").delete().eq("id", id);
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Manufacturer detail API error:", error);
        return res.status(500).json({ error: error?.message || "Manufacturer request failed" });
    }
});
