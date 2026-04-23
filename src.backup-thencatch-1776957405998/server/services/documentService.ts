export async function createDocument({
    supabase,
    payload,
    userId,
}: {
    supabase: any;
    payload: any;
    userId: string;
}) {
    const { organizationId, title } = payload;

    if (!organizationId || !title) {
        throw new Error("Missing data");
    }

    const { data, error } = await supabase
        .from("documents")
        .insert({
            organization_id: organizationId,
            title,
            created_by: userId,
            is_archived: false,
        })
        .select("*")
        .single();

    if (error) throw error;

    return data;
}