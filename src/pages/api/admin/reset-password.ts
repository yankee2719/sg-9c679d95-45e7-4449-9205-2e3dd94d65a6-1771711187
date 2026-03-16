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

    try {
        const { userId, newPassword } = req.body ?? {};

        if (!userId || typeof userId !== "string") {
            return res.status(400).json({ error: "userId is required" });
        }

        if (!newPassword || typeof newPassword !== "string") {
            return res.status(400).json({ error: "newPassword is required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        if (userId === req.user.id) {
            return res.status(400).json({
                error: "Use the standard password change/reset flow for your own account",
            });
        }

        const supabaseAdmin = getServiceSupabase();

        let targetOrganizationId: string | null = null;

        if (req.user.isPlatformAdmin) {
            const { data: anyMembership, error: membershipError } = await supabaseAdmin
                .from("organization_memberships")
                .select("organization_id, user_id, is_active")
                .eq("user_id", userId)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

            if (membershipError) {
                return res.status(500).json({ error: membershipError.message });
            }

            if (!anyMembership) {
                return res.status(404).json({ error: "Target user has no active organization membership" });
            }

            targetOrganizationId = anyMembership.organization_id;
        } else {
            if (!req.user.organizationId) {
                return res.status(400).json({ error: "No active organization context" });
            }

            const { data: targetMembership, error: membershipError } = await supabaseAdmin
                .from("organization_memberships")
                .select("organization_id, user_id, is_active")
                .eq("user_id", userId)
                .eq("organization_id", req.user.organizationId)
                .eq("is_active", true)
                .maybeSingle();

            if (membershipError) {
                return res.status(500).json({ error: membershipError.message });
            }

            if (!targetMembership) {
                return res.status(404).json({ error: "User not found in your organization" });
            }

            targetOrganizationId = targetMembership.organization_id;
        }

        const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getUserError || !userData?.user) {
            return res.status(404).json({ error: "User not found in authentication system" });
        }

        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
        });

        if (updateError || !updateData?.user) {
            return res.status(500).json({ error: updateError?.message || "Failed to reset password" });
        }

        if (targetOrganizationId) {
            await supabaseAdmin
                .from("audit_logs")
                .insert({
                    organization_id: targetOrganizationId,
                    actor_user_id: req.user.id,
                    entity_type: "user",
                    entity_id: userId,
                    action: "update",
                    metadata: {
                        event: "admin_password_reset",
                        target_email: updateData.user.email ?? null,
                        reset_by_platform_admin: req.user.isPlatformAdmin,
                    },
                    new_data: {
                        password_reset_at: new Date().toISOString(),
                    },
                })
                .then(() => undefined)
                .catch((error) => {
                    console.error("Audit log insert failed (non-fatal):", error);
                });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
            user: {
                id: updateData.user.id,
                email: updateData.user.email,
            },
        });
    } catch (error) {
        console.error("Error in /api/admin/reset-password:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});