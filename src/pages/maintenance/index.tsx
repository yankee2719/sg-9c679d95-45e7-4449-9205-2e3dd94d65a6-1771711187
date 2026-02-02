import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Search,
  Wrench,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  equipment: { id: string; name: string } | null;
  performed_by_user: { id: string; full_name: string } | null;
}

export default function MaintenancePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<MaintenanceTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as "admin" | "supervisor" | "technician");
        }

        const { data } = await supabase
          .from("maintenance_logs")
          .select(`
            *,
            equipment:equipment(id, name),
            performed_by_user:profiles(id, full_name)
          `)
          .order("created_at", { ascending: false });

        if (data) {
          setTasks(data as any);
          setFilteredTasks(data as any);
        }
      } catch (error) {
        console.error("Error loading maintenance:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = tasks;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.equipment?.name.toLowerCase().includes(query) ||
          item.performed_by_user?.full_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((item) => item.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  }, [searchQuery, statusFilter, priorityFilter, tasks]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: t("maintenance.pending"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
      in_progress: { label: t("maintenance.inProgress"), color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Wrench },
      completed: { label: t("maintenance.completed"), color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
      cancelled: { label: t("maintenance.cancelled"), color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: AlertTriangle }
    };
    return configs[status] || configs.pending;
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      low: { label: t("common.low"), color: "bg-slate-500/20 text-slate-400" },
      medium: { label: t("common.medium"), color: "bg-amber-500/20 text-amber-400" },
      high: { label: t("common.high"), color: "bg-red-500/20 text-red-400" },
      urgent: { label: t("common.urgent") || "Urgent", color: "bg-red-600/20 text-red-500" }
    };
    return configs[priority] || configs.medium;
  };

  const formatDate = (date: string) => {
    const locale = language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
    return new Date(date).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`${t("maintenance.title")} - Maint Ops`} />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("maintenance.title")}</h1>
            <p className="text-slate-400 mt-1">{t("maintenance.subtitle")}</p>
          </div>
          {(userRole === "admin" || userRole === "supervisor") && (
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
              onClick={() => router.push("/maintenance/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("maintenance.addMaintenance")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">{t("common.all")}</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-slate-700">{t("maintenance.pending")}</SelectItem>
                    <SelectItem value="in_progress" className="text-white hover:bg-slate-700">{t("maintenance.inProgress")}</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-slate-700">{t("maintenance.completed")}</SelectItem>
                    <SelectItem value="cancelled" className="text-white hover:bg-slate-700">{t("maintenance.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder={t("common.priority")} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">{t("common.all")}</SelectItem>
                    <SelectItem value="low" className="text-white hover:bg-slate-700">{t("common.low")}</SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-slate-700">{t("common.medium")}</SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-slate-700">{t("common.high")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const status = getStatusConfig(task.status);
            const priority = getPriorityConfig(task.priority);
            const StatusIcon = status.icon;

            return (
              <Card
                key={task.id}
                className="rounded-2xl backdrop-blur-sm transition-all cursor-pointer group overflow-hidden border-slate-700 bg-slate-800/50 hover:border-blue-500/50"
                onClick={() => router.push(`/maintenance/${task.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status.color.split(" ")[0]}`}>
                      <StatusIcon className={`w-6 h-6 ${status.color.split(" ")[1]}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-bold text-white text-lg">{task.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border-0 ${priority.color}`}>
                            {priority.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        {task.equipment && (
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            <span>{task.equipment.name}</span>
                          </div>
                        )}
                        {task.started_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(task.started_at)}</span>
                          </div>
                        )}
                        {task.performed_by_user && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5 bg-blue-500/20">
                              <AvatarFallback className="text-blue-400 text-xs">
                                {getInitials(task.performed_by_user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{task.performed_by_user.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge className={`rounded-lg px-3 py-1.5 text-sm font-semibold border flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
            <Wrench className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t("maintenance.noMaintenance")}</h3>
            <p className="text-slate-400 mb-6">{t("maintenance.noMaintenanceDesc")}</p>
            {(userRole === "admin" || userRole === "supervisor") && (
              <Button 
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                onClick={() => router.push("/maintenance/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("maintenance.addFirst")}
              </Button>
            )}
          </Card>
        )}
      </div>
    </MainLayout>
  );
}