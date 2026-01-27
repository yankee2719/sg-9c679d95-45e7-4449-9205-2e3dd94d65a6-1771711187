import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { maintenanceService } from "@/services/maintenanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Search, Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function MaintenancePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesData, upcoming, overdue] = await Promise.all([
        maintenanceService.getSchedules(),
        maintenanceService.getUpcomingMaintenance(),
        maintenanceService.getOverdueMaintenance()
      ]);
      
      setSchedules(schedulesData);
      setUpcomingCount(upcoming.length);
      setOverdueCount(overdue.length);
    } catch (error) {
      console.error("Error loading maintenance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "overdue": return "destructive";
      case "scheduled": return "outline";
      default: return "outline";
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.maintenance_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout userRole="admin">
      <SEO title="Manutenzioni Programmate - Industrial Maintenance" />
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manutenzioni Programmate</h1>
            <p className="text-muted-foreground mt-1">
              Gestisci e pianifica le manutenzioni delle macchine
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Link href="/maintenance/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Manutenzione
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prossime 7 Giorni</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingCount}</div>
              <p className="text-xs text-muted-foreground">Manutenzioni in arrivo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Ritardo</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
              <p className="text-xs text-muted-foreground">Richiedono attenzione</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Pianificate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schedules.length}</div>
              <p className="text-xs text-muted-foreground">Tutte le manutenzioni</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per macchina o tipo manutenzione..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Caricamento...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna manutenzione programmata trovata
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Macchina</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prossima Scadenza</TableHead>
                    <TableHead>Frequenza</TableHead>
                    <TableHead>Priorità</TableHead>
                    <TableHead>Assegnato a</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.equipment?.name || "N/A"}
                        <div className="text-xs text-muted-foreground">
                          {schedule.equipment?.code}
                        </div>
                      </TableCell>
                      <TableCell>{schedule.maintenance_type || "N/A"}</TableCell>
                      <TableCell>
                        {schedule.next_maintenance_date 
                          ? new Date(schedule.next_maintenance_date).toLocaleDateString("it-IT")
                          : "Non pianificata"
                        }
                      </TableCell>
                      <TableCell>
                        {schedule.frequency_days 
                          ? `Ogni ${schedule.frequency_days} giorni`
                          : "Una tantum"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(schedule.priority)}>
                          {schedule.priority || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {schedule.assigned_to?.full_name || "Non assegnato"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(schedule.status)}>
                          {schedule.is_active ? "Attiva" : "Inattiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}