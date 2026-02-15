import { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/apiAuth";

/**
 * Public registration endpoint.
 * Creates auth user + organization + membership atomically using service role.
 * No authentication required (this IS the signup flow).
 *
 * New schema flow:
 *   1. Create auth user (trigger handle_new_user creates profile automatically)
 *   2. Create organization with slug
 *   3. Create organization_membership (role: owner)
 *   4. Update profile with default_organization_id
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { companyName, fullName, email, password, plan } = req.body;

    // Validation
    if (!companyName || !fullName || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Plan → subscription limits
    const planLimits: Record<string, { maxUsers: number; maxPlants: number; maxMachines: number }> = {
        starter: { maxUsers: 6, maxPlants: 2, maxMachines: 100 },
        professional: { maxUsers: 19, maxPlants: 10, maxMachines: 500 },
        enterprise: { maxUsers: 9999, maxPlants: 9999, maxMachines: 9999 },
    };

    const limits = planLimits[plan] || planLimits.professional;

    const supabaseAdmin = getServiceSupabase();

    let authUserId: string | null = null;
    let organizationId: string | null = null;

    try {
        // ── Step 1: Create auth user ─────────────────────────────────
        // The DB trigger handle_new_user will auto-create a profile row
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                display_name: fullName,
                first_name: fullName.split(' ')[0] || fullName,
                last_name: fullName.split(' ').slice(1).join(' ') || null,
            },
        });

        if (authError) {
            if (authError.message?.includes("already been registered")) {
                return res.status(409).json({ error: "Email already registered" });
            }
            console.error("Auth creation error:", authError);
            return res.status(400).json({ error: authError.message });
        }

        if (!authData?.user) {
            return res.status(500).json({ error: "User creation failed" });
        }

        authUserId = authData.user.id;

        // ── Step 2: Generate slug from company name ──────────────────
        let slug = companyName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')  // Remove accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Check uniqueness
        let slugCandidate = slug;
        let counter = 0;
        while (counter < 10) {
            const { data: existing } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('slug', slugCandidate)
                .maybeSingle();

            if (!existing) break;
            counter++;
            slugCandidate = `${slug}-${counter}`;
        }
        if (counter > 0) slug = slugCandidate;

        // ── Step 3: Create organization ──────────────────────────────
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: companyName,
                slug,
                type: 'customer',
                email,
                subscription_status: 'trial',
                subscription_plan: plan || 'professional',
                max_users: limits.maxUsers,
                max_plants: limits.maxPlants,
                max_machines: limits.maxMachines,
            })
            .select('id')
            .single();

        if (orgError) {
            console.error("Organization creation error:", orgError);
            // Rollback: delete auth user
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            return res.status(500).json({ error: "Failed to create organization" });
        }

        organizationId = org.id;

        // ── Step 4: Create membership (user = owner) ─────────────────
        const { error: membershipError } = await supabaseAdmin
            .from('organization_memberships')
            .insert({
                organization_id: organizationId,
                user_id: authUserId,
                role: 'owner',
                is_active: true,
                accepted_at: new Date().toISOString(),
            });

        if (membershipError) {
            console.error("Membership creation error:", membershipError);
            // Rollback
            await supabaseAdmin.from('organizations').delete().eq('id', organizationId);
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            return res.status(500).json({ error: "Failed to assign membership" });
        }

        // ── Step 5: Update profile with default org + name ───────────
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                default_organization_id: organizationId,
                first_name: fullName.split(' ')[0] || fullName,
                last_name: fullName.split(' ').slice(1).join(' ') || null,
                display_name: fullName,
            })
            .eq('id', authUserId);

        if (profileError) {
            console.error("Profile update error (non-fatal):", profileError);
            // Non-fatal: user can update profile later
        }

        // ── Success ──────────────────────────────────────────────────
        return res.status(201).json({
            message: "Registration successful",
            user: {
                id: authUserId,
                email,
                organization_id: organizationId,
            },
        });

    } catch (error) {
        console.error("Registration error:", error);

        // Best-effort rollback
        if (organizationId) {
            await supabaseAdmin.from('organization_memberships')
                .delete().eq('organization_id', organizationId).catch(() => { });
            await supabaseAdmin.from('organizations')
                .delete().eq('id', organizationId).catch(() => { });
        }
        if (authUserId) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => { });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}