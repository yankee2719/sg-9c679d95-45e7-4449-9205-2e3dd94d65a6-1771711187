import { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/apiAuth";

/**
 * Public registration endpoint.
 * Creates tenant + auth user + profile atomically using service role.
 * No authentication required (this IS the signup flow).
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

    const validPlans: Record<string, number> = {
        starter: 6,
        professional: 19,
        enterprise: 9999,
    };

    const maxUsers = validPlans[plan] || validPlans.professional;

    const supabaseAdmin = getServiceSupabase();

    let tenantId: string | null = null;
    let authUserId: string | null = null;

    try {
        // Step 1: Create tenant
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({
                name: companyName,
                max_users: maxUsers,
                subscription_status: "active",
            })
            .select("id")
            .single();

        if (tenantError) {
            console.error("Tenant creation error:", tenantError);
            return res.status(500).json({ error: "Failed to create organization" });
        }

        tenantId = tenant.id;

        // Step 2: Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
        });

        if (authError) {
            // Rollback: delete tenant
            await supabaseAdmin.from("tenants").delete().eq("id", tenantId);

            if (authError.message?.includes("already been registered")) {
                return res.status(409).json({ error: "Email already registered" });
            }
            console.error("Auth creation error:", authError);
            return res.status(400).json({ error: authError.message });
        }

        if (!authData?.user) {
            await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
            return res.status(500).json({ error: "User creation failed" });
        }

        authUserId = authData.user.id;

        // Step 3: Create/update profile with admin role and tenant
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id: authUserId,
                    email,
                    full_name: fullName,
                    role: "admin",
                    tenant_id: tenantId,
                    is_active: true,
                },
                { onConflict: "id" }
            );

        if (profileError) {
            console.error("Profile creation error:", profileError);
            // Rollback: delete auth user and tenant
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
            return res.status(500).json({ error: "Profile creation failed" });
        }

        return res.status(201).json({
            message: "Registration successful",
            user: {
                id: authUserId,
                email,
                role: "admin",
                tenant_id: tenantId,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);

        // Best-effort rollback
        if (authUserId) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => { });
        }
        if (tenantId) {
            await supabaseAdmin.from("tenants").delete().eq("id", tenantId).catch(() => { });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}