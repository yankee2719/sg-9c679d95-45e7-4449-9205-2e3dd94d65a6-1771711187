import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ALL_APP_ROLES, isManagerRole } from "@/lib/roles";

function slugify(value: string) {
    return value.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
async function buildUniqueSlug(serviceSupabase: ReturnType<typeof getServiceSupabase>, baseName: string) {
    const base = slugify(baseName) || `customer-${Date.now()}`;
    let candidate = base;
    let counter = 1;
    while (true) {
        const { data, error } = await serviceSupabase.from("organizations").select("id").eq("slug", candidate).maybeSingle();
        if (error) throw error;
        if (!data) return candidate;
        counter += 1;
        candidate = `${base}-${counter}`;
    }
}

export default withAuth(ALL_APP_ROLES, async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const organizationId = req.user.organizationId;
    const organizationType = req.user.organizationType;
    if (!organizationId || !organizationType) return res.status(400).json({ error: "No active organization context" });
    if (organizationType !== "manufacturer" && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Customers API available only for manufacturer" });

    try {
        if (req.method === "GET") {
            const { data, error } = await serviceSupabase.from("organizations").select(`
          id,
          name,
          slug,
          type,
          manufacturer_org_id,
          city,
          country,
          email,
          phone,
          address_line1,
          address_line2,
          province,
          postal_code,
          vat_number,
          fiscal_code,
          website,
          subscription_status,
          created_at,
          is_deleted
        `).eq("manufacturer_org_id", organizationId).eq("type", "customer").or("is_deleted.is.null,is_deleted.eq.false").order("created_at", { ascending: false });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data ?? []);
        }

        if (req.method === "POST") {
            if (!isManagerRole(req.user.role)) return res.status(403).json({ error: "Only admins and supervisors can create customers" });
            const { name, slug, city, country, email, phone, address_line1, address_line2, province, postal_code, vat_number, fiscal_code, website, subscription_status } = req.body ?? {};
            if (!name?.trim()) return res.status(400).json({ error: "Customer name is required" });
            const finalSlug = slug?.trim() ? slugify(slug.trim()) : await buildUniqueSlug(serviceSupabase, name.trim());
            const { data, error } = await serviceSupabase.from("organizations").insert({
                name: name.trim(), slug: finalSlug, type: "customer", manufacturer_org_id: organizationId,
                city: city?.trim() || null, country: country?.trim() || "IT", email: email?.trim().toLowerCase() || null, phone: phone?.trim() || null,
                address_line1: address_line1?.trim() || null, address_line2: address_line2?.trim() || null, province: province?.trim() || null, postal_code: postal_code?.trim() || null,
                vat_number: vat_number?.trim() || null, fiscal_code: fiscal_code?.trim() || null, website: website?.trim() || null,
                subscription_status: subscription_status || "trial", subscription_plan: null,
            }).select(`
          id,
          name,
          slug,
          type,
          manufacturer_org_id,
          city,
          country,
          email,
          phone,
          address_line1,
          address_line2,
          province,
          postal_code,
          vat_number,
          fiscal_code,
          website,
          subscription_status,
          created_at,
          is_deleted
        `).single();
            if (error) return res.status(500).json({ error: error.message });
            await serviceSupabase.from("audit_logs").insert({ organization_id: organizationId, actor_user_id: req.user.userId, entity_type: "organization", entity_id: data.id, action: "create", new_data: { name: data.name, slug: data.slug, type: data.type, city: data.city, country: data.country, subscription_status: data.subscription_status } });
            return res.status(201).json(data);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Customers API error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}, { allowPlatformAdmin: true });

