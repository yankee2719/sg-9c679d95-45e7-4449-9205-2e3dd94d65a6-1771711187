import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter
} from "lucide-react";

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  itemCount: number;
  estimatedTime: string;
  status: "active" | "draft" | "archived";
  requiredItems: number;
  optionalItems: number;
}

export default function ChecklistsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Mock data - Replace with real API call
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([
    {
      id: "1",
      name: "Manutenzione Preventiva Standard",
      description: "Checklist completa per manutenzione preventiva ordinaria su macchinari industriali",
      category: "Preventiva",
      itemCount: 12,
      estimatedTime: "45min",
      status: "active",
      requiredItems: 8,
      optionalItems: 4
    },
    {
      id: "2",
      name: "Controllo Sicurezza Macchine",
      description: "Verifica sistemi di sicurezza e conformità normativa",
      category: "Sicurezza",
      itemCount: 8,
      estimatedTime: "30min",
      status: "active",
      requiredItems: 8,
      optionalItems: 0
    },
    {
      id: "3",
      name: "Ispezione Impianto Elettrico",
      description: "Controllo quadri elettrici, collegamenti e messa a terra",
      category: "Elettrica",
      itemCount: 15,
      estimatedTime: "60min",
      status: "active",
      requiredItems: 12,
      optionalItems: 3
    },
    {
      id: "4",
      name: "Manutenzione CNC",
      description: "Checklist specifica per centri di lavoro CNC e torni automatici",
      category: "CNC",
      itemCount: 18,
      estimatedTime: "90min",
      status: "active",
      requiredItems: 14,
      optionalItems: 4
    },
    {
      id: "5",
      name: "Controllo Robotica",
      description: "Verifica funzionamento robot industriali e sistemi automatizzati",
      category: "Robotica",
      itemCount: 10,
      estimatedTime: "45min",
      status: "active",
      requiredItems: 7,
      optionalItems: 3
    },
    {
      id: "6",
      name: "Ispezione Idraulica",
      description: "Controllo impianti idraulici, pressioni e perdite",
      category: "Idraulica",
      itemCount: 14,
      estimatedTime: "50min",
      status: "draft",
      requiredItems: 10,
      optionalItems: 4
    }
  ]);

  const categories = ["all", "Preventiva", "Sicurezza", "Elettrica", "CNC", "Robotica", "Idraulica"];

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
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory && template.status === "active";
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

  if (loading) return null;

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
                  <p className="text-3xl font-bold text-white">
                    {templates.filter(t => t.status === "active").length}
                  </p>
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
                  <p className="text-sm text-slate-400 mb-1">Completati Oggi</p>
                  <p className="text-3xl font-bold text-white">24</p>
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
                  <p className="text-sm text-slate-400 mb-1">In Corso</p>
                  <p className="text-3xl font-bold text-white">5</p>
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
                  <p className="text-3xl font-bold text-white">52min</p>
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
            const status = getStatusConfig(template.status);
            
            return (
              <Card
                key={template.id}
                className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/checklist/${template.id}`)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-6 h-6 text-blue-400" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
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
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{template.itemCount}</span> task
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{template.estimatedTime}</span>
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{template.requiredItems} richiesti</span>
                      <span>•</span>
                      <span>{template.optionalItems} opzionali</span>
                    </div>
                    <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
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
    </MainLayout>
  );
}