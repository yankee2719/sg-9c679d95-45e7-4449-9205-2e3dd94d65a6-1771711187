export async function writeAudit({
    supabase,
    userId,
    organizationId,
    action,
    entityType,
    entityId,
}: any) {
    await supabase.from("audit_logs").insert({
        actor_user_id: userId,
        organization_id: organizationId,
        action,
        entity_type: entityType,
        entity_id: entityId,
    });
}