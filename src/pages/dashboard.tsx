import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { userService } from "@/services/userService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  CheckCircle,
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
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [userName, setUserName] = useState("User");
  
  // Real data state
  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeChecklists: 0,
    upcomingMaintenance: 0,
    overdueItems: 0
  });
  
  // User stats for admin
  const [userStats, setUserStats] = useState({
    total: 0,
    admins: 0,
    supervisors: 0,
    technicians: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await userService.getUserById(user.id);
        setUserName(profile.full_name || profile.email || "User");
        setUserRole(profile.role as "admin" | "supervisor" | "technician");

        await Promise.all([
          loadDashboardData(),
          profile.role === "admin" ? loadUserStats() : Promise.resolve()
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
      // Get equipment count
      const { count: eqCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });
      
      // Get active checklists count
      const { count: checkCount } = await supabase
        .from("checklists")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get upcoming maintenance (next 7 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const upcomingResult = await supabase
        .from("maintenance_schedules")
        .select("id, title, next_due_date, equipment_id")
        .lte("next_due_date", futureDate.toISOString())
        .gte("next_due_date", new Date().toISOString())
        .order("next_due_date", { ascending: true })
        .limit(5);

      // Get overdue maintenance
      const overdueResult = await supabase
        .from("maintenance_schedules")
        .select("id, title, next_due_date, equipment_id")
        .lt("next_due_date", new Date().toISOString())
        .order("next_due_date", { ascending: true })
        .limit(5);

      // Get recent activities
      const activitiesResult = await supabase
        .from("checklist_executions")
        .select("id, status, created_at, checklist_id, equipment_id, technician_id")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get equipment list
      const eqListResult = await supabase
        .from("equipment")
        .select("id, name, location, category, status, image_url")
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch related data separately to avoid deep type instantiation
      const activities = activitiesResult.data || [];
      const activitiesWithRelations = await Promise.all(
        activities.map(async (activity: any) => {
          const [checklistRes, equipmentRes, technicianRes] = await Promise.all([
            activity.checklist_id 
              ? supabase.from("checklists").select("name").eq("id", activity.checklist_id).single()
              : Promise.resolve({ data: null }),
            activity.equipment_id
              ? supabase.from("equipment").select("name").eq("id", activity.equipment_id).single()
              : Promise.resolve({ data: null }),
            activity.technician_id
              ? supabase.from("profiles").select("full_name").eq("id", activity.technician_id).single()
              : Promise.resolve({ data: null })
          ]);
          
          return {
            ...activity,
            checklist: checklistRes.data,
            equipment: equipmentRes.data,
            technician: technicianRes.data
          };
        })
      );

      setStats({
        totalEquipment: eqCount || 0,
        activeChecklists: checkCount || 0,
        upcomingMaintenance: upcomingResult.data?.length || 0,
        overdueItems: overdueResult.data?.length || 0
      });

      setRecentActivity(activitiesWithRelations);
      setEquipmentList(eqListResult.data || []);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role");

      if (error) throw error;

      const stats = {
        total: data.length,
        admins: data.filter(u => u.role === "admin").length,
        supervisors: data.filter(u => u.role === "supervisor").length,
        technicians: data.filter(u => u.role === "technician").length
      };

      setUserStats(stats);
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ${t("common.ago") || "ago"}`;
    if (diffHours < 24) return `${t("analytics.today")} ${past.getHours().toString().padStart(2, "0")}:${past.getMinutes().toString().padStart(2, "0")}`;
    if (diffDays === 1) return language === "it" ? "Ieri" : language === "fr" ? "Hier" : language === "es" ? "Ayer" : "Yesterday";
    if (diffDays < 7) return `${diffDays}d ${t("common.ago") || "ago"}`;
    return past.toLocaleDateString(language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "short" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return t("users.admin");
    if (role === "supervisor") return language === "it" ? "Supervisore" : language === "fr" ? "Superviseur" : language === "es" ? "Supervisor" : "Supervisor";
    return t("users.technician");
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`${t("dashboard.title")} - Maint Ops`} />
      
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
          
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        </div>

        {/* ADMIN CARD - Only visible for admins */}
        {userRole === "admin" && (
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
                  <div className="text-2xl font-bold mb-1">{userStats.admins}</div>
                  <div className="text-sm text-purple-100 font-medium">{t("users.admin")}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <Users className="w-5 h-5 text-white/80 mb-2" />
                  <div className="text-2xl font-bold mb-1">{userStats.supervisors}</div>
                  <div className="text-sm text-purple-100 font-medium">{getRoleLabel("supervisor")}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <Wrench className="w-5 h-5 text-white/80 mb-2" />
                  <div className="text-2xl font-bold mb-1">{userStats.technicians}</div>
                  <div className="text-sm text-purple-100 font-medium">{t("users.technician")}</div>
                </div>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Equipment Stat */}
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600/50">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-bold text-white">{stats.totalEquipment}</h3>
                <p className="font-medium text-slate-300 text-sm">{t("dashboard.totalEquipment")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Checklists Stat */}
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600/50">
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

          {/* Upcoming Maintenance */}
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600/50">
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

          {/* Overdue Items */}
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600/50">
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

        {/* BOTTOM SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-white">{t("dashboard.recentActivity")}</h3>
              <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/maintenance">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <Card 
                  key={activity.id} 
                  className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden group cursor-pointer hover:border-slate-600"
                  onClick={() => router.push(`/checklist/${activity.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={`rounded-lg px-3 py-1 text-xs font-bold border-0 ${
                        activity.status === "completed" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {activity.status === "completed" ? t("common.completed") : t("common.inProgress")}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-white text-base mb-2">
                      {activity.checklist?.name || t("checklists.title")}
                    </h4>

                    <div className="flex items-center gap-2 mb-3 text-slate-400">
                      <Wrench className="w-4 h-4" />
                      <span className="text-sm font-medium">{activity.equipment?.name || "N/A"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 bg-blue-500/20">
                          <AvatarFallback className="text-blue-400 text-xs font-semibold">
                            {getInitials(activity.technician?.full_name || "NA")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-400 font-medium">
                          {activity.technician?.full_name || t("common.unassigned")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-medium">{formatRelativeTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {recentActivity.length === 0 && (
                <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">{t("dashboard.noActivity")}</p>
                </Card>
              )}
            </div>
          </div>

          {/* Equipment List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-white">{t("equipment.title")}</h3>
              <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/equipment">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {equipmentList.map((item) => {
                const statusConfig: Record<string, { label: string; color: string }> = {
                  active: { label: t("equipment.active"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
                  under_maintenance: { label: t("equipment.maintenance"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                  inactive: { label: t("equipment.inactive"), color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
                  decommissioned: { label: t("equipment.decommissioned"), color: "bg-red-500/20 text-red-400 border-red-500/30" }
                };

                const status = statusConfig[item.status] || statusConfig.active;

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
                          <span className="text-xs text-slate-500 font-medium">{item.category || t("equipment.generic")}</span>
                          <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {equipmentList.length === 0 && (
                <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center">
                  <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">{t("equipment.noEquipment")}</p>
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}