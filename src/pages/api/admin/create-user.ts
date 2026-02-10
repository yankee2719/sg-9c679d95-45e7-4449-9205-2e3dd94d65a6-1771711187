import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

/**
 * Admin-only endpoint to create users with profiles.
 * Protected by withAuth — requires a valid JWT with role "admin".
 * Automatically assigns the new user to the admin's tenant.
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { email, password, fullName, role, phone } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        if (!["admin", "supervisor", "technician"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const supabaseAdmin = getServiceSupabase();

        // Resolve the admin's tenant_id so the new user is scoped correctly
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
            .from("profiles")
            .select("tenant_id")
            .eq("id", req.user.id)
            .single();

        if (adminProfileError || !adminProfile?.tenant_id) {
            return res.status(400).json({ error: "Admin tenant not found. Cannot create user without a tenant." });
        }

        // Create user in auth.users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName || "",
            },
        });

        if (authError) {
            console.error("Auth creation error:", authError);
            return res.status(400).json({ error: authError.message });
        }

        if (!authData?.user) {
            return res.status(500).json({ error: "User creation failed" });
        }

        // Create profile with tenant_id inherited from the requesting admin
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id: authData.user.id,
                    email: email,
                    full_name: fullName || "",
                    role: role,
                    phone: phone || null,
                    is_active: true,
                    tenant_id: adminProfile.tenant_id,
                },
                { onConflict: "id" }
            )
            .select()
            .single();

        if (profileError) {
            console.error("Profile creation error:", profileError);

            // Rollback: delete auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

            return res.status(500).json({
                error: "Profile creation failed",
                details: profileError.message,
                code: profileError.code,
            });
        }

        return res.status(201).json({
            message: "User created successfully",
            user: {
                id: authData.user.id,
                email: authData.user.email,
                profile: profileData,
            },
        });
    } catch (error) {
        console.error("Error in create-user API:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["admin"], handler);