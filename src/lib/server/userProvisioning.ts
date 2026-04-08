import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { canManageMembers, toWritableOrgRole, type AppRole, type DatabaseOrgRole } from "@/lib/roles";

export class UserProvisioningError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "UserProvisioningError";
        this.statusCode = statusCode;
    }
}

export type OrganizationUserRole = DatabaseOrgRole;
export type ApiActor = AuthenticatedRequest["user"];

export interface CreateOrganizationUserInput {
    actor: ApiActor;
    organizationId: string;
    email: string;
    password: string;
    fullName?: string | null;
    role: AppRole | string;
}

export interface CreateOrganizationUserResult {
    userId: string;
    membershipId: string;
    email: string;
    organizationId: string;
    role: OrganizationUserRole;
    displayName: string | null;
}

export function isValidOrganizationUserRole(value: unknown): value is AppRole {
    const normalized = toWritableOrgRole(value as string, "technician");
    return normalized === "admin" || normalized === "supervisor" || normalized === "technician";
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizeFullName(fullName?: string | null) {
    if (!fullName) return null;
    const value = String(fullName).trim().replace(/\s+/g, " ");
    return value.length > 0 ? value : null;
}

function splitName(fullName: string | null) {
    if (!fullName) {
        return { firstName: null, lastName: null };
    }

    const parts = fullName.split(" ").filter(Boolean);
    return {
        firstName: parts.length > 0 ? parts[0] : null,
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
    };
}

async function ensureOrganizationExists(
    serviceSupabase: SupabaseClient,
    organizationId: string
) {
    const { data: organization, error } = await serviceSupabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .maybeSingle();

    if (error) {
        throw new UserProvisioningError(error.message, 500);
    }

    if (!organization) {
        throw new UserProvisioningError("Organization not found", 404);
    }

    return organization;
}

async function assertActorCanManageOrganization(
    serviceSupabase: SupabaseClient,
    actor: ApiActor,
    organizationId: string
) {
    if (actor.isPlatformAdmin) {
        return;
    }

    if (!actor.organizationId) {
        throw new UserProvisioningError("No active organization context", 400);
    }

    if (actor.organizationId !== organizationId) {
        throw new UserProvisioningError(
            "You can only create users inside your active organization",
            403
        );
    }

    const { data: actorMembership, error } = await serviceSupabase
        .from("organization_memberships")
        .select("id, role, is_active")
        .eq("organization_id", organizationId)
        .eq("user_id", actor.id)
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        throw new UserProvisioningError(error.message, 500);
    }

    if (!actorMembership || !canManageMembers(actorMembership.role)) {
        throw new UserProvisioningError(
            "Only organization admins can create users",
            403
        );
    }
}

export async function createOrganizationUser(
    serviceSupabase: SupabaseClient,
    input: CreateOrganizationUserInput
): Promise<CreateOrganizationUserResult> {
    const organizationId = String(input.organizationId || "").trim();
    const email = normalizeEmail(String(input.email || ""));
    const password = String(input.password || "");
    const displayName = normalizeFullName(input.fullName);
    const role = toWritableOrgRole(input.role, "technician");

    if (!organizationId) {
        throw new UserProvisioningError("organization_id is required", 400);
    }

    if (!email || !password || !isValidOrganizationUserRole(input.role)) {
        throw new UserProvisioningError("Missing or invalid required fields", 400);
    }

    if (password.length < 8) {
        throw new UserProvisioningError("Password must be at least 8 characters", 400);
    }

    await ensureOrganizationExists(serviceSupabase, organizationId);
    await assertActorCanManageOrganization(serviceSupabase, input.actor, organizationId);

    let createdUserId: string | null = null;

    try {
        const { data: createdAuthUser, error: createUserError } =
            await serviceSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: displayName,
                    display_name: displayName,
                },
            });

        if (createUserError || !createdAuthUser.user) {
            throw new UserProvisioningError(
                createUserError?.message ?? "User creation failed",
                400
            );
        }

        createdUserId = createdAuthUser.user.id;

        const { firstName, lastName } = splitName(displayName);

        const { error: profileError } = await serviceSupabase.from("profiles").upsert(
            {
                id: createdUserId,
                email,
                display_name: displayName,
                first_name: firstName,
                last_name: lastName,
                default_organization_id: organizationId,
            } as any,
            { onConflict: "id" }
        );

        if (profileError) {
            throw new UserProvisioningError(profileError.message, 500);
        }

        const { data: insertedMembership, error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .insert({
                organization_id: organizationId,
                user_id: createdUserId,
                role,
                is_active: true,
                accepted_at: new Date().toISOString(),
                invited_by: input.actor.id,
            } as any)
            .select("id")
            .single();

        if (membershipError || !insertedMembership) {
            throw new UserProvisioningError(
                membershipError?.message ?? "Membership creation failed",
                500
            );
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: organizationId,
                actor_user_id: input.actor.id,
                entity_type: "user_membership",
                entity_id: insertedMembership.id,
                action: "create",
                metadata: {
                    target_user_id: createdUserId,
                    target_email: email,
                    target_role: role,
                    source: "organization_user_provisioning",
                },
            } as any)
            .then(() => undefined)
            .catch((error) => {
                console.error("Audit log insert failed (non-fatal):", error);
            });

        return {
            userId: createdUserId,
            membershipId: insertedMembership.id,
            email,
            organizationId,
            role,
            displayName,
        };
    } catch (error) {
        if (createdUserId) {
            try {
                await serviceSupabase.auth.admin.deleteUser(createdUserId);
            } catch (rollbackError) {
                console.error("Rollback deleteUser error:", rollbackError);
            }
        }

        if (error instanceof UserProvisioningError) {
            throw error;
        }

        throw new UserProvisioningError(
            error instanceof Error ? error.message : "Unexpected provisioning error",
            500
        );
    }
}
