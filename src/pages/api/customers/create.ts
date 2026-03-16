import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        companyName,
        city,
        email,
        phone,
        supervisorName,
        supervisorEmail,
        supervisorPassword,
    } = req.body ?? {};

    if (!companyName || !supervisorName || !supervisorEmail || !supervisorPassword) {
        return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }

    if (String(supervisorPassword).length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    const manufacturerOrgId = req.user.organizationId;
    if (!manufacturerOrgId) {
        return res.status(403).json({ error: "Organizzazione attiva non valida" });
    }

    const supabaseAdmin = getServiceSupabase();

    let supervisorUserId: string | null = null;
    let customerOrgId: string | null = null;

    try {
        const { data: mfrOrg, error: mfrOrgError } = await supabaseAdmin
            .from("organizations")
            .select("id, type")
            .eq("id", manufacturerOrgId)
            .maybeSingle();

        if (mfrOrgError) {
            return res.status(500).json({ error: mfrOrgError.message });
        }

        if (!mfrOrg || mfrOrg.type !== "manufacturer") {
            return res.status(403).json({ error: "Organizzazione costruttore non valida" });
        }

        let slug = String(companyName)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        if (!slug) {
            slug = `customer-${Date.now()}`;
        }

        let slugCandidate = slug;
        let counter = 0;

        while (counter < 10) {
            const { data: existing, error: existingError } = await supabaseAdmin
                .from("organizations")
                .select("id")
                .eq("slug", slugCandidate)
                .maybeSingle();

            if (existingError) {
                return res.status(500).json({ error: existingError.message });
            }

            if (!existing) break;
            counter += 1;
            slugCandidate = `${slug}-${counter}`;
        }

        slug = slugCandidate;

        const { data: org, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert({
                name: companyName,
                slug,
                type: "customer",
                manufacturer_org_id: manufacturerOrgId,
                email: email || null,
                phone: phone || null,
                city: city || null,
                subscription_status: "active",
                subscription_plan: "professional",
                max_users: 19,
                max_plants: 10,
                max_machines: 500,
            })
            .select("id")
            .single();

        if (orgError || !org) {
            return res.status(500).json({ error: orgError?.message || "Errore nella creazione organizzazione" });
        }

        customerOrgId = org.id;

        const firstName = String(supervisorName).split(" ")[0] || supervisorName;
        const lastName = String(supervisorName).split(" ").slice(1).join(" ") || null;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: supervisorEmail,
            password: supervisorPassword,
            email_confirm: true,
            user_metadata: {
                display_name: supervisorName,
                first_name: firstName,
                last_name: lastName,
            },
        });

        if (authError || !authData?.user) {
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId);

            if (authError?.message?.includes("already been registered")) {
                return res.status(409).json({ error: "Email supervisor già registrata" });
            }

            return res.status(400).json({ error: authError?.message || "Errore nella creazione utente" });
        }

        supervisorUserId = authData.user.id;

        const { error: membershipError } = await supabaseAdmin
            .from("organization_memberships")
            .insert({
                organization_id: customerOrgId,
                user_id: supervisorUserId,
                role: "supervisor",
                is_active: true,
                invited_by: req.user.id,
                invited_at: new Date().toISOString(),
                accepted_at: new Date().toISOString(),
            });

        if (membershipError) {
            await supabaseAdmin.auth.admin.deleteUser(supervisorUserId);
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId);
            return res.status(500).json({ error: "Errore nella creazione membership" });
        }

        await supabaseAdmin
            .from("profiles")
            .update({
                default_organization_id: customerOrgId,
                first_name: firstName,
                last_name: lastName,
                display_name: supervisorName,
            })
            .eq("id", supervisorUserId);

        return res.status(201).json({
            message: "Cliente creato con successo",
            customer: {
                organization_id: customerOrgId,
                name: companyName,
                supervisor: {
                    user_id: supervisorUserId,
                    email: supervisorEmail,
                    name: supervisorName,
                },
            },
        });
    } catch (error) {
        console.error("Create customer error:", error);

        if (supervisorUserId) {
            await supabaseAdmin.from("organization_memberships").delete().eq("user_id", supervisorUserId).catch(() => { });
            await supabaseAdmin.auth.admin.deleteUser(supervisorUserId).catch(() => { });
        }

        if (customerOrgId) {
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId).catch(() => { });
        }

        return res.status(500).json({ error: "Errore interno" });
    }
}

export default withAuth(["owner", "admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});