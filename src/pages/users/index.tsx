import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Search, Shield, Users, Wrench } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { downloadCsv } from "@/lib/downloadCsv";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/feedback/EmptyState";
import UserRoleBadge from "@/components/users/UserRoleBadge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/services/apiClient";

interface UserListRow {
    id: string;
    membership_id: string;
    email: string;
    display_name: string | null;
    avatar_url?: string | null;
    created_at: string | null;
    accepted_at?: string | null;
    role: string | null;
    is_active: boolean;
}

const I18N: Record<Language, Record<string, string>> = {
    it: {
        title: "Utenti",
        subtitlePrefix: "Registro utenti del contesto attivo:",
        exportCsv: "Esporta CSV",
        kpiTotal: "Utenti totali",
        kpiActive: "Utenti attivi",
        kpiAdmins: "Ruoli gestionali",
        kpiTechnicians: "Tecnici",
        searchPlaceholder: "Cerca per nome, email o ruolo",
        allRoles: "Tutti i ruoli",
        allStatuses: "Tutti gli stati",
        active: "Attivo",
        inactive: "Inattivo",
        loading: "Caricamento utenti...",
        noResults: "Nessun utente trovato.",
        noResultsDesc: "Nessun utente corrisponde ai filtri selezionati.",
        loadError: "Impossibile caricare gli utenti.",
        createdAt: "Creato il",
        orgFallback: "Organizzazione",
    },
    en: {
        title: "Users",
        subtitlePrefix: "User registry for the active organization:",
        exportCsv: "Export CSV",
        kpiTotal: "Total users",
        kpiActive: "Active users",
        kpiAdmins: "Management roles",
        kpiTechnicians: "Technicians",
        searchPlaceholder: "Search by name, email or role",
        allRoles: "All roles",
        allStatuses: "All statuses",
        active: "Active",
        inactive: "Inactive",
        loading: "Loading users...",
        noResults: "No users found.",
        noResultsDesc: "No users match the selected filters.",
        loadError: "Unable to load users.",
        createdAt: "Created on",
        orgFallback: "Organization",
    },
    fr: {
        title: "Utilisateurs",
        subtitlePrefix: "Registre des utilisateurs du contexte actif :",
        exportCsv: "Exporter CSV",
        kpiTotal: "Utilisateurs totaux",
        kpiActive: "Utilisateurs actifs",
        kpiAdmins: "Rôles de gestion",
        kpiTechnicians: "Techniciens",
        searchPlaceholder: "Rechercher par nom, e-mail ou rôle",
        allRoles: "Tous les rôles",
        allStatuses: "Tous les statuts",
        active: "Actif",
        inactive: "Inactif",
        loading: "Chargement des utilisateurs...",
        noResults: "Aucun utilisateur trouvé.",
        noResultsDesc: "Aucun utilisateur ne correspond aux filtres sélectionnés.",
        loadError: "Impossible de charger les utilisateurs.",
        createdAt: "Créé le",
        orgFallback: "Organisation",
    },
    es: {
        title: "Usuarios",
        subtitlePrefix: "Registro de usuarios del contexto activo:",
        exportCsv: "Exportar CSV",
        kpiTotal: "Usuarios totales",
        kpiActive: "Usuarios activos",
        kpiAdmins: "Roles de gestión",
        kpiTechnicians: "Técnicos",
        searchPlaceholder: "Buscar por nombre, correo o rol",
        allRoles: "Todos los roles",
        allStatuses: "Todos los estados",
        active: "Activo",
        inactive: "Inactivo",
        loading: "Cargando usuarios...",
        noResults: "No se encontraron usuarios.",
        noResultsDesc: "Ningún usuario coincide con los filtros seleccionados.",
        loadError: "No se pudieron cargar los usuarios.",
        createdAt: "Creado el",
        orgFallback: "Organización",
    },
};

function formatDate(value: string | null | undefined, lang: Language) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

function displayName(row: UserListRow) {
    return row.display_name?.trim() || row.email || row.id;
}

function normalizeRole(role: string | null | undefined) {
    switch (String(role || "").toLowerCase()) {
        case "owner":
            return "admin";
        case "plant_manager":
            return "supervisor";
        case "viewer":
            return "technician";
        case "admin":
        case "supervisor":
        case "technician":
            return String(role).toLowerCase();
        default:
            return String(role || "").toLowerCase();
    }
}

