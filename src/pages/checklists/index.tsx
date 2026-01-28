import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { checklistService, ChecklistTemplateWithTasks } from "@/services/checklistService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChecklistsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [templates, setTemplates] = useState<ChecklistTemplateWithTasks[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplateWithTasks | null>(null);
  const [deleteStats, setDeleteStats] = useState<{ tasksCount: number; executionsCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = ["all", "Preventiva", "Sicurezza", "Elettrica", "CNC", "Robotica", "Idraulica"];

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true);
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Check role
      const role = await userService.getUserRole(session.user.id);
      if (role) {
        setUserRole(role as any);
      }

      // Load templates
      await loadTemplates();

    } catch (error) {
      console.error("Error loading checklists page:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const data = await checklistService.getAllTemplates();
    setTemplates(data);
  };

  const handleDeleteClick = async (template: ChecklistTemplateWithTasks, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Load stats for the template
    const stats = await checklistService.getTemplateStats(template.id);
    
    setTemplateToDelete(template);
    setDeleteStats(stats);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      const success = await checklistService.deleteTemplate(templateToDelete.id);
      
      if (success) {
        toast({
          title: "✅ Template eliminato",
          description: `"${templateToDelete.name}" è stato eliminato con successo.`,
        });
        
        // Reload templates
        await loadTemplates();
        
        // Close dialog
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
        setDeleteStats(null);
      } else {
        toast({
          title: "❌ Errore",
          description: "Impossibile eliminare il template. Riprova più tardi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "❌ Errore",
        description: "Si è verificato un errore durante l'eliminazione.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    
    // Technicians see only active templates
    const isVisible = userRole === "technician" ? template.status === "active" : true;
    
    return matchesSearch && matchesCategory && isVisible;
  });

  const getStatusConfig = (status: string) => {
    const config = {
      active: { label: "Attiva", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      draft: { label: "Bozza", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      archived: { label: "Archiviata", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" }
    };
    return config[status as keyof typeof config] || config.active;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Preventiva": "bg-blue-500/10 text-blue-400",
      "Sicurezza": "bg-red-500/10 text-red-400",
      "Elettrica": "bg-yellow-500/10 text-yellow-400",
      "CNC": "bg-cyan-500/10 text-cyan-400",
      "Robotica": "bg-purple-500/10 text-purple-400",
      "Idraulica": "bg-green-500/10 text-green-400"
    };
    return colors[category] || "bg-slate-500/10 text-slate-400";
  };

  // Stats calculation
  const stats = {
    active: templates.filter(t => t.status === "active").length,
    totalTasks: templates.reduce((acc, t) => acc + (t.checklist_tasks?.length || 0), 0),
    avgTime: templates.length > 0 
      ? Math.round(templates.reduce((acc, t) => acc + (t.estimated_time || 0), 0) / templates.length) 
      : 0
  };

  const canDelete = userRole === "admin" || userRole === "supervisor";

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Template Checklist - Maint Ops" />
      
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Template Checklist</h1>
            <p className="text-slate-400">Gestisci e utilizza i template per le attività di manutenzione</p>
          </div>
          
          {(userRole === "admin" || userRole === "supervisor") && (
            <Button
              onClick={() => router.push("/checklists/new")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl px-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crea Template
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Template Attivi</p>
                  <p className="text-3xl font-bold text-white">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Esecuzioni Oggi</p>
                  <p className="text-3xl font-bold text-white">-</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Task Totali</p>
                  <p className="text-3xl font-bold text-white">{stats.totalTasks}</p>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Tempo Medio</p>
                  <p className="text-3xl font-bold text-white">{stats.avgTime}m</p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca template per nome o descrizione..."
              className="pl-12 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="h-5 w-5 text-slate-400 flex-shrink-0" />
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-xl whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {category === "all" ? "Tutte" : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const status = getStatusConfig(template.status || "active");
            const tasks = template.checklist_tasks || [];
            const requiredItems = tasks.filter(t => t.required).length;
            const optionalItems = tasks.length - requiredItems;
            
            return (
              <Card
                key={template.id}
                className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden relative"
                onClick={() => router.push(`/checklist/${template.id}`)}
              >
                <CardContent className="p-6">
                  {/* Header with Delete Button */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          onClick={(e) => handleDeleteClick(template, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>

                  {/* Title & Category */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 min-h-[56px]">
                    {template.name}
                  </h3>
                  
                  <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold border-0 mb-3 ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </Badge>

                  {/* Description */}
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2 min-h-[40px]">
                    {template.description || "Nessuna descrizione"}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{tasks.length}</span> task
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{template.estimated_time}</span> min
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{requiredItems} richiesti</span>
                      <span className="text-slate-600">•</span>
                      <span>{optionalItems} opzionali</span>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/checklist/${template.id}`);
                      }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Esegui
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center col-span-full">
            <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nessun template trovato</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || selectedCategory !== "all"
                ? "Prova a modificare i filtri di ricerca"
                : "Non ci sono template checklist disponibili"}
            </p>
            {(userRole === "admin" || userRole === "supervisor") && (
              <Button
                onClick={() => router.push("/checklists/new")}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crea il primo template
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Elimina Template Checklist
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Questa azione è irreversibile e comporterà l'eliminazione definitiva di tutti i dati associati.
            </DialogDescription>
          </DialogHeader>

          {templateToDelete && (
            <div className="space-y-4 py-4">
              {/* Template Name */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Template da eliminare:</p>
                <p className="text-lg font-semibold text-white">{templateToDelete.name}</p>
                <Badge className={`mt-2 ${getCategoryColor(templateToDelete.category)}`}>
                  {templateToDelete.category}
                </Badge>
              </div>

              {/* Stats Warning */}
              {deleteStats && (
                <div className="space-y-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    ATTENZIONE: Verranno eliminati anche:
                  </p>
                  <ul className="space-y-1 ml-6 text-sm text-slate-300">
                    <li>• <strong>{deleteStats.tasksCount}</strong> task associati</li>
                    <li>• <strong>{deleteStats.executionsCount}</strong> esecuzioni completate</li>
                    <li>• Tutte le note e segnalazioni</li>
                    <li>• Tutti i dati storici collegati</li>
                  </ul>
                </div>
              )}

              {/* Confirmation Text */}
              <p className="text-sm text-slate-400">
                Sei sicuro di voler procedere con l'eliminazione? Questa operazione non può essere annullata.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTemplateToDelete(null);
                setDeleteStats(null);
              }}
              disabled={deleting}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}