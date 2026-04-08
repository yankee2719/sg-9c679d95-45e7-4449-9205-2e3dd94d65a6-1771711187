import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    createOrganizationUser,
    isValidOrganizationUserRole,
    UserProvisioningError,
} from "@/lib/server/userProvisioning";
import { isAdminLikeRole } from "@/lib/roles";

async function listUsers(req: AuthenticatedRequest, res: NextApiResponse) {
    if (!req.user.organizationId) {
        return res.status(400).json({ error: "No active organization context" });
    }

    const serviceSupabase = getServiceSupabase();
    const { data: memberships, error } = await serviceSupabase
        .from("organization_memberships")
        .select("id, user_id, role, is_active, created_at, accepted_at")
        .eq("organization_id", req.user.organizationId)
        .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const userIds = Array.from(new Set((memberships ?? []).map((m: any) => m.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await serviceSupabase
            .from("profiles")
            .select("id, email, display_name, first_name, last_name, avatar_url")
            .in("id", userIds);
        if (profileError) return res.status(500).json({ error: profileError.message });
        profiles = profileRows ?? [];
    }

    const profileMap = new Map(profiles.map((profile: any) => [profile.id, profile]));
    const data = (memberships ?? []).map((membership: any) => {
        const profile = profileMap.get(membership.user_id);
        return {
            id: membership.user_id,
            membership_id: membership.id,
            email: profile?.email || "",
            display_name: profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            avatar_url: profile?.avatar_url || null,
            created_at: membership.created_at,
            accepted_at: membership.accepted_at,
            role: membership.role,
            is_active: membership.is_active ?? true,
        };
    });

    return res.status(200).json({ data });
}

async function createUser(req: AuthenticatedRequest, res: NextApiResponse) {
    const { email, password, full_name, role, organization_id } = req.body ?? {};
    const targetOrganizationId =
        typeof organization_id === "string" && organization_id.trim().length > 0
            ? organization_id.trim()
            : req.user.organizationId;

    if (!targetOrganizationId) {
        return res.status(400).json({ error: "No active organization context" });
    }

    if (!email || !password || !isValidOrganizationUserRole(role)) {
        return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const { data: actorMembership, error: actorError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role")
            .eq("organization_id", targetOrganizationId)
            .eq("user_id", req.user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (actorError) return res.status(500).json({ error: actorError.message });
        if (!req.user.isPlatformAdmin && (!actorMembership || !isAdminLikeRole(actorMembership.role))) {
            return res.status(403).json({ error: "Only organization admins can create users" });
        }

        const created = await createOrganizationUser(serviceSupabase, {
            actor: req.user,
            organizationId: targetOrganizationId,
            email: String(email),
            password: String(password),
            fullName: typeof full_name === "string" ? full_name : null,
            role,
        });

        return res.status(201).json({
            data: {
                ok: true,
                user_id: created.userId,
                membership_id: created.membershipId,
                email: created.email,
            },
        });
    } catch (error) {
        if (error instanceof UserProvisioningError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unexpected server error",
        });
    }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method === "GET") return listUsers(req, res);
    if (req.method === "POST") return createUser(req, res);
    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(["technician"], handler, { requireAal2: false });
