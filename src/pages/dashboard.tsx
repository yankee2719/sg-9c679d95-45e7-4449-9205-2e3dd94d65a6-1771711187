import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { userService } from "@/services/userService";
import { maintenanceService } from "@/services/maintenanceService";
import { equipmentService } from "@/services/equipmentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Users, 
  Wrench,
  QrCode,
  FileText
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeEquipment: 0,
    pendingMaintenance: 0,
    overdueMaintenance: 0,
    completedToday: 0
  });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);

        // Load stats based on role
        const [equipment, overdue, upcomingList] = await Promise.all([
          equipmentService.getAll(),
          maintenanceService.getOverdueMaintenance(),
          maintenanceService.getUpcomingMaintenance()
        ]);

        setStats({
          activeEquipment: equipment.length,
          pendingMaintenance: upcomingList.length,
          overdueMaintenance: overdue.length,
          completedToday: 0 // To be implemented with logs
        });
        
        setUpcoming(upcomingList);
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const role = user?.role || "technician";

  return (
    <MainLayout userRole={role}>
      <SEO title="Dashboard - Industrial Maintenance" />
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Benvenuto, {user?.full_name || user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/qr-scanner">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Manutenzioni Scadute
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueMaintenance}</div>
              <p className="text-xs text-muted-foreground">
                Interventi urgenti richiesti
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Scadenza (7gg)
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingMaintenance}</div>
              <p className="text-xs text-muted-foreground">
                Programmate per la settimana
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Macchine Attive
              </CardTitle>
              <Wrench className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEquipment}</div>
              <p className="text-xs text-muted-foreground">
                Totale parco macchine
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completate Oggi
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Interventi chiusi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* Upcoming Maintenance List */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Prossime Manutenzioni</CardTitle>
              <CardDescription>
                Interventi programmati per i prossimi 7 giorni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcoming.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nessuna manutenzione programmata
                  </div>
                ) : (
                  upcoming.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <div className="font-semibold flex items-center gap-2">
                          {item.title}
                          {item.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.equipment?.name} ({item.equipment?.code})
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            {new Date(item.next_maintenance_date).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {item.assigned_to?.full_name || 'Non assegnato'}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/maintenance/${item.id}`}>Dettagli</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions / Role Specific */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
              <CardDescription>
                Funzionalità frequenti per {role}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {role === 'admin' && (
                  <>
                    <Button variant="outline" className="w-full justify-start h-auto py-4" asChild>
                      <Link href="/users/new">
                        <Users className="mr-4 h-5 w-5 text-blue-500" />
                        <div className="text-left">
                          <div className="font-semibold">Nuovo Utente</div>
                          <div className="text-xs text-muted-foreground">Crea account tecnico/supervisor</div>
                        </div>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-auto py-4" asChild>
                      <Link href="/equipment/new">
                        <Wrench className="mr-4 h-5 w-5 text-indigo-500" />
                        <div className="text-left">
                          <div className="font-semibold">Nuova Macchina</div>
                          <div className="text-xs text-muted-foreground">Aggiungi attrezzatura all'anagrafica</div>
                        </div>
                      </Link>
                    </Button>
                  </>
                )}

                <Button variant="outline" className="w-full justify-start h-auto py-4" asChild>
                  <Link href="/maintenance/new">
                    <Calendar className="mr-4 h-5 w-5 text-orange-500" />
                    <div className="text-left">
                      <div className="font-semibold">Pianifica Manutenzione</div>
                      <div className="text-xs text-muted-foreground">Crea nuovo intervento</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="w-full justify-start h-auto py-4" asChild>
                  <Link href="/reports">
                    <FileText className="mr-4 h-5 w-5 text-green-500" />
                    <div className="text-left">
                      <div className="font-semibold">Report Mensile</div>
                      <div className="text-xs text-muted-foreground">Visualizza statistiche complete</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}