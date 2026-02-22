import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    QrCode,
    ArrowRight,
    Wrench,
    ClipboardList,
    Clock,
    ChevronRight,
    AlertTriangle,
    Users,
    Shield,
    Globe,
    Factory,
    Building2,
    Package,
    UserPlus,
} from "lucide-react";
import {
    useLanguage,
    type Language,
    languageFlags,
    languageNames,
} from "@/contexts/LanguageContext";

function DashboardInner() {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [orgType, setOrgType] = useState < string | null > (null);
    const [userName, setUserName] = useState("User");

    const [stats, setStats] = useState({
        totalMachines: 0,
        activeChecklists: 0,
        upcomingMaintenance: 0,
        overdueItems: 0,
    });

    const [userStats, setUserStats] = useState({
        total: 0,
        admins: 0,
        supervisors: 0,
        technicians: 0,
    });

    const [machineList, setMachineList] = useState < any[] > ([]);
    const [mfrStats, setMfrStats] = useState({
        totalMachines: 0,
        totalCustomers: 0,
        totalAssignments: 0,
        totalDocs: 0,
    });

    const [customerList, setCustomerList] = useState < any[] > ([]);
    const [recentMachines, setRecentMachines] = useState < any[] > ([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setUserName(ctx.displayName);
                setUserRole(ctx.role);
                setOrgType(ctx.orgType);

                if (ctx.orgType === "manufacturer") {
                    await loadManufacturerDashboard(ctx.orgId!);
                } else {
                    await loadCustomerDashboard();
                    if (ctx.role === "admin") await loadUserStats(ctx.orgId!);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const loadCustomerDashboard = async () => {
        try {
            const { count: machineCount } = await supabase
                .from("machines")
                .select("*", { count: "exact", head: true });

            const { count: checkCount } = await supabase
                .from("checklists")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const nowIso = new Date().toISOString();

            const { count: upcomingCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .lte("next_due_date", futureDate.toISOString())
                .gte("next_due_date", nowIso);

            const { count: overdueCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .lt("next_due_date", nowIso);

            const { data: machines } = await supabase
                .from("machines")
                .select("id, name, position, category, lifecycle_state, photo_url")
                .order("created_at", { ascending: false })
                .limit(5);

            setStats({
                totalMachines: machineCount || 0,
                activeChecklists: checkCount || 0,
                upcomingMaintenance: upcomingCount || 0,
                overdueItems: overdueCount || 0,
            });

            setMachineList(machines || []);
        } catch (error) {
            console.error(error);
        }
    };

    const loadUserStats = async (orgId: string) => {
        try {
            const { data: members } = await supabase
                .from("organization_memberships")
                .select("role")
                .eq("organization_id", orgId)
                .eq("is_active", true);

            if (members) {
                setUserStats({
                    total: members.length,
                    admins: members.filter((m) => m.role === "admin").length,
                    supervisors: members.filter((m) => m.role === "supervisor").length,
                    technicians: members.filter((m) => m.role === "technician").length,
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadManufacturerDashboard = async (orgId: string) => {
        try {
            const { count: machineCount } = await supabase
                .from("machines")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", orgId);

            const { data: customers, count: customerCount } = await supabase
                .from("organizations")
                .select("id, name, slug, city, created_at", { count: "exact" })
                .eq("manufacturer_org_id", orgId)
                .order("created_at", { ascending: false });

            const { count: assignmentCount } = await supabase
                .from("machine_assignments")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            const { data: machines } = await supabase
                .from("machines")
                .select("id, name, internal_code, category, lifecycle_state, photo_url")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false })
                .limit(6);

            setMfrStats({
                totalMachines: machineCount || 0,
                totalCustomers: customerCount || 0,
                totalAssignments: assignmentCount || 0,
                totalDocs: 0,
            });

            setCustomerList(customers || []);
            setRecentMachines(machines || []);
        } catch (error) {
            console.error(error);
        }
    };

    const getRoleLabel = (role: string) =>
    ({
        admin: t("users.admin"),
        supervisor: "Supervisor",
        technician: t("users.technician"),
    }[role] || role);

    const getLifecycleConfig = (state: string) => {
        const c: Record<string, { label: string; color: string }> = {
            active: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
            },
            commissioned: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
            },
            inactive: {
                label: "Inattivo",
                color:
                    "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
            },
            under_maintenance: {
                label: "Manutenzione",
                color:
                    "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
            },
            decommissioned: {
                label: "Dismesso",
                color:
                    "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
            },
        };
        return c[state] || c.active;
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <SEO title="Dashboard - MACHINA" />

            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Welcome */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-muted-foreground text-sm mb-1">
                            {t("dashboard.welcome")},
                        </p>
                        <h1 className="text-3xl font-bold text-foreground">{userName}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                            <Select
                                value={language}
                                onValueChange={(val) => setLanguage(val as Language)}
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue>
                                        <span className="flex items-center gap-2">
                                            <span>{languageFlags[language]}</span>
                                            <span>{languageNames[language]}</span>
                                        </span>
                                    </SelectValue>
                                </SelectTrigger>

                                <SelectContent>
                                    {(["it", "en", "fr", "es"] as Language[]).map((lang) => (
                                        <SelectItem key={lang} value={lang}>
                                            <span className="flex items-center gap-2">
                                                <span>{languageFlags[lang]}</span>
                                                <span>{languageNames[lang]}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Badge
                            variant="outline"
                            className={
                                orgType === "manufacturer"
                                    ? "border-purple-400 text-purple-600 dark:text-purple-400"
                                    : "border-[#FF6B35] text-[#FF6B35]"
                            }
                        >
                            {orgType === "manufacturer"
                                ? "🏭 Costruttore"
                                : `👤 ${getRoleLabel(userRole)}`}
                        </Badge>
                    </div>
                </div>

                {/* ═══ MANUFACTURER ═══ */}
                {orgType === "manufacturer" ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard
                                icon={<Wrench />}
                                iconColor="text-purple-600 dark:text-purple-400"
                                iconBg="bg-purple-100 dark:bg-purple-500/10"
                                value={mfrStats.totalMachines}
                                label="Macchine Prodotte"
                                onClick={() => router.push("/equipment")}
                            />
                            <KPICard
                                icon={<Building2 />}
                                iconColor="text-blue-600 dark:text-blue-400"
                                iconBg="bg-blue-100 dark:bg-blue-500/10"
                                value={mfrStats.totalCustomers}
                                label="Clienti"
                                onClick={() => router.push("/customers")}
                            />
                            <KPICard
                                icon={<Package />}
                                iconColor="text-green-600 dark:text-green-400"
                                iconBg="bg-green-100 dark:bg-green-500/10"
                                value={mfrStats.totalAssignments}
                                label="Macchine Assegnate"
                                onClick={() => router.push("/assignments")}
                            />
                            <KPICard
                                icon={<Users />}
                                iconColor="text-amber-600 dark:text-amber-400"
                                iconBg="bg-amber-100 dark:bg-amber-500/10"
                                value={mfrStats.totalCustomers}
                                label="Account Clienti"
                                onClick={() => router.push("/admin/users")}
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ActionCard
                                gradient="from-purple-600 to-purple-700"
                                icon={<Wrench />}
                                title="Nuova Macchina"
                                sub="Aggiungi al catalogo"
                                onClick={() => router.push("/equipment/new")}
                            />
                            <ActionCard
                                gradient="from-blue-600 to-blue-700"
                                icon={<UserPlus />}
                                title="Nuovo Cliente"
                                sub="Crea organizzazione cliente"
                                onClick={() => router.push("/customers/new")}
                            />
                            <ActionCard
                                gradient="from-green-600 to-green-700"
                                icon={<Package />}
                                title="Assegna Macchine"
                                sub="Collega macchine ai clienti"
                                onClick={() => router.push("/assignments")}
                            />
                        </div>

                        {customerList.length > 0 && (
                            <ListSection
                                title="Clienti Recenti"
                                linkHref="/customers"
                                linkText="Vedi tutti"
                            >
                                {customerList.slice(0, 6).map((c) => (
                                    <Card
                                        key={c.id}
                                        className="hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => router.push(`/customers/${c.id}`)}
                                    >
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                                                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-foreground truncate">
                                                    {c.name}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {c.city || c.slug}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </ListSection>
                        )}

                        {recentMachines.length > 0 && (
                            <ListSection
                                title="Ultime Macchine"
                                linkHref="/equipment"
                                linkText="Vedi tutte"
                            >
                                {recentMachines.map((m) => {
                                    const lc = getLifecycleConfig(m.lifecycle_state || "active");
                                    return (
                                        <Card
                                            key={m.id}
                                            className="hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => router.push(`/equipment/${m.id}`)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center overflow-hidden">
                                                    {m.photo_url ? (
                                                        <img
                                                            src={m.photo_url}
                                                            alt={m.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-foreground truncate">
                                                        {m.name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {m.internal_code}
                                                    </p>
                                                </div>
                                                <Badge className={`text-xs border ${lc.color}`}>
                                                    {lc.label}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </ListSection>
                        )}

                        {mfrStats.totalMachines === 0 && mfrStats.totalCustomers === 0 && (
                            <Card className="p-12 text-center">
                                <Factory className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    Benvenuto in MACHINA!
                                </h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Come costruttore, inizia aggiungendo le tue macchine al catalogo,
                                    poi crea le organizzazioni dei tuoi clienti e assegna le macchine.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <Button
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => router.push("/equipment/new")}
                                    >
                                        <Wrench className="w-4 h-4 mr-2" /> Aggiungi Macchina
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/customers/new")}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> Crea Cliente
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </>
                ) : (
                    <>
                        {/* ═══ CUSTOMER ═══ */}

                        {/* QR Scanner */}
                        <div
                            className="rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#FF7B47] to-[#FF8C61] p-8 text-white shadow-lg relative overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl"
                            onClick={() => router.push("/scanner")}
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                        <QrCode className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">
                                            {t("dashboard.scanQR")}
                                        </h2>
                                        <p className="text-white/90">{t("nav.scanner")}</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-full">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        </div>

                        {/* Admin panel */}
                        {userRole === "admin" && (
                            <div
                                className="rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-8 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.01]"
                                onClick={() => router.push("/admin/users")}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <Shield className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold mb-1">
                                                {t("users.title")}
                                            </h2>
                                            <p className="text-purple-50">{t("nav.users")}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/20 p-3 rounded-full">
                                        <ArrowRight className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <StatBox
                                        icon={<Users />}
                                        value={userStats.total}
                                        label={t("common.all")}
                                    />
                                    <StatBox
                                        icon={<Shield />}
                                        value={userStats.admins}
                                        label={t("users.admin")}
                                    />
                                    <StatBox
                                        icon={<Users />}
                                        value={userStats.supervisors}
                                        label="Supervisor"
                                    />
                                </div>
                            </div>
                        )}

                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard
                                icon={<Wrench />}
                                iconColor="text-blue-600 dark:text-blue-400"
                                iconBg="bg-blue-100 dark:bg-blue-500/10"
                                value={stats.totalMachines}
                                label={t("dashboard.totalEquipment")}
                                onClick={() => router.push("/equipment")}
                            />
                            <KPICard
                                icon={<ClipboardList />}
                                iconColor="text-green-600 dark:text-green-400"
                                iconBg="bg-green-100 dark:bg-green-500/10"
                                value={stats.activeChecklists}
                                label={t("checklists.active")}
                                onClick={() => router.push("/checklists")}
                            />
                            <KPICard
                                icon={<Clock />}
                                iconColor="text-[#FF6B35]"
                                iconBg="bg-orange-100 dark:bg-orange-500/10"
                                value={stats.upcomingMaintenance}
                                label={t("dashboard.upcomingMaintenance")}
                                onClick={() => router.push("/maintenance")}
                            />
                            <KPICard
                                icon={<AlertTriangle />}
                                iconColor="text-red-600 dark:text-red-400"
                                iconBg="bg-red-100 dark:bg-red-500/10"
                                value={stats.overdueItems}
                                label={t("dashboard.overdueItems")}
                                onClick={() => router.push("/maintenance")}
                            />
                        </div>

                        {/* Machine list */}
                        <ListSection
                            title={t("equipment.title")}
                            linkHref="/equipment"
                            linkText={t("dashboard.viewAll")}
                        >
                            {machineList.map((item) => {
                                const lc = getLifecycleConfig(item.lifecycle_state || "active");
                                return (
                                    <Card
                                        key={item.id}
                                        className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
                                        onClick={() => router.push(`/equipment/${item.id}`)}
                                    >
                                        <div className="p-4 flex items-center gap-4">
                                            <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                                                {item.photo_url ? (
                                                    <img
                                                        src={item.photo_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Wrench className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-foreground truncate">
                                                    {item.name}
                                                </h4>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {item.position || t("equipment.noLocation")}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.category || t("equipment.generic")}
                                                    </span>
                                                    <Badge className={`text-xs border ${lc.color}`}>
                                                        {lc.label}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                    </Card>
                                );
                            })}

                            {machineList.length === 0 && (
                                <Card className="p-8 text-center col-span-full">
                                    <Wrench className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                    <p className="text-muted-foreground">
                                        {t("equipment.noEquipment")}
                                    </p>
                                </Card>
                            )}
                        </ListSection>
                    </>
                )}
            </div>
        </MainLayout>
    );
}

function KPICard({
    icon,
    iconColor,
    iconBg,
    value,
    label,
    onClick,
}: {
    icon: ReactNode;
    iconColor: string;
    iconBg: string;
    value: number;
    label: string;
    onClick: () => void;
}) {
    return (
        <Card
            className="rounded-2xl border-0 shadow-sm hover:shadow-md cursor-pointer transition-all"
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div
                    className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}
                >
                    <span className={`w-6 h-6 ${iconColor}`}>{icon}</span>
                </div>
                <h3 className="text-4xl font-bold text-foreground">{value}</h3>
                <p className="font-medium text-muted-foreground text-sm">{label}</p>
            </CardContent>
        </Card>
    );
}

function ActionCard({
    gradient,
    icon,
    title,
    sub,
    onClick,
}: {
    gradient: string;
    icon: ReactNode;
    title: string;
    sub: string;
    onClick: () => void;
}) {
    return (
        <div
            className={`rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white cursor-pointer hover:scale-[1.01] transition-all shadow-md`}
            onClick={onClick}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <h3 className="font-bold text-lg">{title}</h3>
                    <p className="text-white/80 text-sm">{sub}</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto" />
            </div>
        </div>
    );
}

function StatBox({
    icon,
    value,
    label,
}: {
    icon: ReactNode;
    value: number;
    label: string;
}) {
    return (
        <div className="bg-white/10 rounded-2xl p-4">
            <span className="w-5 h-5 text-white/80 mb-2 block">{icon}</span>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-sm text-purple-100">{label}</div>
        </div>
    );
}

function ListSection({
    title,
    linkHref,
    linkText,
    children,
}: {
    title: string;
    linkHref: string;
    linkText: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <Button
                    variant="ghost"
                    className="text-primary font-medium p-0 h-auto hover:bg-transparent"
                    asChild
                >
                    <Link href={linkHref}>{linkText}</Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        </div>
    );
}

// IMPORTANT: client-only export (no SSR) to eliminate hydration mismatch
export default dynamic(() => Promise.resolve(DashboardInner), { ssr: false });
