import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { equipmentService } from "@/services/equipmentService";
import { maintenanceService } from "@/services/maintenanceService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  QrCode,
  ArrowRight,
  Wrench,
  ClipboardList,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ArrowUpRight
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  
  // Real data state
  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    maintenanceEquipment: 0,
    inactiveEquipment: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completedToday: 0,
    avgTime: "2.5h" // Placeholder for now, hard to calc without history
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
        await loadDashboardData();
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
        completedToday: 8, // Mocked
        avgTime: "2.5h" // Mocked
      });

      setEquipmentList(equipment.slice(0, 3));
      
      // Combine upcoming and overdue for activity feed
      const activity = [...overdue, ...upcoming].slice(0, 3);
      setRecentActivity(activity);

    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Dashboard - Maint Ops" />
      
      <div className="space-y-8 max-w-6xl mx-auto">
        
        {/* HERO: QR Scanner */}
        <div className="rounded-3xl gradient-primary p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]"
             onClick={() => router.push("/scanner")}>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Scansiona QR Code</h2>
                <p className="text-blue-100 font-medium">Accedi rapidamente alle informazioni del macchinario</p>
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

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Equipment Stat */}
          <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
                <Wrench className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-800">{stats.totalEquipment}</h3>
                <p className="font-medium text-slate-500">Equipaggiamenti</p>
                <p className="text-sm text-blue-500 font-medium">{stats.activeEquipment} operativi</p>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Stat */}
          <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-500">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-800">{stats.pendingTasks}</h3>
                <p className="font-medium text-slate-500">Task Pendenti</p>
                <p className="text-sm text-amber-500 font-medium">{stats.overdueTasks} scaduti</p>
              </div>
            </CardContent>
          </Card>

          {/* Completed Stat */}
          <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-green-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-800">{stats.completedToday}</h3>
                <p className="font-medium text-slate-500">Completati Oggi</p>
              </div>
            </CardContent>
          </Card>

          {/* Time Stat */}
          <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mb-4 text-cyan-500">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-800">{stats.avgTime}</h3>
                <p className="font-medium text-slate-500">Tempo Medio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* EQUIPMENT STATUS PROGRESS */}
        <Card className="rounded-3xl border-none shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Stato Equipaggiamenti</h3>
          
          {/* Progress Bar Container */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
            <div className="h-full bg-green-500" style={{ width: `${(stats.activeEquipment / stats.totalEquipment) * 100}%` }} />
            <div className="h-full bg-amber-500" style={{ width: `${(stats.maintenanceEquipment / stats.totalEquipment) * 100}%` }} />
            <div className="h-full bg-slate-400" style={{ width: `${(stats.inactiveEquipment / stats.totalEquipment) * 100}%` }} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium text-slate-600">Operativi ({stats.activeEquipment})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-medium text-slate-600">In Manutenzione ({stats.maintenanceEquipment})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="font-medium text-slate-600">Non Attivi ({stats.inactiveEquipment})</span>
            </div>
          </div>
        </Card>

        {/* BOTTOM SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-slate-800">Attività Recenti</h3>
              <Button variant="ghost" className="text-blue-500 hover:text-blue-600 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/maintenance">Vedi tutte</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {recentActivity.map((task) => (
                <Card key={task.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                    }`}>
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`border-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {task.priority === 'high' ? 'Alta' : 'Media'}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(task.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 truncate">{task.title}</h4>
                      <p className="text-sm text-slate-500 truncate">{task.equipment?.name}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="text-slate-300 group-hover:text-blue-500">
                      <ArrowUpRight className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Equipment List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-slate-800">Equipaggiamenti</h3>
              <Button variant="ghost" className="text-blue-500 hover:text-blue-600 font-medium p-0 h-auto hover:bg-transparent" asChild>
                <Link href="/equipment">Vedi tutti</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {equipmentList.map((item) => (
                <Card key={item.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                           <Wrench className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                      <p className="text-sm text-slate-500 truncate">{item.location || 'Nessuna posizione'}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.category?.name || 'Generico'}</p>
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 h-10 shadow-lg shadow-blue-200" onClick={() => router.push(`/scanner?id=${item.id}`)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Scansiona
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}