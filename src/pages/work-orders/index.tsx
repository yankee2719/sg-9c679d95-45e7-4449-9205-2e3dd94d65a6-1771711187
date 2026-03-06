import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Plus, Search, Wrench, CalendarClock, User } from "lucide-react";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled";
type WorkPriority = "low" | "medium" | "high" | "critical";

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    plant_id: string | null;
    title: string;
    description: string | null;
    work_type: WorkType;
    status: WorkStatus;
    priority: WorkPriority;
    due_date: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
};

type MachineRow = {
    id: string;
    name: string;
    internal_code: string | null;
};

type ProfileRow = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
};

function formatPerson(p?: ProfileRow | null) {
    if (!p) return "Non assegnato";
    if (p.display_name?.trim()) return p.display_name.trim();
    const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return full || "Utente";
}

function formatDateTime(value: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function priorityLabel(priority: WorkPriority) {
    switch (priority) {
        case "low":
            return "Bassa";
        case "medium":
            return "Media";
        case "high":
            return "Alta";
        case "critical":
            return "Critica";
        default:
            return priority;
    }
}

function statusLabel(status: WorkStatus) {
    switch (status) {
        case "draft":
            return "Bozza";
        case "scheduled":
            return "Pianificato";
        case "in_progress":
            return "In corso";
        case "pending_review":
            return "In revisione";
        case "completed":
            return "Completato";
        case "cancelled":
            return "Annullato";
        default:
            return status;
    }
}

function statusBadgeClass(status: WorkStatus) {
    switch (status) {
        case "completed":
            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
        case "in_progress":
            return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
        case "pending_review":
            return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30";
        case "cancelled":
            return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30";
        case "scheduled":
            return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30";
        default:
            return "bg-muted text-muted-foreground border-border";
    }
}

export default function WorkOrdersPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);

    const [workOrders, setWorkOrders] = useState < WorkOrderRow[] > ([]);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [profiles, setProfiles] = useState < Record < string, ProfileRow>> ({});

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [priorityFilter, setPriorityFilter] = useState < string > ("all");
    const [machineFilter, setMachineFilter] = useState < string > ("all");

    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                const activeOrgId = ctx.orgId ?? null;
                if (!activeOrgId) {
                    throw new Error("Organizzazione attiva non trovata nel contesto utente.");
                }

                setRole(ctx.role ?? "technician");
                setOrgId(activeOrgId);

                const [{ data: woRows, error: woErr }, { data: machineRows, error: machineErr }, { data: memberships, error: memErr }] =
                    await Promise.all([
                        supabase
                            .from("work_orders")
                            .select(
                                "id, organization_id, machine_id, plant_id, title, description, work_type, status, priority, due_date, assigned_to, created_at, updated_at"
                            )
                            .eq("organization_id", activeOrgId)
                            .order("created_at", { ascending: false }),
                        supabase
                            .from("machines")
                            .select("id, name, internal_code")
                            .eq("organization_id", activeOrgId)
                            .eq("is_archived", false)
                            .order("name", { ascending: true }),
                        supabase
                            .from("organization_memberships")
                            .select("user_id")
                            .eq("organization_id", activeOrgId)
                            .eq("is_active", true),
                    ]);

                if (woErr) throw woErr;
                if (machineErr) throw machineErr;
                if (memErr) throw memErr;

                setWorkOrders((woRows ?? []) as WorkOrderRow[]);
                setMachines((machineRows ?? []) as MachineRow[]);

                const userIds = Array.from(new Set((memberships ?? []).map((m: any) => m.user_id).filter(Boolean)));
                if (userIds.length > 0) {
                    const { data: profRows, error: profErr } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name")
                        .in("id", userIds);

                    if (profErr) throw profErr;

                    const map: Record<string, ProfileRow> = {};
                    for (const p of profRows ?? []) {
                        map[(p as any).id] = p as ProfileRow;
                    }
                    setProfiles(map);
                } else {
                    setProfiles({});
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento work orders",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, toast]);

    const machineMap = useMemo(() => {
        const map = new Map < string, MachineRow> ();
        for (const machine of machines) {
            map.set(machine.id, machine);
        }
        return map;
    }, [machines]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return workOrders.filter((wo) => {
            if (statusFilter !== "all" && wo.status !== statusFilter) return false;
            if (priorityFilter !== "all" && wo.priority !== priorityFilter) return false;
            if (machineFilter !== "all" && wo.machine_id !== machineFilter) return false;
            if (!q) return true;

            const machineName = wo.machine_id ? machineMap.get(wo.machine_id)?.name ?? "" : "";
            const assignee = wo.assigned_to ? formatPerson(profiles[wo.assigned_to]) : "";
            const haystack = [wo.title, wo.description ?? "", machineName, assignee].join(" ").toLowerCase();
            return haystack.includes(q);
        });
    }, [workOrders, statusFilter, priorityFilter, machineFilter, search, machineMap, profiles]);

    const counters = useMemo(() => {
        return {
            total: workOrders.length,
            open: workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled").length,
            inProgress: workOrders.filter((w) => w.status === "in_progress").length,
            completed: workOrders.filter((w) => w.status === "completed").length,
        };
    }, [workOrders]);

    if (loading) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ClipboardCheck className="w-8 h-8" />
                            Ordini di lavoro
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Vista operativa del contesto attivo. I work order sono gestiti solo dall&apos;organizzazione owner della macchina.
                        </p>
                    </div>

                    {canCreate && (
                        <Button onClick={() => router.push("/work-orders/create")} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo work order
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-2xl shadow-sm border-0">
                        <CardHeader className="pb-2"><CardDescription>Totali</CardDescription><CardTitle>{counters.total}</CardTitle></CardHeader>
                    </Card>
                    <Card className="rounded-2xl shadow-sm border-0">
                        <CardHeader className="pb-2"><CardDescription>Aperti</CardDescription><CardTitle>{counters.open}</CardTitle></CardHeader>
                    </Card>
                    <Card className="rounded-2xl shadow-sm border-0">
                        <CardHeader className="pb-2"><CardDescription>In corso</CardDescription><CardTitle>{counters.inProgress}</CardTitle></CardHeader>
                    </Card>
                    <Card className="rounded-2xl shadow-sm border-0">
                        <CardHeader className="pb-2"><CardDescription>Completati</CardDescription><CardTitle>{counters.completed}</CardTitle></CardHeader>
                    </Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-0">
                    <CardHeader>
                        <CardTitle>Filtri</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Ricerca</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Titolo, macchina, assegnato..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Stato</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="draft">Bozza</SelectItem>
                                    <SelectItem value="scheduled">Pianificato</SelectItem>
                                    <SelectItem value="in_progress">In corso</SelectItem>
                                    <SelectItem value="pending_review">In revisione</SelectItem>
                                    <SelectItem value="completed">Completato</SelectItem>
                                    <SelectItem value="cancelled">Annullato</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priorità</Label>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutte</SelectItem>
                                    <SelectItem value="low">Bassa</SelectItem>
                                    <SelectItem value="medium">Media</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                    <SelectItem value="critical">Critica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Macchina</Label>
                            <Select value={machineFilter} onValueChange={setMachineFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutte le macchine</SelectItem>
                                    {machines.map((machine) => (
                                        <SelectItem key={machine.id} value={machine.id}>
                                            {machine.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {filtered.length === 0 ? (
                        <Card className="rounded-2xl shadow-sm border-0">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Nessun work order trovato nel contesto attivo.
                            </CardContent>
                        </Card>
                    ) : (
                        filtered.map((wo) => {
                            const machine = wo.machine_id ? machineMap.get(wo.machine_id) : null;
                            const assignee = wo.assigned_to ? profiles[wo.assigned_to] : null;

                            return (
                                <Card
                                    key={wo.id}
                                    className="rounded-2xl shadow-sm border-0 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => router.push(`/work-orders/${wo.id}`)}
                                >
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-lg">{wo.title}</h3>
                                                    <Badge className={`border ${statusBadgeClass(wo.status)}`}>{statusLabel(wo.status)}</Badge>
                                                    <Badge variant="outline">{priorityLabel(wo.priority)}</Badge>
                                                    <Badge variant="secondary">{wo.work_type}</Badge>
                                                </div>
                                                {wo.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{wo.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Wrench className="w-4 h-4" />
                                                <span>{machine?.name ?? "Macchina non associata"}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <CalendarClock className="w-4 h-4" />
                                                <span>Scadenza: {formatDateTime(wo.due_date)}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <User className="w-4 h-4" />
                                                <span>{formatPerson(assignee)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
