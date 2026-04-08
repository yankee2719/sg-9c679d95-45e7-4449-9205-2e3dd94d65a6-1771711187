import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { isAdminLikeRole, normalizeRoleForStorage } from "@/lib/roles";

async function ensureAdmin(req: AuthenticatedRequest) {
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
        .from("organization_memberships")
        .select("id, role")
        .eq("organization_id", req.user.organizationId)
        .eq("user_id", req.user.id)
        .eq("is_active", true)
        .maybeSingle();
    return { serviceSupabase, actorMembership: data, actorError: error };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Invalid membership ID" });
    if (!req.user.organizationId) return res.status(400).json({ error: "No active organization context" });

    const { serviceSupabase, actorMembership, actorError } = await ensureAdmin(req);
    if (actorError) return res.status(500).json({ error: actorError.message });
    if (!actorMembership || !isAdminLikeRole(actorMembership.role)) {
        return res.status(403).json({ error: "Only organization admins can manage users" });
    }

    const { data: targetMembership, error: targetError } = await serviceSupabase
        .from("organization_memberships")
        .select("id, user_id, role, is_active")
        .eq("id", id)
        .eq("organization_id", req.user.organizationId)
        .maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!targetMembership) return res.status(404).json({ error: "Membership not found" });

    if (req.method === "PATCH") {
        const { display_name, role, is_active } = req.body ?? {};
        const storedRole = role !== undefined ? normalizeRoleForStorage(role) : undefined;
        if (role !== undefined && !storedRole) {
            return res.status(400).json({ error: "Invalid role. Allowed roles: admin, supervisor, technician" });
        }
        if (targetMembership.user_id === req.user.id) {
            if (is_active === false) return res.status(400).json({ error: "You cannot deactivate yourself" });
            if (storedRole && storedRole !== targetMembership.role) return res.status(400).json({ error: "You cannot change your own role" });
        }

        const membershipUpdate: Record<string, unknown> = {};
        if (storedRole !== undefined) membershipUpdate.role = storedRole;
        if (is_active !== undefined) {
            membershipUpdate.is_active = Boolean(is_active);
            membershipUpdate.deactivated_at = Boolean(is_active) ? null : new Date().toISOString();
            membershipUpdate.deactivated_by = Boolean(is_active) ? null : req.user.id;
        }
        if (Object.keys(membershipUpdate).length > 0) {
            const { error } = await serviceSupabase.from("organization_memberships").update(membershipUpdate as any).eq("id", targetMembership.id);
            if (error) return res.status(500).json({ error: error.message });
        }
        if (display_name !== undefined) {
            const fullName = String(display_name || "").trim();
            const parts = fullName.split(" ").filter(Boolean);
            const { error } = await serviceSupabase.from("profiles").update({
                display_name: fullName || null,
                first_name: parts[0] ?? null,
                last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
                updated_at: new Date().toISOString(),
            } as any).eq("id", targetMembership.user_id);
            if (error) return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ data: { membership_id: targetMembership.id, user_id: targetMembership.user_id } });
    }

    if (req.method === "DELETE") {
        if (targetMembership.user_id === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own membership" });
        }
        const { error } = await serviceSupabase.from("organization_memberships").delete().eq("id", targetMembership.id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ data: { membership_id: targetMembership.id, user_id: targetMembership.user_id } });
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(["admin"], handler, { requireAal2: true });
