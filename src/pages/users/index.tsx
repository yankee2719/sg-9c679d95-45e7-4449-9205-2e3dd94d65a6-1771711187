import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Search, Shield, Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadCsv } from "@/lib/downloadCsv";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/feedback/EmptyState";
import UserRoleBadge from "@/components/users/UserRoleBadge";
import { Button } from "@/components/ui/button";

interface MembershipRow { id: string; user_id: string; role: string | null; is_active: boolean; created_at: string | null; organization_id: string; }
interface ProfileRow { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null; }
interface UserListRow { membership_id: string; user_id: string; role: string | null; is_active: boolean; created_at: string | null; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null; }

function formatDate(value: string | null | undefined, lang: string) {
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
    const { t, language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < UserListRow[] > ([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const orgId = organization?.id ?? null;
    const orgName = organization?.name ?? t("users.organization") || "Organizzazione";
    const orgType = organization?.type ?? null;
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
        return (<OrgContextGuard><MainLayout userRole={userRole}><SEO title={`${t("nav.users")} - MACHINA`} /><div className="mx-auto max-w-7xl px-4 py-8"><Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{t("users.loading") || t("common.loading")}</CardContent></Card></div></MainLayout></OrgContextGuard>);
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("nav.users")} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{t("nav.users")}</h1>
                            <p className="text-base text-muted-foreground">{t("users.subtitle") || `Registro utenti del contesto attivo: ${orgName}.`}</p>
                        </div>
                        <Button variant="outline" onClick={() => downloadCsv("/api/export/users", "utenti.csv")}>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Users className="h-5 w-5" />} title={t("users.kpiTotal") || "Utenti totali"} value={stats.total} />
                        <KpiCard icon={<UserCheck className="h-5 w-5" />} title={t("users.kpiActive") || "Utenti attivi"} value={stats.active} tone="success" />
                        <KpiCard icon={<Shield className="h-5 w-5" />} title={t("users.kpiAdmins") || "Ruoli gestionali"} value={stats.admins} />
                        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} title="Viewer" value={stats.viewers} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="grid gap-4 p-6 xl:grid-cols-[1.5fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("users.searchPlaceholder") || "Cerca nome, email, ruolo..."} className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                            </div>
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none">
                                <option value="all">{t("users.allRoles") || "Tutti i ruoli"}</option>
                                {availableRoles.map((role) => (<option key={role} value={role.toLowerCase()}>{role}</option>))}
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none">
                                <option value="all">{t("users.allStatuses") || "Tutti gli stati"}</option>
                                <option value="active">{t("users.active") || "Attivi"}</option>
                                <option value="inactive">{t("users.inactive") || "Disattivi"}</option>
                            </select>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState title={t("users.noResults") || "Nessun utente trovato"} description={t("users.noResultsDesc") || "Nessun utente corrisponde ai filtri."} icon={<Users className="h-10 w-10" />} actionLabel={t("nav.dashboard")} actionHref="/dashboard" />
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => (
                                        <div key={row.membership_id} className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="truncate text-lg font-semibold text-foreground">{displayName(row)}</div>
                                                        <UserRoleBadge role={row.role} />
                                                        {row.is_active ? (
                                                            <Badge className="border border-green-300 bg-green-100 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300">{t("users.active") || "Active"}</Badge>
                                                        ) : (
                                                            <Badge className="border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300">{t("users.inactive") || "Inactive"}</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{row.email || "—"}</div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                        <span>User ID: {row.user_id}</span>
                                                        <span>{t("users.created") || "Creato"}: {formatDate(row.created_at, language)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
