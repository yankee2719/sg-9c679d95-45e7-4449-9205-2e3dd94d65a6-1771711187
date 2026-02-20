import { supabase } from "@/integrations/supabase/client";

export type ChecklistInputType = "text" | "number" | "boolean" | "select" | "photo";

async function getMyOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("default_organization_id")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return profile?.default_organization_id ?? null;
}

export async function listTemplates() {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error("Organization not found on profile.");

  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*, checklist_template_items(count)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTemplateById(templateId: string) {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error("Organization not found on profile.");

  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*, checklist_template_items(*)")
    .eq("id", templateId)
    .eq("organization_id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function createTemplate(payload: {
  name: string;
  description?: string | null;
  target_type?: "machine" | "production_line";
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const orgId = await getMyOrgId();
  if (!orgId) throw new Error("Organization not found on profile.");

  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({
      organization_id: orgId,
      name: payload.name,
      description: payload.description ?? null,
      target_type: payload.target_type ?? "machine",
      version: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addTemplateItems(items: Array<{
  template_id: string;
  title: string;
  description?: string | null;
  input_type: ChecklistInputType;
  is_required?: boolean;
  order_index: number;
  metadata?: any;
}>) {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error("Organization not found on profile.");

  const rows = items.map(i => ({
    template_id: i.template_id,
    organization_id: orgId,
    title: i.title,
    description: i.description ?? null,
    input_type: i.input_type,
    is_required: i.is_required ?? true,
    order_index: i.order_index,
    metadata: i.metadata ?? {},
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("checklist_template_items")
    .insert(rows);

  if (error) throw error;
}

export async function deleteTemplate(templateId: string) {
  // ON DELETE CASCADE su checklist_template_items se l'hai impostato: ottimo.
  const { error } = await supabase
    .from("checklist_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}