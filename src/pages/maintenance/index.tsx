import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Filter, ChevronRight, Trash2, Clock, Wrench } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface MaintenancePlan {
    id: string;
    title: string;
    description: string | null;
    frequency_type: string | null;
    frequency_value: number | null;
    next_due_date: string | null;
    last_executed_at: string | null;
    priority: string | null;
    is_active: boolean;
    machine_id: string | null;
    machine_name?: string;
}

export default function MaintenancePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [plans, setPlans] = useState < MaintenancePlan[] > ([]);
    const [filtered, setFiltered] = useState < MaintenancePlan[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [deleting, setDeleting] = useState < string | null > (null);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);

                // Load maintenance plans with machine name
                const { data } = await supabase
                    .from("maintenance_plans")
                    .select("*, machines(name)")
                    .order("next_due_date", { ascending: true, nullsFirst: false });

                if (data) {
                    const mapped = data.map((p: any) => ({
                        ...p,
                        machine_name: p.machines?.name || null,
                    }));
                    setPlans(mapped);
                    setFiltered(mapped);
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    useEffect(() => {
        let f = plans;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            f = f.filter(p => p.title.toLowerCase().includes(q) || p.machine_name?.toLowerCase().includes(q));
        }
        if (priorityFilter !== "all") f = f.filter(p => p.priority === priorityFilter);
        setFiltered(f);
    }, [searchQuery, priorityFilter, plans]);

    const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        if (!confirm(t("maintenance.confirmDelete"))) return;
        setDeleting(id);
        try {
            const { error } = await supabase.from("maintenance_plans").delete().eq("id", id);
            if (error) throw error;
            setPlans(prev => prev.filter(p => p.id !== id));
            toast({ title: t("maintenance.deleteSuccess") });
        } catch (err: any) {
            toast({ title: t("maintenance.deleteError"), description: err?.message, variant: "destructive" });
        } finally {
            setDeleting(null);
        }
    };

    const getPriorityConfig = (priority: string | null) => {
        const map: Record<string, { label: string; color: string }> = {
            high: { label: t("common.high"), color: "bg-red-500/20 text-red-400 border-red-500/30" },
            medium: { label: t("common.medium"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
            low: { label: t("common.low"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
        };
        return map[priority || "medium"] || map.medium;
    };

    const getFrequencyLabel = (type: string | null, value: number | null) => {
        if (!type) return null;
        const labels: Record<string, string> = {
            daily: "Giornaliera", weekly: "Settimanale", biweekly: "Bisettimanale",
            monthly: "Mensile", quarterly: "Trimestrale", semiannual: "Semestrale",
            annual: "Annuale", yearly: "Annuale",
        };
        const label = labels[type] || type;
        return value && value > 1 ? `${label} (ogni ${value})` : label;
    };

    const isAdmin = userRole === "admin" || userRole === "supervisor";
    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${t("maintenance.title")} - MACHINA`} />
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("maintenance.title")}</h1>
                        <p className="text-muted-foreground mt-1">{t("maintenance.subtitle")}</p>
                    </div>
                    {isAdmin && (
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/maintenance/new")}>
                            <Plus className="w-4 h-4 mr-2" /> {t("maintenance.addMaintenance")}
                        </Button>
                    )}
                </div>

                <Card className="rounded-2xl border-border bg-card/80">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder={t("common.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" />
                            </div>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-[160px] bg-muted/50 border-border text-foreground">
                                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder={t("common.priority")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("common.all")}</SelectItem>
                                    <SelectItem value="high">{t("common.high")}</SelectItem>
                                    <SelectItem value="medium">{t("common.medium")}</SelectItem>
                                    <SelectItem value="low">{t("common.low")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    {filtered.map(plan => {
                        const priority = getPriorityConfig(plan.priority);
                        const freq = getFrequencyLabel(plan.frequency_type, plan.frequency_value);
                        const isOverdue = plan.next_due_date && new Date(plan.next_due_date) < new Date();
                        return (
                            <Card key={plan.id}
                                className={`rounded-2xl border-border bg-card/80 hover:border-blue-500/50 transition-all cursor-pointer group ${isOverdue ? "border-red-500/30" : ""}`}
                                onClick={() => router.push(`/maintenance/${plan.id}`)}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <Calendar className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-foreground font-bold truncate">{plan.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                                                {plan.machine_name && (
                                                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{plan.machine_name}</span>
                                                )}
                                                {plan.next_due_date && (
                                                    <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(plan.next_due_date).toLocaleDateString("it-IT")}
                                                    </span>
                                                )}
                                                {freq && (
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{freq}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${priority.color}`}>{priority.label}</Badge>
                                        <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${plan.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                                            {plan.is_active ? "Attivo" : "Inattivo"}
                                        </Badge>
                                        {isAdmin && (
                                            <button onClick={(e) => handleDelete(e, plan.id, plan.title)} disabled={deleting === plan.id}
                                                className="bg-red-500/80 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </button>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {filtered.length === 0 && (
                    <Card className="rounded-2xl border-border bg-card/80 p-12 text-center">
                        <Calendar className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessuna manutenzione programmata</h3>
                        <p className="text-muted-foreground mb-6">Inizia creando il primo piano di manutenzione</p>
                        {isAdmin && (
                            <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/maintenance/new")}>
                                <Plus className="w-4 h-4 mr-2" /> {t("maintenance.addMaintenance")}
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

