import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Search, Shield, Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface MembershipRow { id: string; user_id: string; role: string | null; is_active: boolean; created_at: string | null; organization_id: string; }
interface ProfileRow { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null; }
interface UserListRow { membership_id: string; user_id: string; role: string | null; is_active: boolean; created_at: string | null; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null; }

const I18N: Record<Language, Record<string, string>> = {
    it: {
        title: "Utenti",
        subtitlePrefix: "Registro utenti del contesto attivo:",
        exportCsv: "Esporta CSV",
        kpiTotal: "Utenti totali",
        kpiActive: "Utenti attivi",
        kpiAdmins: "Ruoli gestionali",
        kpiViewers: "Viewer",
        searchPlaceholder: "Cerca per nome, email o ruolo",
        allRoles: "Tutti i ruoli",
        allStatuses: "Tutti gli stati",
        active: "Attivo",
        inactive: "Inattivo",
        loading: "Caricamento utenti...",
        noResults: "Nessun utente trovato.",
        noResultsDesc: "Nessun utente corrisponde ai filtri selezionati.",
        createdAt: "Creato il",
        orgFallback: "Organizzazione",
    },
    en: {
        title: "Users",
        subtitlePrefix: "User registry for the active organization:",
        exportCsv: "Export CSV",
        kpiTotal: "Total users",
        kpiActive: "Active users",
        kpiAdmins: "Admin roles",
        kpiViewers: "Viewers",
        searchPlaceholder: "Search by name, email or role",
        allRoles: "All roles",
        allStatuses: "All statuses",
        active: "Active",
        inactive: "Inactive",
        loading: "Loading users...",
        noResults: "No users found.",
        noResultsDesc: "No users match the selected filters.",
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
        kpiViewers: "Lecteurs",
        searchPlaceholder: "Rechercher par nom, e-mail ou rôle",
        allRoles: "Tous les rôles",
        allStatuses: "Tous les statuts",
        active: "Actif",
        inactive: "Inactif",
        loading: "Chargement des utilisateurs...",
        noResults: "Aucun utilisateur trouvé.",
        noResultsDesc: "Aucun utilisateur ne correspond aux filtres sélectionnés.",
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
        kpiViewers: "Visualizadores",
        searchPlaceholder: "Buscar por nombre, correo o rol",
        allRoles: "Todos los roles",
        allStatuses: "Todos los estados",
        active: "Activo",
        inactive: "Inactivo",
        loading: "Cargando usuarios...",
        noResults: "No se encontraron usuarios.",
        noResultsDesc: "Ningún usuario coincide con los filtros seleccionados.",
        createdAt: "Creado el",
        orgFallback: "Organización",
    },
};

function formatDate(value: string | null | undefined, lang: Language) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return value; }
}

function displayName(row: UserListRow) {
    return row.display_name?.trim() || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.email || row.user_id;
}

function KpiCard({ icon, title, value, tone = "default" }: { icon: React.ReactNode; title: string; value: number; tone?: "default" | "success"; }) {
    const toneClass = tone === "success" ? "text-green-500" : "text-orange-500";
    return (
        <Card className="rounded-2xl"><CardContent className="p-6">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-current/10 ${toneClass}`}>{icon}</div>
            <div className="text-4xl font-bold text-foreground">{value}</div>
            <div className="mt-2 text-sm text-muted-foreground">{title}</div>
        </CardContent></Card>
    );
}

export default function UsersIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { language } = useLanguage();
    const L = I18N[language] || I18N.en;

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < UserListRow[] > ([]);
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
            if (!orgId) { if (active) setLoading(false); return; }
            setLoading(true);
            try {
                const { data: memberships, error: membershipsError } = await supabase.from("organization_memberships").select("id, user_id, role, is_active, created_at, organization_id").eq("organization_id", orgId).order("created_at", { ascending: false });
                if (membershipsError) throw membershipsError;
                const membershipRows = (memberships ?? []) as MembershipRow[];
                const userIds = Array.from(new Set(membershipRows.map((r) => r.user_id).filter(Boolean)));
                let profileMap = new Map < string, ProfileRow> ();
                if (userIds.length > 0) {
                    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, display_name, first_name, last_name, email").in("id", userIds);
                    if (profilesError) throw profilesError;
                    profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((r) => [r.id, r]));
                }
                const nextRows: UserListRow[] = membershipRows.map((r) => {
                    const profile = profileMap.get(r.user_id);
                    return { membership_id: r.id, user_id: r.user_id, role: r.role, is_active: r.is_active, created_at: r.created_at, display_name: profile?.display_name ?? null, first_name: profile?.first_name ?? null, last_name: profile?.last_name ?? null, email: profile?.email ?? null };
                });
                if (!active) return;
                setRows(nextRows);
            } catch (error) { console.error("Users load error:", error); } finally { if (active) setLoading(false); }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, orgId]);

    const availableRoles = useMemo(() => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))) as string[], [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const matchesSearch = !q || [displayName(row), row.email, row.role].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
            const matchesRole = roleFilter === "all" || String(row.role || "").toLowerCase() === roleFilter;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" && row.is_active) || (statusFilter === "inactive" && !row.is_active);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [rows, search, roleFilter, statusFilter]);

    const stats = useMemo(() => ({
        total: rows.length,
        active: rows.filter((r) => r.is_active).length,
        admins: rows.filter((r) => ["owner", "admin", "supervisor"].includes(String(r.role || "").toLowerCase())).length,
        viewers: rows.filter((r) => String(r.role || "").toLowerCase() === "viewer").length,
    }), [rows]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${L.title} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{L.loading}</CardContent></Card>
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
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{L.title}</h1>
                            <p className="text-base text-muted-foreground">{L.subtitlePrefix} {orgName}.</p>
                        </div>
                        <Button variant="outline" onClick={() => downloadCsv("/api/export/users", "users.csv")}>
                            <Download className="mr-2 h-4 w-4" /> {L.exportCsv}
                        </Button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Users className="h-5 w-5" />} title={L.kpiTotal} value={stats.total} />
                        <KpiCard icon={<UserCheck className="h-5 w-5" />} title={L.kpiActive} value={stats.active} tone="success" />
                        <KpiCard icon={<Shield className="h-5 w-5" />} title={L.kpiAdmins} value={stats.admins} />
                        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} title={L.kpiViewers} value={stats.viewers} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="grid gap-4 p-6 xl:grid-cols-[1.5fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.searchPlaceholder} className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                            </div>
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none">
                                <option value="all">{L.allRoles}</option>
                                {availableRoles.map((role) => (<option key={role} value={role.toLowerCase()}>{role}</option>))}
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none">
                                <option value="all">{L.allStatuses}</option>
                                <option value="active">{L.active}</option>
                                <option value="inactive">{L.inactive}</option>
                            </select>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl"><CardContent className="p-0">
                        {filteredRows.length === 0 ? (
                            <div className="p-6"><EmptyState title={L.noResults} description={L.noResultsDesc} /></div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredRows.map((row) => (
                                    <div key={row.membership_id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <div className="truncate text-base font-semibold text-foreground">{displayName(row)}</div>
                                            <div className="truncate text-sm text-muted-foreground">{row.email || row.user_id}</div>
                                            <div className="text-xs text-muted-foreground">{L.createdAt}: {formatDate(row.created_at, language)}</div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <UserRoleBadge role={row.role || "technician"} />
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${row.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{row.is_active ? L.active : L.inactive}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent></Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
