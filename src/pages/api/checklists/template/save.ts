import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type AppRole = "owner" | "admin" | "supervisor" | "technician" | "viewer";
type ChecklistTemplateInputType = "boolean" | "text" | "number" | "value";

interface SaveChecklistTemplatePayload {
    template_id?: string | null;
    name?: string;
    description?: string | null;
    target_type?: "machine" | "production_line" | string;
    is_active?: boolean;
    items?: Array<{
        title?: string;
        description?: string | null;
        input_type?: ChecklistTemplateInputType | string;
        is_required?: boolean;
        order_index?: number;
    }>;
}

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

function makeUuidV4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
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
            role: (membership.role ?? "technician") as AppRole,
        },
    };
}

function normalizePayload(body: unknown): SaveChecklistTemplatePayload {
    if (!body) return {};
    if (typeof body === "string") {
        try {
            return JSON.parse(body) as SaveChecklistTemplatePayload;
        } catch {
            return {};
        }
    }
    return body as SaveChecklistTemplatePayload;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
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

        if (!["owner", "admin", "supervisor"].includes(ctx.user.role)) {
            return res.status(403).json({ error: "Only admins and supervisors can manage checklist templates." });
        }

        const payload = normalizePayload(req.body);
        const organizationId = ctx.user.organizationId;
        const name = (payload.name ?? "").trim();
        const description = (payload.description ?? "")?.trim() || null;
        const targetType = payload.target_type;
        const isActive = payload.is_active ?? true;
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!name) {
            return res.status(400).json({ error: "Template name is required." });
        }
        if (targetType !== "machine" && targetType !== "production_line") {
            return res.status(400).json({ error: "Invalid target_type." });
        }
        if (items.length === 0) {
            return res.status(400).json({ error: "At least one checklist item is required." });
        }
        if (items.some((item) => !(item.title ?? "").trim())) {
            return res.status(400).json({ error: "All checklist items must have a title." });
        }

        const normalizedItems = items.map((item, index) => ({
            id: makeUuidV4(),
            title: (item.title ?? "").trim(),
            description: (item.description ?? "")?.trim() || null,
            input_type: item.input_type === "text" || item.input_type === "number" || item.input_type === "value"
                ? item.input_type
                : "boolean",
            is_required: Boolean(item.is_required ?? true),
            order_index: Number.isFinite(item.order_index) ? Number(item.order_index) : index,
        }));

        if (!payload.template_id) {
            const newTemplateId = makeUuidV4();

            const { error: insertTemplateError } = await supabase
                .from("checklist_templates")
                .insert({
                    id: newTemplateId,
                    organization_id: organizationId,
                    name,
                    description,
                    target_type: targetType,
                    version: 1,
                    is_active: isActive,
                } as any);

            if (insertTemplateError) {
                return res.status(500).json({ error: insertTemplateError.message || "Failed to create checklist template" });
            }

            const { error: insertItemsError } = await supabase
                .from("checklist_template_items")
                .insert(normalizedItems.map((item, index) => ({
                    id: item.id,
                    template_id: newTemplateId,
                    organization_id: organizationId,
                    title: item.title,
                    description: item.description,
                    input_type: item.input_type,
                    is_required: item.is_required,
                    order_index: index,
                    metadata: {},
                })) as any);

            if (insertItemsError) {
                return res.status(500).json({ error: insertItemsError.message || "Failed to create checklist items" });
            }

            return res.status(200).json({ template_id: newTemplateId, created_new_version: false });
        }

        const templateId = payload.template_id;

        const { data: currentTemplate, error: currentTemplateError } = await supabase
            .from("checklist_templates")
            .select("id, organization_id, version")
            .eq("id", templateId)
            .eq("organization_id", organizationId)
            .maybeSingle();

        if (currentTemplateError) {
            return res.status(500).json({ error: currentTemplateError.message || "Failed to load current template" });
        }

        if (!currentTemplate) {
            return res.status(404).json({ error: "Checklist template not found." });
        }

        const nextVersion = Number((currentTemplate as any).version ?? 1) + 1;

        const { error: updateTemplateError } = await supabase
            .from("checklist_templates")
            .update({
                name,
                description,
                target_type: targetType,
                is_active: isActive,
                version: nextVersion,
            } as any)
            .eq("id", templateId)
            .eq("organization_id", organizationId);

        if (updateTemplateError) {
            return res.status(500).json({ error: updateTemplateError.message || "Failed to update checklist template" });
        }

        const { error: deleteItemsError } = await supabase
            .from("checklist_template_items")
            .delete()
            .eq("template_id", templateId)
            .eq("organization_id", organizationId);

        if (deleteItemsError) {
            return res.status(500).json({ error: deleteItemsError.message || "Failed to replace checklist items" });
        }

        const { error: reinsertItemsError } = await supabase
            .from("checklist_template_items")
            .insert(normalizedItems.map((item, index) => ({
                id: item.id,
                template_id: templateId,
                organization_id: organizationId,
                title: item.title,
                description: item.description,
                input_type: item.input_type,
                is_required: item.is_required,
                order_index: index,
                metadata: {},
            })) as any);

        if (reinsertItemsError) {
            return res.status(500).json({ error: reinsertItemsError.message || "Failed to save checklist items" });
        }

        return res.status(200).json({ template_id: templateId, created_new_version: false });
    } catch (error: any) {
        console.error("Checklist template save API fatal error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}