function KpiCard({
    icon,
    title,
    value,
    tone = "default",
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    tone?: "default" | "success";
}) {
    const toneClass = tone === "success" ? "text-green-500" : "text-orange-500";
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-current/10 ${toneClass}`}>
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function UsersIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { language } = useLanguage();
    const L = I18N[language] || I18N.en;

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < UserListRow[] > ([]);
    const [error, setError] = useState < string | null > (null);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const orgId = organization?.id ?? null;
    const orgName = organization?.name ?? L.orgFallback;
    const userRole = membership?.role ?? "technician";

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (!orgId) {
                if (active) {
                    setRows([]);
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await apiFetch < { users: UserListRow[] } > ("/api/users/list");
                if (!active) return;
                setRows(response.users ?? []);
            } catch (err: any) {
                console.error("Users load error:", err);
                if (!active) return;
                setRows([]);
                setError(err?.message || L.loadError);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, orgId, L.loadError]);

    const availableRoles = useMemo(
        () => Array.from(new Set(rows.map((r) => normalizeRole(r.role)).filter(Boolean))) as string[],
        [rows]
    );

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const normalizedRole = normalizeRole(row.role);
            const matchesSearch =
                !q ||
                [displayName(row), row.email, normalizedRole]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));
            const matchesRole = roleFilter === "all" || normalizedRole === roleFilter;
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && row.is_active) ||
                (statusFilter === "inactive" && !row.is_active);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [rows, search, roleFilter, statusFilter]);

    const stats = useMemo(
        () => ({
            total: rows.length,
            active: rows.filter((row) => row.is_active).length,
            admins: rows.filter((row) => ["admin", "supervisor"].includes(normalizeRole(row.role))).length,
            technicians: rows.filter((row) => normalizeRole(row.role) === "technician").length,
        }),
        [rows]
    );

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${L.title} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">{L.loading}</CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${L.title} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{L.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {L.subtitlePrefix} <span className="font-medium text-foreground">{orgName}</span>
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() =>
                                downloadCsv(
                                    filteredRows.map((row) => ({
                                        email: row.email,
                                        display_name: displayName(row),
                                        role: normalizeRole(row.role),
                                        is_active: row.is_active ? L.active : L.inactive,
                                        created_at: formatDate(row.created_at, language),
                                    })),
                                    "machina-users.csv"
                                )
                            }
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {L.exportCsv}
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Users className="h-5 w-5" />} title={L.kpiTotal} value={stats.total} />
                        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} title={L.kpiActive} value={stats.active} tone="success" />
                        <KpiCard icon={<Shield className="h-5 w-5" />} title={L.kpiAdmins} value={stats.admins} />
                        <KpiCard icon={<Wrench className="h-5 w-5" />} title={L.kpiTechnicians} value={stats.technicians} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="space-y-6 p-6">
                            <div className="grid gap-4 lg:grid-cols-[1.6fr_0.7fr_0.7fr]">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={L.searchPlaceholder}
                                        className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none ring-0 transition focus:border-orange-400"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(event) => setRoleFilter(event.target.value)}
                                    className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                                >
                                    <option value="all">{L.allRoles}</option>
                                    {availableRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    className="h-11 rounded-2xl border border-border bg-background px-3 text-sm"
                                >
                                    <option value="all">{L.allStatuses}</option>
                                    <option value="active">{L.active}</option>
                                    <option value="inactive">{L.inactive}</option>
                                </select>
                            </div>

                            {error ? (
                                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    {error}
                                </div>
                            ) : filteredRows.length === 0 ? (
                                <EmptyState title={L.noResults} description={L.noResultsDesc} />
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-border">
                                    <div className="grid grid-cols-[minmax(0,2fr)_140px_140px] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        <div>User</div>
                                        <div>Role</div>
                                        <div>Status</div>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {filteredRows.map((row) => (
                                            <div key={row.membership_id} className="grid grid-cols-[minmax(0,2fr)_140px_140px] gap-4 px-4 py-4">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-foreground">{displayName(row)}</div>
                                                    <div className="truncate text-sm text-muted-foreground">{row.email || "—"}</div>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {L.createdAt}: {formatDate(row.created_at, language)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <UserRoleBadge role={row.role || "technician"} />
                                                </div>
                                                <div className="flex items-center">
                                                    <span
                                                        className={row.is_active
                                                            ? "inline-flex rounded-full border border-green-300 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
                                                            : "inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}
                                                    >
                                                        {row.is_active ? L.active : L.inactive}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

