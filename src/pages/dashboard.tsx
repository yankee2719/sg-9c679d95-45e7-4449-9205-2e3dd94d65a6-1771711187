import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { equipmentService } from "@/services/equipmentService";
import { maintenanceService } from "@/services/maintenanceService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Package,
  Users,
  Clock,
  Plus
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeEquipment: 0,
    underMaintenance: 0,
    upcomingMaintenance: 0,
    overdueMaintenance: 0,
    completedThisMonth: 0
  });
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const role = await userService.getUserRole(session.user.id);
      if (role) {
        setUserRole(role as any);
        await loadDashboardData(session.user.id, role as any);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (userId: string, role: string) => {
    try {
      const [equipment, upcoming, overdue] = await Promise.all([
        equipmentService.getAll(),
        maintenanceService.getUpcomingMaintenance(),
        maintenanceService.getOverdueMaintenance()
      ]);

      setStats({
        totalEquipment: equipment.length,
        activeEquipment: equipment.filter(e => e.status === "active").length,
        underMaintenance: equipment.filter(e => e.status === "under_maintenance").length,
        upcomingMaintenance: upcoming.length,
        overdueMaintenance: overdue.length,
        completedThisMonth: 0 // TODO: implement
      });

      setUpcomingTasks(upcoming.slice(0, 5));
      setOverdueTasks(overdue.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  if (loading) {
    return (
      <MainLayout userRole={userRole}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Dashboard - Industrial Maintenance" />
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Panoramica sistema di manutenzione industriale
            </p>
          </div>
          {userRole === "admin" && (
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/equipment/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Macchina
                </Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Link href="/maintenance/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Manutenzione
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Macchine</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEquipment}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeEquipment} attive
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Manutenzione</CardTitle>
              <Wrench className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.underMaintenance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Richiede attenzione
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prossime 7 Giorni</CardTitle>
              <Clock className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingMaintenance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Manutenzioni programmate
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Ritardo</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.overdueMaintenance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Urgente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Tasks - Priority */}
        {overdueTasks.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-600">Manutenzioni in Ritardo</CardTitle>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/maintenance">Vedi Tutte</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Macchina</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Assegnato a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.equipment?.name || "N/A"}
                        <div className="text-xs text-muted-foreground">
                          {task.equipment?.code}
                        </div>
                      </TableCell>
                      <TableCell>{task.maintenance_type}</TableCell>
                      <TableCell className="text-red-600">
                        {new Date(task.next_maintenance_date).toLocaleDateString("it-IT")}
                      </TableCell>
                      <TableCell>
                        {task.assigned_to?.full_name || "Non assegnato"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <CardTitle>Prossime Manutenzioni</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/maintenance">Vedi Tutte</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna manutenzione programmata nei prossimi 7 giorni
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Macchina</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Assegnato a</TableHead>
                    <TableHead>Durata Stimata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.equipment?.name || "N/A"}
                        <div className="text-xs text-muted-foreground">
                          {task.equipment?.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.maintenance_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(task.next_maintenance_date).toLocaleDateString("it-IT")}
                      </TableCell>
                      <TableCell>
                        {task.assigned_to?.full_name || "Non assegnato"}
                      </TableCell>
                      <TableCell>
                        {task.estimated_duration_minutes 
                          ? `${task.estimated_duration_minutes} min`
                          : "N/A"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/equipment")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Anagrafica Macchine</h3>
                <p className="text-sm text-muted-foreground">Gestisci le tue attrezzature</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/maintenance")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Manutenzioni</h3>
                <p className="text-sm text-muted-foreground">Pianifica interventi</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/checklists")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Checklist</h3>
                <p className="text-sm text-muted-foreground">Template controlli</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}