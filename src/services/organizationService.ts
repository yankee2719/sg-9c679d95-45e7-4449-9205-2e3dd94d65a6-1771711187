// src/services/organizationService.ts
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type OrganizationMembership = Database["public"]["Tables"]["organization_memberships"]["Row"];

export interface CreateOrganizationParams {
    name: string;
    slug: string;
    type: "manufacturer" | "company";
    email?: string;
    phone?: string;
}

export interface OrganizationWithMembership extends Organization {
    membership?: OrganizationMembership;
}

export const organizationService = {
    /**
     * Create a new organization with the current user as owner
     * This is the PRIMARY function used during onboarding
     */
    async createOrganizationWithOwner(
        params: CreateOrganizationParams
    ): Promise<{ organizationId: string | null; error: Error | null }> {
        try {
            // Call the database function that handles everything:
            // - Creates organization
            // - Assigns owner role
            // - Updates user's default org
            // - Creates audit log
            const { data, error } = await supabase.rpc(
                "create_organization_with_owner",
                {
                    p_name: params.name,
                    p_slug: params.slug,
                    p_type: params.type,
                    p_email: params.email,
                    p_phone: params.phone,
                }
            );

            if (error) throw error;

            return { organizationId: data as string, error: null };
        } catch (error) {
            console.error("Error creating organization:", error);
            return {
                organizationId: null,
                error: error as Error,
            };
        }
    },

    /**
     * Generate a URL-friendly slug from organization name
     * Ensures uniqueness by checking database
     */
    async generateUniqueSlug(name: string): Promise<string> {
        let slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        let isUnique = false;
        let counter = 0;

        while (!isUnique && counter < 10) {
            const checkSlug = counter === 0 ? slug : `${slug}-${counter}`;

            const { data, error } = await supabase
                .from("organizations")
                .select("id")
                .eq("slug", checkSlug)
                .single();

            if (error && error.code === "PGRST116") {
                // No rows returned = slug is unique
                slug = checkSlug;
                isUnique = true;
            } else if (!error && data) {
                // Slug exists, try next
                counter++;
            } else {
                // Other error
                break;
            }
        }

        return slug;
    },

    /**
     * Get current user's organization
     */
    async getCurrentOrganization(): Promise<Organization | null> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from("profiles")
                .select("default_organization_id")
                .eq("id", user.id)
                .single();

            if (!profile?.default_organization_id) return null;

            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", profile.default_organization_id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error fetching current organization:", error);
            return null;
        }
    },

    /**
     * Get all organizations the user is a member of
     */
    async getUserOrganizations(): Promise<OrganizationWithMembership[]> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return [];

            const { data: memberships, error } = await supabase
                .from("organization_memberships")
                .select(
                    `
          *,
          organization:organizations(*)
        `
                )
                .eq("user_id", user.id)
                .eq("status", "active");

            if (error) throw error;

            return (
                memberships?.map((m: any) => ({
                    ...m.organization,
                    membership: m,
                })) || []
            );
        } catch (error) {
            console.error("Error fetching user organizations:", error);
            return [];
        }
    },

    /**
     * Get organization by ID
     */
    async getOrganizationById(id: string): Promise<Organization | null> {
        try {
            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error fetching organization:", error);
            return null;
        }
    },

    /**
     * Update organization details (requires owner/admin role)
     */
    async updateOrganization(
        id: string,
        updates: Partial<OrganizationInsert>
    ): Promise<{ success: boolean; error: Error | null }> {
        try {
            const { error } = await supabase
                .from("organizations")
                .update(updates)
                .eq("id", id);

            if (error) throw error;

            return { success: true, error: null };
        } catch (error) {
            console.error("Error updating organization:", error);
            return { success: false, error: error as Error };
        }
    },

    /**
     * Complete organization onboarding
     */
    async completeOnboarding(
        organizationId: string
    ): Promise<{ success: boolean; error: Error | null }> {
        try {
            const { error } = await supabase
                .from("organizations")
                .update({
                    onboarding_completed: true,
                    onboarding_completed_at: new Date().toISOString(),
                })
                .eq("id", organizationId);

            if (error) throw error;

            // Also update user profile
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from("profiles")
                    .update({
                        onboarding_completed: true,
                        onboarding_completed_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);
            }

            return { success: true, error: null };
        } catch (error) {
            console.error("Error completing onboarding:", error);
            return { success: false, error: error as Error };
        }
    },

    /**
     * Get organization members
     */
    async getOrganizationMembers(organizationId: string) {
        try {
            const { data, error } = await supabase
                .from("organization_memberships")
                .select(
                    `
          *,
          user:profiles(*)
        `
                )
                .eq("organization_id", organizationId)
                .in("status", ["active", "invited"]);

            if (error) throw error;
            return { members: data || [], error: null };
        } catch (error) {
            console.error("Error fetching members:", error);
            return { members: [], error: error as Error };
        }
    },

    /**
     * Transfer organization ownership (requires current owner role)
     */
    async transferOwnership(
        organizationId: string,
        newOwnerId: string
    ): Promise<{ success: boolean; error: Error | null }> {
        try {
            const { data, error } = await supabase.rpc(
                "transfer_organization_ownership",
                {
                    p_organization_id: organizationId,
                    p_new_owner_id: newOwnerId,
                }
            );

            if (error) throw error;

            return { success: data as boolean, error: null };
        } catch (error) {
            console.error("Error transferring ownership:", error);
            return { success: false, error: error as Error };
        }
    },

    /**
     * Check if user has completed onboarding
     */
    async hasCompletedOnboarding(): Promise<boolean> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_completed, default_organization_id")
                .eq("id", user.id)
                .single();

            return (
                profile?.onboarding_completed === true &&
                profile?.default_organization_id !== null
            );
        } catch (error) {
            console.error("Error checking onboarding status:", error);
            return false;
        }
    },

    /**
     * Get user's role in organization
     */
    async getUserRole(organizationId: string): Promise<string | null> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from("organization_memberships")
                .select("role")
                .eq("organization_id", organizationId)
                .eq("user_id", user.id)
                .eq("status", "active")
                .single();

            if (error) throw error;
            return data?.role || null;
        } catch (error) {
            console.error("Error fetching user role:", error);
            return null;
        }
    },
};
