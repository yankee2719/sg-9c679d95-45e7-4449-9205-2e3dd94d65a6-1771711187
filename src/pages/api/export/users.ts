import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

function csvEscape(value: unknown) {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const orgId = req.user.organizationId;
        const serviceSupabase = getServiceSupabase();

        const { data: memberships, error: membershipsError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, role, is_active, created_at, organization_id")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });

        if (membershipsError) {
            return res.status(500).json({ error: membershipsError.message });
        }

        const userIds = Array.from(
            new Set((memberships ?? []).map((row: any) => row.user_id).filter(Boolean))
        );

        let profileMap = new Map < string, any> ();

        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await serviceSupabase
                .from("profiles")
                .select("id, display_name, first_name, last_name, email")
                .in("id", userIds);

            if (profilesError) {
                return res.status(500).json({ error: profilesError.message });
            }

            profileMap = new Map((profiles ?? []).map((row: any) => [row.id, row]));
        }

        const header = [
            "membership_id",
            "user_id",
            "display_name",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "organization_id",
            "created_at",
        ];

        const csv = [
            header.join(","),
            ...(memberships ?? []).map((row: any) => {
                const profile = profileMap.get(row.user_id);

                return [
                    csvEscape(row.id),
                    csvEscape(row.user_id),
                    csvEscape(profile?.display_name),
                    csvEscape(profile?.first_name),
                    csvEscape(profile?.last_name),
                    csvEscape(profile?.email),
                    csvEscape(row.role),
                    csvEscape(row.is_active),
                    csvEscape(row.organization_id),
                    csvEscape(row.created_at),
                ].join(",");
            }),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="users-export.csv"');
        return res.status(200).send(csv);
    } catch (error: any) {
        console.error("Unexpected error in /api/export/users:", error);
        return res.status(500).json({ error: error?.message ?? "Internal server error" });
    }
}

export default withAuth(
    ["owner", "admin", "supervisor"],
    handler,
    { allowPlatformAdmin: true }
);