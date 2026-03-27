import { organizationService, type Organization } from "@/services/organizationService";

/**
 * @deprecated MACHINA non usa più il modello tenants/profiles.tenant_id.
 * Questo shim evita query legacy alle tabelle tenants e instrada i punti residui
 * verso organizations, finché i vecchi import non vengono rimossi del tutto.
 */

export type TenantLike = Pick<
    Organization,
    | "id"
    | "name"
    | "slug"
    | "type"
    | "email"
    | "phone"
    | "website"
    | "country"
    | "subscription_status"
    | "subscription_plan"
    | "max_users"
    | "max_plants"
    | "max_machines"
    | "settings"
    | "is_archived"
    | "created_at"
    | "updated_at"
>;

type TenantInsert = Partial<TenantLike> & { name: string; slug: string; type?: TenantLike["type"] };
type TenantUpdate = Partial<TenantLike>;

function toTenantLike(organization: Organization | null): TenantLike | null {
    if (!organization) return null;

    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        email: organization.email,
        phone: organization.phone,
        website: organization.website,
        country: organization.country,
        subscription_status: organization.subscription_status,
        subscription_plan: organization.subscription_plan,
        max_users: organization.max_users,
        max_plants: organization.max_plants,
        max_machines: organization.max_machines,
        settings: organization.settings,
        is_archived: organization.is_archived,
        created_at: organization.created_at,
        updated_at: organization.updated_at,
    };
}

function warnLegacy(method: string) {
    console.warn(
        `[tenantService.${method}] deprecated: usa organizations + organization_memberships invece del modello tenants legacy.`
    );
}

export const tenantService = {
    async getCurrentTenant(): Promise<TenantLike | null> {
        warnLegacy("getCurrentTenant");
        const organization = await organizationService.getCurrentOrganization();
        return toTenantLike(organization);
    },

    async getTenantById(id: string): Promise<TenantLike | null> {
        warnLegacy("getTenantById");
        const organization = await organizationService.getOrganizationById(id);
        return toTenantLike(organization);
    },

    async createTenant(tenant: TenantInsert): Promise<TenantLike | null> {
        warnLegacy("createTenant");

        const slug = tenant.slug?.trim() || (await organizationService.generateUniqueSlug(tenant.name));
        const { organizationId, error } = await organizationService.createOrganization({
            name: tenant.name,
            slug,
            type: (tenant.type as any) || "customer",
            email: tenant.email || undefined,
            phone: tenant.phone || undefined,
        });

        if (error || !organizationId) {
            console.error("Legacy createTenant failed:", error);
            return null;
        }

        const organization = await organizationService.getOrganizationById(organizationId);
        return toTenantLike(organization);
    },

    async updateTenant(id: string, _updates: TenantUpdate): Promise<TenantLike | null> {
        warnLegacy("updateTenant");
        console.warn("tenantService.updateTenant è mantenuto solo per compatibilità e non aggiorna più organizations direttamente.");
        const organization = await organizationService.getOrganizationById(id);
        return toTenantLike(organization);
    },

    async deleteTenant(_id: string): Promise<boolean> {
        warnLegacy("deleteTenant");
        console.warn("tenantService.deleteTenant è disabilitato: usa il flusso platform/org esplicito lato server.");
        return false;
    },

    async listTenants(): Promise<TenantLike[]> {
        warnLegacy("listTenants");
        const organizations = await organizationService.getUserOrganizations();
        return organizations.map((organization) => ({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            type: organization.type,
            email: organization.email,
            phone: organization.phone,
            website: organization.website,
            country: organization.country,
            subscription_status: organization.subscription_status,
            subscription_plan: organization.subscription_plan,
            max_users: organization.max_users,
            max_plants: organization.max_plants,
            max_machines: organization.max_machines,
            settings: organization.settings,
            is_archived: organization.is_archived,
            created_at: organization.created_at,
            updated_at: organization.updated_at,
        }));
    },
};

export default tenantService;
