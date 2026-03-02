import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { email, password, full_name, role, organization_id } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        if (!role || !["admin", "supervisor", "technician"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        // Use the caller's org if not specified
        const orgId = organization_id || req.user.organizationId;
        if (!orgId) {
            return res.status(400).json({ error: "Organization ID is required" });
        }

        const serviceSupabase = getServiceSupabase();

        // Step 1: Create auth user
        const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                display_name: full_name || null,
                first_name: full_name ? full_name.split(" ")[0] : null,
                last_name: full_name ? full_name.split(" ").slice(1).join(" ") || null : null,
            },
        });

        if (authError) {
            console.error("Error creating auth user:", authError);
            if (authError.message?.includes("already been registered")) {
                return res.status(409).json({ error: "Email già registrata" });
            }
            return res.status(400).json({ error: authError.message });
        }

        if (!authData.user) {
            return res.status(500).json({ error: "Failed to create user" });
        }

        const newUserId = authData.user.id;

        // Step 2: Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 3: Ensure profile exists with correct data
        const { error: profileError } = await serviceSupabase
            .from("profiles")
            .upsert({
                id: newUserId,
                email,
                display_name: full_name || null,
                first_name: full_name ? full_name.split(" ")[0] : null,
                last_name: full_name ? full_name.split(" ").slice(1).join(" ") || null : null,
                default_organization_id: orgId,
            }, { onConflict: "id" });

        if (profileError) {
            console.error("Profile upsert error:", profileError);
            await serviceSupabase.auth.admin.deleteUser(newUserId);
            return res.status(500).json({ error: "Failed to create profile" });
        }

        // Step 4: Create organization membership
        const { error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .insert({
                organization_id: orgId,
                user_id: newUserId,
                role,
                is_active: true,
                invited_by: req.user.id,
                invited_at: new Date().toISOString(),
                accepted_at: new Date().toISOString(),
            });

        if (membershipError) {
            console.error("Membership creation error:", membershipError);
            await serviceSupabase.auth.admin.deleteUser(newUserId);
            return res.status(500).json({ error: "Failed to create membership" });
        }

        return res.status(201).json({
            message: "User created successfully",
            user: { id: newUserId, email, full_name, role },
        });
    } catch (error) {
        console.error("Unexpected error in /api/users/create:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["admin", "supervisor"], handler);
