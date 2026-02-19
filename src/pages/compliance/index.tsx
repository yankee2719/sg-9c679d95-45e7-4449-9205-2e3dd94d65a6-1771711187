import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    ShieldCheck, ShieldAlert, ShieldX, Search, ChevronRight,
    FileText, Wrench, Calendar, AlertTriangle, CheckCircle2,
    XCircle, Clock, Loader2, Filter, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface MachineCompliance {
    id: string;
    name: string;
    internal_code: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    lifecycle_state: string | null;
    plant_name: string | null;

    // Calculated scores
    overallScore: number;
    overallStatus: "compliant" | "partial" | "non_compliant";
    riskLevel: "low" | "medium" | "high" | "critical";

    // Document checks
    docCount: number;
    hasDocuments: boolean;

    // Maintenance checks
    activePlans: number;
    overduePlans: number;
    hasMaintenancePlans: boolean;

    // Work order checks
    openWOs: number;
    overdueWOs: number;

    // Flags
    issues: string[];
}

// =============================================================================
// SCORING LOGIC
// =============================================================================

function calculateCompliance(
    machine: any,
    docs: any[],
    plans: any[],
    workOrders: any[]
): MachineCompliance {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 100;

    // 1. Documentation (40 points max)
    const machineDocs = docs.filter(d => d.equipment_id === machine.id);
    const docCount = machineDocs.length;
    if (docCount === 0) {
        issues.push("Nessun documento caricato");
    } else if (docCount < 2) {
        score += 15;
        issues.push("Documentazione incompleta (meno di 2 documenti)");
    } else if (docCount < 4) {
        score += 30;
    } else {
        score += 40;
    }

    // 2. Maintenance Plans (30 points max)
    const machinePlans = plans.filter(p => p.machine_id === machine.id && p.is_active);
    const overduePlans = machinePlans.filter(p =>
        p.next_due_date && new Date(p.next_due_date) < new Date()
    );

    if (machinePlans.length === 0) {
        issues.push("Nessun piano di manutenzione attivo");
    } else if (overduePlans.length > 0) {
        score += 10;
        issues.push(`${overduePlans.length} piani di manutenzione scaduti`);
    } else {
        score += 30;
    }

    // 3. Work Orders (20 points max)
    const machineWOs = workOrders.filter(wo => wo.machine_id === machine.id);
    const openWOs = machineWOs.filter(wo =>
        !["completed", "approved", "cancelled"].includes(wo.status)
    );
    const overdueWOs = openWOs.filter(wo => {
        const due = wo.scheduled_start || wo.scheduled_date;
        return due && new Date(due) < new Date();
    });

    if (overdueWOs.length > 0) {
        score += 5;
        issues.push(`${overdueWOs.length} ordini di lavoro scaduti`);
    } else if (openWOs.length > 3) {
        score += 10;
        issues.push(`${openWOs.length} ordini di lavoro aperti`);
    } else {
        score += 20;
    }

    // 4. Machine State (10 points)
    if (machine.lifecycle_state === "decommissioned") {
        score += 10; // decommissioned doesn't need maintenance
    } else if (machine.lifecycle_state === "active" || machine.lifecycle_state === "commissioned") {
        score += 10;
    } else if (machine.lifecycle_state === "under_maintenance") {
        score += 5;
    } else {
        score += 0;
        issues.push("Stato macchina non definito");
    }

    // Determine status
    const finalScore = Math.round(score);
    let overallStatus: "compliant" | "partial" | "non_compliant";
    let riskLevel: "low" | "medium" | "high" | "critical";

    if (finalScore >= 80) {
        overallStatus = "compliant";
        riskLevel = "low";
    } else if (finalScore >= 50) {
        overallStatus = "partial";
        riskLevel = overduePlans.length > 0 || overdueWOs.length > 0 ? "high" : "medium";
    } else {
        overallStatus = "non_compliant";
        riskLevel = issues.length > 3 ? "critical" : "high";
    }

    return {
        id: machine.id,
        name: machine.name,
        internal_code: machine.internal_code,
        brand: machine.brand,
        model: machine.model,
        category: machine.category,
        lifecycle_state: machine.lifecycle_state,
        plant_name: machine.plant_name,
        overallScore: finalScore,
        overallStatus,
        riskLevel,
        docCount,
        hasDocuments: docCount > 0,
        activePlans: machinePlans.length,
        overduePlans: overduePlans.length,
        hasMaintenancePlans: machinePlans.length > 0,
        openWOs: openWOs.length,
        overdueWOs: overdueWOs.length,
        issues,
    };
}

