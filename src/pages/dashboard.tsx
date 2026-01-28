import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { equipmentService } from "@/services/equipmentService";
import { maintenanceService } from "@/services/maintenanceService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Shield
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [userName, setUserName] = useState("Marco Rossi");
  
  // Real data state
  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    maintenanceEquipment: 0,
    inactiveEquipment: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completedToday: 0,
    avgTime: "2.5h"
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
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const role = await userService.getUserRole(session.user.id);
      if (role) {
        setUserRole(role as any);
        
        // Get user full name from profile
        const profile = await userService.getUserProfile(session.user.id);
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
        
        await loadDashboardData();
        
        // Load user stats if admin
        if (role === "admin") {
          await loadUserStats();
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [equipment, upcoming, overdue] = await Promise.all([
        equipmentService.getAll(),
        maintenanceService.getUpcomingMaintenance(),
        maintenanceService.getOverdueMaintenance()
      ]);

      setStats({
        totalEquipment: equipment.length,
        activeEquipment: equipment.filter(e => e.status === "active").length,
        maintenanceEquipment: equipment.filter(e => e.status === "under_maintenance").length,
        inactiveEquipment: equipment.filter(e => e.status !== "active" && e.status !== "under_maintenance").length,
        pendingTasks: upcoming.length + overdue.length,
        overdueTasks: overdue.length,
        completedToday: 8,
        avgTime: "2.5h"
      });

      setEquipmentList(equipment.slice(0, 5));
      
      // Combine upcoming and overdue for activity feed
      const activity = [...overdue, ...upcoming].slice(0, 5);
      setRecentActivity(activity);

    } catch (error) {
      console.error("Error loading data:", error);
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

    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `Oggi ${past.getHours().toString().padStart(2, "0")}:${past.getMinutes().toString().padStart(2, "0")}`;
    if (diffDays === 1) return "Ieri";
    if (diffDays < 7) return `${diffDays}g fa`;
    return past.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isOverdue = (scheduledDate: string) => {
    return new Date(scheduledDate) < new Date();
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Dashboard - Maint Ops" />
      
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Buonasera,</p>
            <h1 className="text-3xl font-bold text-white">{userName}</h1>
          </div>
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-2 text-sm">
            👤 {userRole === "admin" ? "Amministratore" : userRole === "supervisor" ? "Supervisore" : "Tecnico"}
          </Badge>
        </div>

        {/* HERO: QR Scanner */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-blue-500/30"
             onClick={() => router.push("/scanner")}>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Scansiona QR Code</h2>
                <p className="text-blue-50 font-medium">Accedi rapidamente alle informazioni del macchinario</p>
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
                    <h2 className="text-2xl font-bold mb-1">Amministrazione Sistema</h2>
                    <p className="text-purple-50 font-medium">Gestisci utenti, ruoli e permessi</p>
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
                  <div className="text-sm text-purple-100 font-medium">Utenti Totali</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <Shield className="w-5 h-5 text-white/80 mb-2" />
                  <div className="text-2xl font-bold mb-1">{userStats.admins}</div>
                  <div className="text-sm text-purple-100 font-medium">Amministratori</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <Users className="w-5 h-5 text-white/80 mb-2" />
                  <div className="text-2xl font-bold mb-1">{userStats.supervisors}</div>
                  <div className="text-sm text-purple-100 font-medium">Supervisori</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <Wrench className="w-5 h-5 text-white/80 mb-2" />
                  <div className="text-2xl font-bold mb-1">{userStats.technicians}</div>
                  <div className="text-sm text-purple-100 font-medium">Tecnici</div>
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
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-bold text-white">{stats.totalEquipment}</h3>
                <p className="font-medium text-slate-300">Equipaggiamenti</p>
                <p className="text-sm text-blue-400 font-medium">{stats.activeEquipment} operativi</p>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Stat */}
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-bold text-white">{stats.pendingTasks}</h3>
                <p className="font-medium text-slate-300">Task Pendenti</p>
                <p className="text-sm text-amber-400 font-medium">{stats.overdueTasks} scaduti</p>
              </div>
            </CardContent>
          </Card>

          {/* Completed Stat */}
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-bold text-white">{stats.completedToday}</h3>
                <p className="font-medium text-slate-300">Completati Oggi</p>
              </div>
            </CardContent>
          </Card>

          {/* Time Stat */}
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:border-slate-600">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-bold text-white">{stats.avgTime}</h3>
                <p className="font-medium text-slate-300">Tempo Medio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* EQUIPMENT STATUS PROGRESS */}
        <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg p-6">
          <h3 className="text-lg font-bold text-white mb-6">Stato Equipaggiamenti</h3>
          
          {/* Progress Bar Container */}
          <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden flex mb-4">
            <div className="h-full bg-green-500" style={{ width: `${(stats.activeEquipment / stats.totalEquipment) * 100}%` }} />
            <div className="h-full bg-amber-500" style={{ width: `${(stats.maintenanceEquipment / stats.totalEquipment) * 100}%` }} />
            <div className="h-full bg-slate-500" style={{ width: `${(stats.inactiveEquipment / stats.totalEquipment) * 100}%` }} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium text-slate-300">Operativi ({stats.activeEquipment})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-medium text-slate-300">In Manutenzione ({stats.maintenanceEquipment})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <span className="font-medium text-slate-300">Non Attivi ({stats.inactiveEquipment})</span>
            </div>
          </div>
        </Card>

        {/* BOTTOM SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-white">Attività Recenti</h3>
              <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/maintenance">Vedi tutte</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {recentActivity.map((task) => {
                const overdue = isOverdue(task.scheduled_date);
                const isCritical = task.priority === "high";
                
                return (
                  <Card 
                    key={task.id} 
                    className={`rounded-2xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden group cursor-pointer ${
                      isCritical 
                        ? "border-red-500/30 bg-red-950/20 hover:border-red-500/50" 
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                    onClick={() => router.push(`/maintenance`)}
                  >
                    <div className="p-4">
                      {/* Header with badges */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge 
                          className={`rounded-lg px-3 py-1 text-xs font-bold border-0 ${
                            isCritical 
                              ? "bg-red-500/20 text-red-400" 
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {isCritical ? "! Critica" : "↑ Alta"}
                        </Badge>
                        {overdue && (
                          <Badge className="rounded-lg px-3 py-1 text-xs font-bold bg-red-500/20 text-red-400 border-0 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Scaduto
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-white text-base mb-2">{task.title}</h4>

                      {/* Equipment */}
                      <div className="flex items-center gap-2 mb-3 text-slate-400">
                        <Wrench className="w-4 h-4" />
                        <span className="text-sm font-medium">{task.equipment?.name || "N/A"}</span>
                      </div>

                      {/* Footer with user and time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 bg-blue-500/20">
                            <AvatarFallback className="text-blue-400 text-xs font-semibold">
                              {getInitials(task.assigned_to?.full_name || "NA")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-400 font-medium">
                            {task.assigned_to?.full_name || "Non assegnato"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-medium">{formatRelativeTime(task.scheduled_date)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {recentActivity.length === 0 && (
                <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">Nessuna attività recente</p>
                </Card>
              )}
            </div>
          </div>

          {/* Equipment List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-white">Equipaggiamenti</h3>
              <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/equipment">Vedi tutti</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {equipmentList.map((item) => {
                const statusConfig = {
                  active: { label: "Operativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
                  under_maintenance: { label: "In Manutenzione", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                  inactive: { label: "Non Attivo", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
                  decommissioned: { label: "Dismesso", color: "bg-red-500/20 text-red-400 border-red-500/30" }
                };

                const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.active;

                return (
                  <Card 
                    key={item.id} 
                    className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-blue-500/50 transition-all overflow-hidden cursor-pointer group"
                    onClick={() => router.push(`/equipment/${item.id}`)}
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-slate-700/50 rounded-xl flex-shrink-0 overflow-hidden relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-700/50 text-slate-500">
                            <Wrench className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-base mb-1 truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                          <span className="truncate">{item.location || "Nessuna posizione"}</span>
                          <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">{item.equipment_categories?.name || "Generico"}</span>
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
                  <p className="text-slate-400 font-medium">Nessun equipaggiamento disponibile</p>
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}