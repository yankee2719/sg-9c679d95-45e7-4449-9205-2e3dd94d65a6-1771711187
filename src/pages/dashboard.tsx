import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
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
    Globe
} from "lucide-react";
import { useLanguage, Language, languageFlags, languageNames } from "@/contexts/LanguageContext";

export default function DashboardPage() {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");
    const [userName, setUserName] = useState("User");

    // Real data state
    const [stats, setStats] = useState({
        totalMachines: 0,
        activeChecklists: 0,
        upcomingMaintenance: 0,
        overdueItems: 0
    });

    // User stats for admin
    const [userStats, setUserStats] = useState({
        total: 0,
        owners: 0,
        admins: 0,
        plant_managers: 0,
        technicians: 0,
        viewers: 0
    });

    const [machineList, setMachineList] = useState < any[] > ([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                // Get profile + role via helper (new schema)
                const profileData = await getProfileData(user.id);
                if (!profileData) {
                    console.error("Profile not found for user:", user.id);
                    // Don't redirect — profile might just be delayed by trigger
                    setUserName(user.email || "User");
                    setUserRole("technician");
                } else {
                    setUserName(profileData.full_name || user.email || "User");
                    setUserRole(profileData.role || "technician");
                }

                await Promise.all([
                    loadDashboardData(),
                    (profileData?.role === "owner" || profileData?.role === "admin") ? loadUserStats() : Promise.resolve()
                ]);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const loadDashboardData = async () => {
        try {
            // Get machines count (was: equipment)
            const { count: machineCount } = await supabase
                .from("machines")
                .select("*", { count: "exact", head: true })
                .eq("is_archived", false);

            // Get active checklists count
            const { count: checkCount } = await supabase
                .from("checklists")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            // Get upcoming maintenance (was: maintenance_schedules → now: maintenance_plans)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const { count: upcomingCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .lte("next_due_date", futureDate.toISOString())
                .gte("next_due_date", new Date().toISOString());

            // Get overdue maintenance
            const { count: overdueCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .lt("next_due_date", new Date().toISOString());

            // Get machine list (was: equipment)
            const machineListResult = await supabase
                .from("machines")
                .select("id, name, location, machine_type, lifecycle_state, image_url")
                .eq("is_archived", false)
                .order("created_at", { ascending: false })
                .limit(5);

            setStats({
                totalMachines: machineCount || 0,
                activeChecklists: checkCount || 0,
                upcomingMaintenance: upcomingCount || 0,
                overdueItems: overdueCount || 0
            });

            setMachineList(machineListResult.data || []);

        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    };

    const loadUserStats = async () => {
        try {
            // Get user's default org
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("default_organization_id")
                .eq("id", user.id)
                .single();

            if (!profile?.default_organization_id) return;

            // Get members of this organization (was: profiles with role)
            const { data: members, error } = await supabase
                .from("organization_memberships")
                .select("role")
                .eq("organization_id", profile.default_organization_id)
                .eq("is_active", true);

            if (error) throw error;

            setUserStats({
                total: members?.length || 0,
                owners: members?.filter(m => m.role === "owner").length || 0,
                admins: members?.filter(m => m.role === "admin").length || 0,
                plant_managers: members?.filter(m => m.role === "plant_manager").length || 0,
                technicians: members?.filter(m => m.role === "technician").length || 0,
                viewers: members?.filter(m => m.role === "viewer").length || 0,
            });
        } catch (error) {
            console.error("Error loading user stats:", error);
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            owner: "Proprietario",
            admin: t("users.admin"),
            plant_manager: "Plant Manager",
            technician: t("users.technician"),
            viewer: "Viewer",
        };
        return labels[role] || role;
    };

    // Map lifecycle_state to display config
    const getLifecycleConfig = (state: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            commissioning: { label: "Commissioning", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
            active: { label: t("equipment.active"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
            maintenance: { label: t("equipment.maintenance"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
            decommissioned: { label: t("equipment.decommissioned"), color: "bg-red-500/20 text-red-400 border-red-500/30" },
            transferred: { label: "Trasferita", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
        };
        return configs[state] || configs.active;
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <SEO title={`${t("dashboard.title")} - MACHINA`} />

            <div className="space-y-8 max-w-7xl mx-auto">

                {/* Welcome Header with Language Selector */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-slate-400 text-sm mb-1">{t("dashboard.welcome")},</p>
                        <h1 className="text-3xl font-bold text-white">{userName}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Language Selector */}
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-slate-400" />
                            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                                <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700 text-white">
                                    <SelectValue>
                                        <span className="flex items-center gap-2">
                                            <span>{languageFlags[language]}</span>
                                            <span>{languageNames[language]}</span>
                                        </span>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {(["it", "en", "fr", "es"] as Language[]).map((lang) => (
                                        <SelectItem
                                            key={lang}
                                            value={lang}
                                            className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>{languageFlags[lang]}</span>
                                                <span>{languageNames[lang]}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Badge variant="outline" className="border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] px-4 py-2 text-sm font-medium">
                            👤 {getRoleLabel(userRole)}
                        </Badge>
                    </div>
                </div>

                {/* HERO: QR Scanner */}
                <div className="rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#FF7B47] to-[#FF8C61] p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-orange-500/30"
                    onClick={() => router.push("/scanner")}>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{t("dashboard.scanQR")}</h2>
                                <p className="text-white/90 font-medium">{t("nav.scanner")}</p>
                            </div>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                </div>

                {/* ADMIN CARD - Only visible for owner/admin */}
                {(userRole === "owner" || userRole === "admin") && (
                    <div className="rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-8 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/30"
                        onClick={() => router.push("/admin/users")}>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">{t("users.title")}</h2>
                                        <p className="text-purple-50 font-medium">{t("nav.users")}</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors">
                                    <ArrowRight className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            {/* User Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                    <Users className="w-5 h-5 text-white/80 mb-2" />
                                    <div className="text-2xl font-bold mb-1">{userStats.total}</div>
                                    <div className="text-sm text-purple-100 font-medium">{t("common.all")}</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                    <Shield className="w-5 h-5 text-white/80 mb-2" />
                                    <div className="text-2xl font-bold mb-1">{userStats.admins + userStats.owners}</div>
                                    <div className="text-sm text-purple-100 font-medium">{t("users.admin")}</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                    <Users className="w-5 h-5 text-white/80 mb-2" />
                                    <div className="text-2xl font-bold mb-1">{userStats.plant_managers}</div>
                                    <div className="text-sm text-purple-100 font-medium">Plant Manager</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                    <Wrench className="w-5 h-5 text-white/80 mb-2" />
                                    <div className="text-2xl font-bold mb-1">{userStats.technicians}</div>
                                    <div className="text-sm text-purple-100 font-medium">{t("users.technician")}</div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                    </div>
                )}

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-blue-500/50 cursor-pointer"
                        onClick={() => router.push("/equipment")}>
                        <CardContent className="p-6">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                                <Wrench className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-4xl font-bold text-white">{stats.totalMachines}</h3>
                                <p className="font-medium text-slate-300 text-sm">{t("dashboard.totalEquipment")}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-green-500/50 cursor-pointer"
                        onClick={() => router.push("/checklists")}>
                        <CardContent className="p-6">
                            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                                <ClipboardList className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-4xl font-bold text-white">{stats.activeChecklists}</h3>
                                <p className="font-medium text-slate-300 text-sm">{t("checklists.active")}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-orange-500/50 cursor-pointer"
                        onClick={() => router.push("/maintenance")}>
                        <CardContent className="p-6">
                            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                                <Clock className="w-6 h-6 text-[#FF6B35]" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-4xl font-bold text-white">{stats.upcomingMaintenance}</h3>
                                <p className="font-medium text-slate-300 text-sm">{t("dashboard.upcomingMaintenance")}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-red-500/50 cursor-pointer"
                        onClick={() => router.push("/maintenance")}>
                        <CardContent className="p-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-4xl font-bold text-white">{stats.overdueItems}</h3>
                                <p className="font-medium text-slate-300 text-sm">{t("dashboard.overdueItems")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Machine List (was: Equipment List) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-white">{t("equipment.title")}</h3>
                        <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                            <Link href="/equipment">{t("dashboard.viewAll")}</Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {machineList.map((item) => {
                            const lifecycle = getLifecycleConfig(item.lifecycle_state || "active");
                            return (
                                <Card
                                    key={item.id}
                                    className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-blue-500/50 transition-all overflow-hidden cursor-pointer group"
                                    onClick={() => router.push(`/equipment/${item.id}`)}
                                >
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-700/50 rounded-xl flex-shrink-0 overflow-hidden relative">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-700/50 text-slate-500">
                                                    <Wrench className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white text-base mb-1 truncate">{item.name}</h4>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                                <span className="truncate">{item.location || t("equipment.noLocation")}</span>
                                                <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 font-medium">{item.machine_type || t("equipment.generic")}</span>
                                                <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${lifecycle.color}`}>
                                                    {lifecycle.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

                        {machineList.length === 0 && (
                            <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center col-span-full">
                                <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">{t("equipment.noEquipment")}</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
