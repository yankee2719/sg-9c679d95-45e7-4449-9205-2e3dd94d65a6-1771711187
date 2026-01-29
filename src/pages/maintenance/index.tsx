import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { maintenanceService } from "@/services/maintenanceService";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { supabase } from "@/integrations/supabase/client";
import { getAllEquipment } from "@/services/equipmentService";
import { exportMaintenanceLogsToCSV, exportMaintenanceLogsToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  Search, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Download,
  FileText,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/router";

export default function MaintenancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await userService.getUserById(user.id);
        setUserRole(profile.role as "admin" | "supervisor" | "technician");
        setCurrentUserId(user.id);
        await Promise.all([
          loadData(),
        ]);
      } catch (error) {
        console.error("Error loading maintenance logs:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

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
    }
  };

  const handleDeleteClick = (schedule: any) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    setDeleting(true);
    try {
      await maintenanceService.deleteSchedule(scheduleToDelete.id);
      
      toast({
        title: "✅ Manutenzione eliminata",
        description: `"${scheduleToDelete.title}" è stata eliminata con successo.`,
      });
      
      await loadData();
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "❌ Errore",
        description: "Impossibile eliminare la manutenzione. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    if (schedules.length === 0) {
      toast({
        title: "Nessun dato da esportare",
        description: "Non ci sono manutenzioni da esportare",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const logs = await maintenanceService.getLogs();
      
      exportMaintenanceLogsToCSV(
        logs,
        "Tutti i periodi"
      );

      toast({
        title: "✅ Export CSV completato",
        description: `${logs.length} manutenzioni esportate con successo`,
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "❌ Errore export",
        description: "Impossibile esportare i dati in CSV",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (schedules.length === 0) {
      toast({
        title: "Nessun dato da esportare",
        description: "Non ci sono manutenzioni da esportare",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const logs = await maintenanceService.getLogs();
      
      exportMaintenanceLogsToPDF(
        logs,
        "Tutti i periodi"
      );

      toast({
        title: "✅ Export PDF completato",
        description: `${logs.length} manutenzioni esportate con successo`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "❌ Errore export",
        description: "Impossibile esportare i dati in PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
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

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "scheduled": return "Pianificata";
      case "in_progress": return "In corso";
      case "completed": return "Completata";
      case "overdue": return "In ritardo";
      case "cancelled": return "Annullata";
      default: return "N/A";
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.equipment?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canModify = userRole === "admin" || userRole === "supervisor";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Manutenzioni Programmate - Industrial Maintenance" />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manutenzioni Programmate</h1>
            <p className="text-slate-400">
              Gestisci e pianifica le manutenzioni delle macchine
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting || schedules.length === 0}
              variant="outline"
              className="gap-2 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting || schedules.length === 0}
              variant="outline"
              className="gap-2 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            {canModify && (
              <Button 
                asChild 
                className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl px-6"
              >
                <Link href="/maintenance/new">
                  <Plus className="mr-2 h-5 w-5" />
                  Nuova Manutenzione
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Prossime 7 Giorni</CardTitle>
              <Clock className="h-5 w-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{upcomingCount}</div>
              <p className="text-xs text-slate-400">Manutenzioni in arrivo</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">In Ritardo</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400 mb-1">{overdueCount}</div>
              <p className="text-xs text-slate-400">Richiedono attenzione</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Totale Pianificate</CardTitle>
              <Calendar className="h-5 w-5 text-[#FF6B35]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{schedules.length}</div>
              <p className="text-xs text-slate-400">Tutte le manutenzioni</p>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance List */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardHeader className="border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                placeholder="Cerca per macchina o tipo manutenzione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-slate-400">Caricamento...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Nessuna manutenzione programmata trovata
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400">Macchina</TableHead>
                      <TableHead className="text-slate-400">Titolo</TableHead>
                      <TableHead className="text-slate-400">Data Pianificata</TableHead>
                      <TableHead className="text-slate-400">Priorità</TableHead>
                      <TableHead className="text-slate-400">Assegnato a</TableHead>
                      <TableHead className="text-slate-400">Stato</TableHead>
                      {canModify && <TableHead className="text-slate-400 text-right">Azioni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule) => (
                      <TableRow 
                        key={schedule.id}
                        className="border-slate-700 hover:bg-slate-800/30 cursor-pointer"
                        onClick={() => router.push(`/maintenance/${schedule.id}`)}
                      >
                        <TableCell className="font-medium text-white">
                          {schedule.equipment?.name || "N/A"}
                          <div className="text-xs text-slate-500">
                            {schedule.equipment?.code}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{schedule.title || "N/A"}</TableCell>
                        <TableCell className="text-slate-300">
                          {schedule.scheduled_date 
                            ? new Date(schedule.scheduled_date).toLocaleDateString("it-IT")
                            : "Non pianificata"
                          }
                          {schedule.due_date && (
                            <div className="text-xs text-slate-500">
                              Scadenza: {new Date(schedule.due_date).toLocaleDateString("it-IT")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(schedule.priority)} className="rounded-lg">
                            {schedule.priority || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {schedule.assigned_to?.full_name || "Non assegnato"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(schedule.status)} className="rounded-lg">
                            {getStatusLabel(schedule.status)}
                          </Badge>
                        </TableCell>
                        {canModify && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/maintenance/edit/${schedule.id}`);
                                }}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(schedule);
                                }}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Elimina Manutenzione
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Questa azione è irreversibile e comporterà l'eliminazione definitiva della manutenzione programmata.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {scheduleToDelete && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Manutenzione da eliminare:</p>
                <p className="text-lg font-semibold text-white">{scheduleToDelete.title}</p>
                <p className="text-sm text-slate-400 mt-2">
                  Macchina: {scheduleToDelete.equipment?.name || "N/A"}
                </p>
                <p className="text-sm text-slate-400">
                  Data: {scheduleToDelete.scheduled_date 
                    ? new Date(scheduleToDelete.scheduled_date).toLocaleDateString("it-IT")
                    : "N/A"
                  }
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  ATTENZIONE: Verranno eliminati anche:
                </p>
                <ul className="space-y-1 ml-6 text-sm text-slate-300 mt-2">
                  <li>• Tutte le checklist associate</li>
                  <li>• Tutte le esecuzioni completate</li>
                  <li>• Tutti i log e note</li>
                  <li>• Tutti i dati storici collegati</li>
                </ul>
              </div>

              <p className="text-sm text-slate-400">
                Sei sicuro di voler procedere con l'eliminazione? Questa operazione non può essere annullata.
              </p>
            </div>
          )}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Definitivamente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}