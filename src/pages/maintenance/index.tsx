import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface MaintenancePlan {
    id: string;
    title: string;
    description: string | null;
    next_due_date: string | null;
    frequency_type: string | null;
    frequency_value: number | null;
    machine_id: string | null;
    assigned_to: string | null;
    is_active: boolean;
    priority: string | null;
    created_at: string;
    updated_at: string;
}

export default function MaintenancePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");
    const [tasks, setTasks] = useState < MaintenancePlan[] > ([]);
    const [filteredTasks, setFilteredTasks] = useState < MaintenancePlan[] > ([]);
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

                const profileData = await getProfileData(user.id);
                if (profileData?.role) {
                    setUserRole(profileData.role);
                }

                // Query maintenance_plans instead of maintenance_schedules
                const { data, error } = await supabase
                    .from("maintenance_plans")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (data) {
                    setTasks(data as unknown as MaintenancePlan[]);
                    setFilteredTasks(data as unknown as MaintenancePlan[]);
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
                (item) => item.title?.toLowerCase().includes(query)
            );
        }

        if (statusFilter === "active") {
            filtered = filtered.filter((item) => item.is_active);
        } else if (statusFilter === "inactive") {
            filtered = filtered.filter((item) => !item.is_active);
        } else if (statusFilter === "overdue") {
            filtered = filtered.filter((item) =>
                item.is_active && item.next_due_date && new Date(item.next_due_date) < new Date()
            );
        }

        if (priorityFilter !== "all") {
            filtered = filtered.filter((item) => item.priority === priorityFilter);
        }

        setFilteredTasks(filtered);
    }, [searchQuery, statusFilter, priorityFilter, tasks]);

    const getStatusDisplay = (task: MaintenancePlan) => {
        if (!task.is_active) {
            return { label: "Disattivata", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: AlertTriangle };
        }
        if (task.next_due_date && new Date(task.next_due_date) < new Date()) {
            return { label: "Scaduta", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle };
        }
        return { label: "Attiva", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle };
    };

    const getPriorityConfig = (priority: string | null) => {
        const configs: Record<string, { label: string; color: string }> = {
            low: { label: "Bassa", color: "bg-slate-500/20 text-slate-400" },
            medium: { label: "Media", color: "bg-amber-500/20 text-amber-400" },
            high: { label: "Alta", color: "bg-red-500/20 text-red-400" },
            critical: { label: "Critica", color: "bg-red-600/20 text-red-500" },
        };
        return configs[priority || "medium"] || configs.medium;
    };

    const getFrequencyLabel = (type: string | null, value: number | null) => {
        if (!type) return null;
        const labels: Record<string, string> = {
            daily: "Giornaliera",
            weekly: "Settimanale",
            monthly: "Mensile",
            quarterly: "Trimestrale",
            semi_annual: "Semestrale",
            annual: "Annuale",
            custom_days: value ? `Ogni ${value} giorni` : "Custom",
        };
        return labels[type] || type;
    };

    const formatDate = (date: string | null) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <SEO title="Manutenzioni - MACHINA" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manutenzioni</h1>
                        <p className="text-slate-400 mt-1">Gestisci i piani di manutenzione</p>
                    </div>
                    {(userRole === "owner" || userRole === "admin" || userRole === "plant_manager") && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push("/maintenance/new")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo Piano
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
                                    placeholder="Cerca..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                        <SelectValue placeholder="Stato" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-white hover:bg-slate-700">Tutti</SelectItem>
                                        <SelectItem value="active" className="text-white hover:bg-slate-700">Attivi</SelectItem>
                                        <SelectItem value="overdue" className="text-white hover:bg-slate-700">Scaduti</SelectItem>
                                        <SelectItem value="inactive" className="text-white hover:bg-slate-700">Disattivati</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                                        <SelectValue placeholder="Priorità" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-white hover:bg-slate-700">Tutte</SelectItem>
                                        <SelectItem value="low" className="text-white hover:bg-slate-700">Bassa</SelectItem>
                                        <SelectItem value="medium" className="text-white hover:bg-slate-700">Media</SelectItem>
                                        <SelectItem value="high" className="text-white hover:bg-slate-700">Alta</SelectItem>
                                        <SelectItem value="critical" className="text-white hover:bg-slate-700">Critica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Plans List */}
                <div className="space-y-4">
                    {filteredTasks.map((task) => {
                        const status = getStatusDisplay(task);
                        const priority = getPriorityConfig(task.priority);
                        const StatusIcon = status.icon;
                        const frequency = getFrequencyLabel(task.frequency_type, task.frequency_value);

                        return (
                            <Card
                                key={task.id}
                                className="rounded-2xl backdrop-blur-sm transition-all cursor-pointer group overflow-hidden border-slate-700 bg-slate-800/50 hover:border-blue-500/50"
                                onClick={() => router.push(`/maintenance/${task.id}`)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status.color.split(" ")[0]}`}>
                                            <StatusIcon className={`w-6 h-6 ${status.color.split(" ")[1]}`} />
                                        </div>

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
                                                {task.next_due_date && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{formatDate(task.next_due_date)}</span>
                                                    </div>
                                                )}
                                                {frequency && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{frequency}</span>
                                                    </div>
                                                )}
                                                {task.description && (
                                                    <span className="truncate max-w-xs">{task.description}</span>
                                                )}
                                            </div>
                                        </div>

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
                        <h3 className="text-xl font-bold text-white mb-2">Nessun piano di manutenzione</h3>
                        <p className="text-slate-400 mb-6">Non ci sono piani di manutenzione configurati</p>
                        {(userRole === "owner" || userRole === "admin" || userRole === "plant_manager") && (
                            <Button
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                onClick={() => router.push("/maintenance/new")}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crea il primo piano
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