// =============================================================================
// CONFIG
// =============================================================================

const statusConfig = {
    compliant: { label: "Conforme", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-500/10", badge: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300" },
    partial: { label: "Parziale", icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10", badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300" },
    non_compliant: { label: "Non Conforme", icon: ShieldX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-500/10", badge: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300" },
};

const riskConfig = {
    low: { label: "Basso", color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300" },
    medium: { label: "Medio", color: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300" },
    high: { label: "Alto", color: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300" },
    critical: { label: "Critico", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300" },
};

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

    return (
        <svg width={size} height={size} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-muted/20" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize={size * 0.28} fontWeight="bold">{score}</text>
        </svg>
    );
}

// =============================================================================
// PAGE
// =============================================================================

export default function ComplianceDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [machines, setMachines] = useState < MachineCompliance[] > ([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [riskFilter, setRiskFilter] = useState < string > ("all");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const ctx = await getUserContext();
            if (!ctx) { router.push("/login"); return; }

            // Load all data in parallel
            const [machinesRes, docsRes, plansRes, wosRes] = await Promise.all([
                supabase.from("machines").select("id, name, internal_code, brand, model, category, lifecycle_state, plant_id, plants(name)")
                    .order("name"),
                supabase.from("documents").select("id, equipment_id"),
                supabase.from("maintenance_plans").select("id, machine_id, is_active, next_due_date"),
                supabase.from("work_orders").select("id, machine_id, status, scheduled_start, scheduled_date"),
            ]);

            const machinesData = (machinesRes.data || []).map((m: any) => ({
                ...m,
                plant_name: m.plants?.name || null,
            }));

            const results = machinesData.map((m: any) =>
                calculateCompliance(m, docsRes.data || [], plansRes.data || [], wosRes.data || [])
            );

            // Sort: non-compliant first, then by score ascending
            results.sort((a, b) => {
                const order = { non_compliant: 0, partial: 1, compliant: 2 };
                const diff = order[a.overallStatus] - order[b.overallStatus];
                return diff !== 0 ? diff : a.overallScore - b.overallScore;
            });

            setMachines(results);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    // =========================================================================
    // FILTER
    // =========================================================================

    const filtered = useMemo(() => {
        return machines.filter(m => {
            if (search) {
                const s = search.toLowerCase();
                if (!m.name.toLowerCase().includes(s) &&
                    !m.internal_code.toLowerCase().includes(s) &&
                    !(m.brand || "").toLowerCase().includes(s)) return false;
            }
            if (statusFilter !== "all" && m.overallStatus !== statusFilter) return false;
            if (riskFilter !== "all" && m.riskLevel !== riskFilter) return false;
            return true;
        });
    }, [machines, search, statusFilter, riskFilter]);

    // =========================================================================
    // STATS
    // =========================================================================

    const stats = useMemo(() => {
        const total = machines.length;
        const compliant = machines.filter(m => m.overallStatus === "compliant").length;
        const partial = machines.filter(m => m.overallStatus === "partial").length;
        const nonCompliant = machines.filter(m => m.overallStatus === "non_compliant").length;
        const avgScore = total > 0 ? Math.round(machines.reduce((s, m) => s + m.overallScore, 0) / total) : 0;
        const criticalCount = machines.filter(m => m.riskLevel === "critical").length;
        return { total, compliant, partial, nonCompliant, avgScore, criticalCount };
    }, [machines]);

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) return (
        <MainLayout>
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="container mx-auto py-6 space-y-6 max-w-6xl">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-primary" /> Compliance Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Stato di conformità calcolato da documentazione, manutenzione e ordini di lavoro
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: "Score Medio", value: `${stats.avgScore}%`, icon: BarChart3, color: stats.avgScore >= 80 ? "text-green-600" : stats.avgScore >= 50 ? "text-amber-600" : "text-red-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
                        { label: "Conformi", value: stats.compliant, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-500/10" },
                        { label: "Parziali", value: stats.partial, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
                        { label: "Non Conformi", value: stats.nonCompliant, icon: XCircle, color: stats.nonCompliant > 0 ? "text-red-600" : "text-gray-400", bg: stats.nonCompliant > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-gray-500/10" },
                        { label: "Rischio Critico", value: stats.criticalCount, icon: AlertTriangle, color: stats.criticalCount > 0 ? "text-red-600" : "text-gray-400", bg: stats.criticalCount > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-gray-500/10" },
                    ].map((s) => (
                        <Card key={s.label} className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                        <s.icon className={`w-5 h-5 ${s.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-xs text-muted-foreground">{s.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters */}
                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Cerca macchina..." value={search} onChange={e => setSearch(e.target.value)}
                                    className="pl-9 bg-muted border-border rounded-xl" />
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="h-9 px-3 rounded-xl bg-muted border border-border text-foreground text-sm">
                                <option value="all">Tutti gli stati</option>
                                <option value="compliant">Conforme</option>
                                <option value="partial">Parziale</option>
                                <option value="non_compliant">Non conforme</option>
                            </select>
                            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
                                className="h-9 px-3 rounded-xl bg-muted border border-border text-foreground text-sm">
                                <option value="all">Tutti i rischi</option>
                                <option value="critical">Critico</option>
                                <option value="high">Alto</option>
                                <option value="medium">Medio</option>
                                <option value="low">Basso</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Machine List */}
                <div className="space-y-2">
                    {filtered.length === 0 ? (
                        <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                            <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-muted-foreground">Nessuna macchina trovata</p>
                        </Card>
                    ) : (
                        filtered.map(m => {
                            const sc = statusConfig[m.overallStatus];
                            const rc = riskConfig[m.riskLevel];
                            const Icon = sc.icon;

                            return (
                                <Card key={m.id}
                                    className="rounded-2xl border-0 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => router.push(`/equipment/${m.id}?tab=general`)}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        {/* Score ring */}
                                        <ScoreRing score={m.overallScore} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground truncate">{m.name}</h3>
                                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{m.internal_code}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <Badge className={`rounded-full px-2 py-0 text-xs font-semibold border ${sc.badge}`}>
                                                    <Icon className="w-3 h-3 mr-1" />{sc.label}
                                                </Badge>
                                                <Badge className={`rounded-full px-2 py-0 text-xs font-semibold border ${rc.color}`}>
                                                    Rischio: {rc.label}
                                                </Badge>
                                                {m.plant_name && <span className="text-xs text-muted-foreground">{m.plant_name}</span>}
                                            </div>

                                            {/* Issues preview */}
                                            {m.issues.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {m.issues.slice(0, 3).map((issue, i) => (
                                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                                            {issue}
                                                        </span>
                                                    ))}
                                                    {m.issues.length > 3 && (
                                                        <span className="text-xs text-muted-foreground">+{m.issues.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right side stats */}
                                        <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
                                            <div title="Documenti">
                                                <FileText className={`w-4 h-4 mx-auto mb-0.5 ${m.hasDocuments ? "text-green-500" : "text-red-400"}`} />
                                                <span className="text-xs text-muted-foreground">{m.docCount}</span>
                                            </div>
                                            <div title="Piani manutenzione">
                                                <Calendar className={`w-4 h-4 mx-auto mb-0.5 ${m.hasMaintenancePlans ? (m.overduePlans > 0 ? "text-red-400" : "text-green-500") : "text-red-400"}`} />
                                                <span className="text-xs text-muted-foreground">{m.activePlans}</span>
                                            </div>
                                            <div title="WO aperti">
                                                <Wrench className={`w-4 h-4 mx-auto mb-0.5 ${m.overdueWOs > 0 ? "text-red-400" : "text-muted-foreground"}`} />
                                                <span className="text-xs text-muted-foreground">{m.openWOs}</span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Legend */}
                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Come viene calcolato il punteggio</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium text-foreground">Documentazione (40%)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Documenti caricati per la macchina</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                    <span className="font-medium text-foreground">Manutenzione (30%)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Piani attivi e rispetto scadenze</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Wrench className="w-4 h-4 text-purple-500" />
                                    <span className="font-medium text-foreground">Ordini di Lavoro (20%)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">WO aperti e scaduti</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    <span className="font-medium text-foreground">Stato Macchina (10%)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Lifecycle state della macchina</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}