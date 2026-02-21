import { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/apiAuth";

/**
 * Manufacturer creates a customer organization + supervisor account.
 * Requires authentication (manufacturer admin).
 *
 * Flow:
 *   1. Create customer organization (type: 'customer', linked via manufacturer_org_id)
 *   2. Create auth user for supervisor
 *   3. Create profile for supervisor
 *   4. Create organization_membership (role: supervisor)
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
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
        manufacturerOrgId,
    } = req.body;

    // Validation
    if (!companyName || !supervisorName || !supervisorEmail || !supervisorPassword || !manufacturerOrgId) {
        return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }

    if (supervisorPassword.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    const supabaseAdmin = getServiceSupabase();

    let supervisorUserId: string | null = null;
    let customerOrgId: string | null = null;

    try {
        // ── Verify manufacturer org exists and is type=manufacturer ──
        const { data: mfrOrg } = await supabaseAdmin
            .from("organizations")
            .select("id, type")
            .eq("id", manufacturerOrgId)
            .single();

        if (!mfrOrg || mfrOrg.type !== "manufacturer") {
            return res.status(403).json({ error: "Organizzazione costruttore non valida" });
        }

        // ── Step 1: Generate slug ─────────────────────────────────────
        let slug = companyName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        let slugCandidate = slug;
        let counter = 0;
        while (counter < 10) {
            const { data: existing } = await supabaseAdmin
                .from("organizations")
                .select("id")
                .eq("slug", slugCandidate)
                .maybeSingle();

            if (!existing) break;
            counter++;
            slugCandidate = `${slug}-${counter}`;
        }
        if (counter > 0) slug = slugCandidate;

        // ── Step 2: Create customer organization ──────────────────────
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

        if (orgError) {
            console.error("Org creation error:", orgError);
            return res.status(500).json({ error: "Errore nella creazione organizzazione" });
        }

        customerOrgId = org.id;

        // ── Step 3: Create supervisor auth user ────────────────────────
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: supervisorEmail,
            password: supervisorPassword,
            email_confirm: true,
            user_metadata: {
                display_name: supervisorName,
                first_name: supervisorName.split(" ")[0] || supervisorName,
                last_name: supervisorName.split(" ").slice(1).join(" ") || null,
            },
        });

        if (authError) {
            console.error("Auth error:", authError);
            // Rollback org
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId);
            if (authError.message?.includes("already been registered")) {
                return res.status(409).json({ error: "Email supervisor già registrata" });
            }
            return res.status(400).json({ error: authError.message });
        }

        if (!authData?.user) {
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId);
            return res.status(500).json({ error: "Errore nella creazione utente" });
        }

        supervisorUserId = authData.user.id;

        // ── Step 4: Create membership (supervisor) ─────────────────────
        const { error: membershipError } = await supabaseAdmin
            .from("organization_memberships")
            .insert({
                organization_id: customerOrgId,
                user_id: supervisorUserId,
                role: "supervisor",
                is_active: true,
                invited_by: null, // Could be set to the manufacturer admin's user ID
                invited_at: new Date().toISOString(),
                accepted_at: new Date().toISOString(),
            });

        if (membershipError) {
            console.error("Membership error:", membershipError);
            await supabaseAdmin.auth.admin.deleteUser(supervisorUserId);
            await supabaseAdmin.from("organizations").delete().eq("id", customerOrgId);
            return res.status(500).json({ error: "Errore nella creazione membership" });
        }

        // ── Step 5: Update profile ─────────────────────────────────────
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                default_organization_id: customerOrgId,
                first_name: supervisorName.split(" ")[0] || supervisorName,
                last_name: supervisorName.split(" ").slice(1).join(" ") || null,
                display_name: supervisorName,
            })
            .eq("id", supervisorUserId);

        if (profileError) {
            console.error("Profile update error (non-fatal):", profileError);
        }

        // ── Success ─────────────────────────────────────────────────────
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

        // Best-effort rollback
        if (supervisorUserId) {
            await supabaseAdmin.from("organization_memberships")
                .delete().eq("user_id", supervisorUserId).catch(() => { });
            await supabaseAdmin.auth.admin.deleteUser(supervisorUserId).catch(() => { });
        }
        if (customerOrgId) {
            await supabaseAdmin.from("organizations")
                .delete().eq("id", customerOrgId).catch(() => { });
        }

        return res.status(500).json({ error: "Errore interno" });
    }
}
