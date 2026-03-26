import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

type AppRole = "owner" | "admin" | "supervisor" | "technician" | "viewer";
const ALLOWED_ROLES: AppRole[] = ["owner", "admin", "supervisor", "technician", "viewer"];

function isValidRole(value: unknown): value is AppRole {
    return ALLOWED_ROLES.includes(String(value) as AppRole);
}

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
    const { email, password, full_name, role } = req.body ?? {};
    if (!req.user.organizationId) {
        return res.status(400).json({ error: "No active organization context" });
    }
    if (!email || !password || !isValidRole(role)) {
        return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    const serviceSupabase = getServiceSupabase();
    const { data: actorMembership, error: actorError } = await serviceSupabase
        .from("organization_memberships")
        .select("id, role")
        .eq("organization_id", req.user.organizationId)
        .eq("user_id", req.user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (actorError) return res.status(500).json({ error: actorError.message });
    if (!actorMembership && !req.user.isPlatformAdmin) return res.status(403).json({ error: "Forbidden" });
    if (!req.user.isPlatformAdmin && !["owner", "admin"].includes(actorMembership?.role ?? "")) {
        return res.status(403).json({ error: "Only organization admins can create users" });
    }

    const cleanName = String(full_name || "").trim();
    const parts = cleanName.split(" ").filter(Boolean);

    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: cleanName || undefined },
    });

    if (authError || !authData.user) {
        return res.status(500).json({ error: authError?.message || "Failed to create auth user" });
    }

    const newUserId = authData.user.id;
    const now = new Date().toISOString();

    const { error: profileError } = await serviceSupabase.from("profiles").upsert({
        id: newUserId,
        email: String(email).trim().toLowerCase(),
        display_name: cleanName || null,
        first_name: parts[0] ?? null,
        last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
        updated_at: now,
    } as any);
    if (profileError) return res.status(500).json({ error: profileError.message });

    const { data: membership, error: membershipError } = await serviceSupabase
        .from("organization_memberships")
        .insert({
            organization_id: req.user.organizationId,
            user_id: newUserId,
            role,
            is_active: true,
            accepted_at: now,
            invited_by: req.user.id,
        } as any)
        .select("id")
        .single();
    if (membershipError) return res.status(500).json({ error: membershipError.message });

    await serviceSupabase.from("audit_logs").insert({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.id,
        entity_type: "user_membership",
        entity_id: membership.id,
        action: "create",
        metadata: { target_user_id: newUserId },
        new_data: { email: String(email).trim().toLowerCase(), role },
    } as any).then(() => undefined).catch(() => undefined);

    return res.status(201).json({
        data: {
            ok: true,
            user_id: newUserId,
            membership_id: membership.id,
            email: String(email).trim().toLowerCase(),
        },
    });
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method === "GET") return listUsers(req, res);
    if (req.method === "POST") return createUser(req, res);
    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], handler, { requireAal2: false });
