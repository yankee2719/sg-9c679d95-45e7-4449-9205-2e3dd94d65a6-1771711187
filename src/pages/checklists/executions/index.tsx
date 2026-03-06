import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { ClipboardCheck, Search, Filter, Eye, Wrench, Factory, Building2 } from "lucide-react";

type OrgType = "manufacturer" | "customer";

type ExecutionRow = {
    id: string;
    template_id: string | null;
    work_order_id: string | null;
    machine_id: string | null;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    organization_id?: string | null;
    checklist_template?: {
        id: string;
        title: string | null;
        category: string | null;
    } | null;
    machines?: {
        id: string;
        name: string | null;
        internal_code: string | null;
        organization_id: string | null;
        plant_id: string | null;
    } | null;
    work_orders?: {
        id: string;
        title: string | null;
        status: string | null;
    } | null;
};

type Plant = { id: string; name: string | null };

type UserCtx = {
    userId: string;
    orgId: string | null;
    orgType: OrgType | null;
    role: string;
    displayName: string;
    email: string;
};

function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT");
}

function normalizeStatus(raw?: string | null) {
    const v = String(raw ?? "").toLowerCase();
    if (["completed", "done", "closed"].includes(v)) return "completed";
    if (["in_progress", "started", "open"].includes(v)) return "in_progress";
    if (["draft", "pending"].includes(v)) return "draft";
    return v || "unknown";
}

function statusLabel(status: string) {
    switch (status) {
        case "completed":
            return "Completata";
        case "in_progress":
            return "In corso";
        case "draft":
            return "Bozza";
        default:
            return "Sconosciuto";
    }
}

function statusBadgeClass(status: string) {
    switch (status) {
        case "completed":
            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
        case "in_progress":
            return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
        case "draft":
            return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30";
        default:
            return "bg-muted text-muted-foreground border-border";
    }
}

export default function ChecklistExecutionsIndexPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [ctx, setCtx] = useState < UserCtx | null > (null);
    const [loading, setLoading] = useState(true);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [plants, setPlants] = useState < Plant[] > ([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [plantFilter, setPlantFilter] = useState < string > ("all");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const userCtx = (await getUserContext()) as UserCtx | null;
                if (!userCtx) {
                    router.push("/login");
                    return;
                }
                if (!userCtx.orgId || !userCtx.orgType) {
                    throw new Error("Contesto organizzativo non valido.");
                }
                setCtx(userCtx);

                if (userCtx.orgType === "customer") {
                    const { data: plantsData, error: plantsError } = await supabase
                        .from("plants")
                        .select("id, name")
                        .eq("organization_id", userCtx.orgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (plantsError) throw plantsError;
                    setPlants((plantsData ?? []) as Plant[]);
                } else {
                    setPlants([]);
                }

                let machineIdsForManufacturer: string[] = [];

                if (userCtx.orgType === "manufacturer") {
                    const { data: assignments, error: assignmentsError } = await supabase
                        .from("machine_assignments")
                        .select("machine_id")
                        .eq("manufacturer_org_id", userCtx.orgId)
                        .eq("is_active", true);

                    if (assignmentsError) throw assignmentsError;
                    machineIdsForManufacturer = Array.from(
                        new Set((assignments ?? []).map((r: any) => r.machine_id).filter(Boolean))
                    );
                }

                let query = supabase
                    .from("checklist_executions")
                    .select(`
            id,
            template_id,
            work_order_id,
            machine_id,
            status,
            started_at,
            completed_at,
            created_at,
            updated_at,
            organization_id,
            checklist_template:template_id ( id, title, category ),
            machines:machine_id ( id, name, internal_code, organization_id, plant_id ),
            work_orders:work_order_id ( id, title, status )
          `)
                    .order("created_at", { ascending: false });

                if (userCtx.orgType === "customer") {
                    query = query.eq("organization_id", userCtx.orgId);
                } else {
                    if (machineIdsForManufacturer.length === 0) {
                        setExecutions([]);
                        setLoading(false);
                        return;
                    }
                    query = query.in("machine_id", machineIdsForManufacturer);
                }

                const { data, error } = await query;
                if (error) throw error;

                setExecutions((data ?? []) as ExecutionRow[]);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Errore",
                    description: error?.message ?? "Errore caricamento checklist eseguite.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, toast]);

    const filteredExecutions = useMemo(() => {
        return executions.filter((row) => {
            const normalized = normalizeStatus(row.status);
            const matchesStatus = statusFilter === "all" ? true : normalized === statusFilter;
            const matchesPlant =
                plantFilter === "all"
                    ? true
                    : String(row.machines?.plant_id ?? "") === plantFilter;

            const haystack = [
                row.checklist_template?.title,
                row.checklist_template?.category,
                row.machines?.name,
                row.machines?.internal_code,
                row.work_orders?.title,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());

            return matchesStatus && matchesPlant && matchesSearch;
        });
    }, [executions, plantFilter, search, statusFilter]);

    const stats = useMemo(() => {
        const total = filteredExecutions.length;
        const completed = filteredExecutions.filter((x) => normalizeStatus(x.status) === "completed").length;
        const inProgress = filteredExecutions.filter((x) => normalizeStatus(x.status) === "in_progress").length;
        const draft = filteredExecutions.filter((x) => normalizeStatus(x.status) === "draft").length;
        return { total, completed, inProgress, draft };
    }, [filteredExecutions]);

    return (
        <MainLayout userRole={(ctx?.role as any) || "technician"}>
            <SEO title="Checklist eseguite - MACHINA" />

            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Checklist eseguite</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {ctx?.orgType === "customer"
                                ? "Storico esecuzioni nel tuo contesto operativo."
                                : "Storico esecuzioni sulle macchine collegate ai tuoi clienti."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ctx?.orgType === "manufacturer" ? <Factory className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        <span>{ctx?.orgType === "manufacturer" ? "Vista costruttore" : "Vista cliente"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card><CardHeader className="pb-2"><CardDescription>Totali</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Completate</CardDescription><CardTitle>{stats.completed}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>In corso</CardDescription><CardTitle>{stats.inProgress}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Bozze</CardDescription><CardTitle>{stats.draft}</CardTitle></CardHeader></Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtri</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ricerca</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Template, macchina, work order..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stato</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="draft">Bozza</SelectItem>
                                    <SelectItem value="in_progress">In corso</SelectItem>
                                    <SelectItem value="completed">Completata</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stabilimento</label>
                            <Select value={plantFilter} onValueChange={setPlantFilter} disabled={ctx?.orgType !== "customer"}>
                                <SelectTrigger><SelectValue placeholder="Tutti gli stabilimenti" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    {plants.map((plant) => (
                                        <SelectItem key={plant.id} value={plant.id}>{plant.name ?? plant.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Elenco esecuzioni</CardTitle>
                        <CardDescription>
                            {filteredExecutions.length} risultati
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">Caricamento...</div>
                        ) : filteredExecutions.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nessuna esecuzione trovata.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredExecutions.map((row) => {
                                    const normalized = normalizeStatus(row.status);
                                    return (
                                        <div key={row.id} className="rounded-2xl border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="space-y-2 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-medium truncate">{row.checklist_template?.title ?? "Checklist senza titolo"}</h3>
                                                    <Badge variant="outline" className={statusBadgeClass(normalized)}>{statusLabel(normalized)}</Badge>
                                                    {ctx?.orgType === "manufacturer" && (
                                                        <Badge variant="outline">Solo lettura</Badge>
                                                    )}
                                                </div>

                                                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                                    <span className="inline-flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> {row.machines?.name ?? "Macchina non trovata"}</span>
                                                    <span>WO: {row.work_orders?.title ?? "—"}</span>
                                                    <span>Avvio: {formatDate(row.started_at || row.created_at)}</span>
                                                    <span>Fine: {formatDate(row.completed_at)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/checklists/executions/${row.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> Dettaglio
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
