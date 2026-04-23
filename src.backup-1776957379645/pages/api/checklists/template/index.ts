import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { normalizeRole, type AppRole } from "@/lib/roles";


function getServiceSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function getBearerToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return token || null;
}

async function resolveUserContext(serviceSupabase: ReturnType<typeof getServiceSupabase>, token: string) {
    const {
        data: { user },
        error,
    } = await serviceSupabase.auth.getUser(token);

    if (error || !user) {
        return { error: "Invalid or expired token" as const };
    }

    const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .maybeSingle();

    const defaultOrganizationId = (profile as any)?.default_organization_id ?? null;

    let membership: any = null;
    if (defaultOrganizationId) {
        const { data } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role, organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", defaultOrganizationId)
            .eq("is_active", true)
            .maybeSingle();
        membership = data ?? null;
    }

    if (!membership) {
        const { data } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role, organization_id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();
        membership = data ?? null;
    }

    if (!membership?.organization_id) {
        return { error: "User has no active membership" as const };
    }

    return {
        user: {
            id: user.id,
            organizationId: membership.organization_id as string,
            role: normalizeRole(membership.role ?? null) as AppRole,
        },
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ error: "Missing or invalid authorization header" });
        }

        const supabase = getServiceSupabase();
        const ctx = await resolveUserContext(supabase, token);
        if ("error" in ctx) {
            return res.status(401).json({ error: ctx.error });
        }

        const organizationId = ctx.user.organizationId;

        const { data: templates, error: templatesError } = await supabase
            .from("checklist_templates")
            .select("id, name, description, target_type, version, is_active, created_at")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false });

        if (templatesError) {
            return res.status(500).json({ error: templatesError.message || "Failed to load checklist templates" });
        }

        const templateRows = (templates ?? []) as Array<{
            id: string;
            name: string | null;
            description: string | null;
            target_type: string | null;
            version: number | null;
            is_active: boolean | null;
            created_at: string | null;
        }>;

        if (templateRows.length === 0) {
            return res.status(200).json({ rows: [] });
        }

        const templateIds = templateRows.map((row) => row.id);
        const { data: itemRows, error: itemsError } = await supabase
            .from("checklist_template_items")
            .select("template_id")
            .in("template_id", templateIds);

        if (itemsError) {
            return res.status(500).json({ error: itemsError.message || "Failed to load checklist items" });
        }

        const countMap = new Map<string, number>();
        for (const row of itemRows ?? []) {
            const templateId = (row as any).template_id as string | undefined;
            if (!templateId) continue;
            countMap.set(templateId, (countMap.get(templateId) ?? 0) + 1);
        }

        return res.status(200).json({
            rows: templateRows.map((row) => ({
                ...row,
                item_count: countMap.get(row.id) ?? 0,
            })),
        });
    } catch (error: any) {
        console.error("Checklist template catalog API fatal error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}
