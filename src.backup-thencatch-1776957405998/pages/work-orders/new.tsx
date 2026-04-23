import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { canManageWorkOrders, normalizeRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardList, Info, Loader2, Save } from "lucide-react";

type MachineRow = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
};

type UserRow = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
};

type PlanRow = {
    id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    priority: string | null;
    instructions: string | null;
    safety_notes: string | null;
    default_assignee_id: string | null;
    next_due_date: string | null;
};

type ChecklistRow = {
    id: string;
    title: string;
    checklist_type: string | null;
    machine_id: string | null;
    is_template: boolean | null;
};

type AssignmentRow = {
    machine_id: string;
    customer_org_id: string | null;
    assigned_at: string | null;
};

type CustomerRow = {
    id: string;
    name: string | null;
};

type PlantRow = {
    id: string;
    name: string | null;
    organization_id: string | null;
};

type FormState = {
    machine_id: string;
    plant_id: string;
    maintenance_plan_id: string;
    title: string;
    description: string;
    work_type: string;
    priority: string;
    status: string;
    scheduled_date: string;
    due_date: string;
    assigned_to: string;
};

function formatUser(user: UserRow) {
    const display = user.display_name?.trim();
    if (display) return display;
    const fallback = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fallback || user.email || "Utente";
}

export default function WorkOrdersNewPage() {
    const router = useRouter();
    const { organization, membership, user, loading: authLoading } = useAuth();
    const { plantLabel, machineContextLabel, isManufacturer } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [form, setForm] = useState<FormState>({
        machine_id: "",
        plant_id: "",
        maintenance_plan_id: "",
        title: "",
        description: "",
        work_type: "preventive",
        priority: "medium",
        status: "scheduled",
        scheduled_date: "",
        due_date: "",
        assigned_to: "",
    });

    const planId = typeof router.query.plan_id === "string" ? router.query.plan_id : "";
    const userRole = normalizeRole(membership?.role ?? null, "technician");
    const canCreate = canManageWorkOrders(userRole);

    const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name ?? "Cliente"])), [customers]);
    const activeAssignmentByMachine = useMemo(() => {
        const map = new Map<string, AssignmentRow>();
        const sorted = [...assignments].sort((a, b) => {
            const aTime = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
            const bTime = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
            return bTime - aTime;
        });
        for (const row of sorted) {
            if (!map.has(row.machine_id)) map.set(row.machine_id, row);
        }
        return map;
    }, [assignments]);
    const customerPrimaryPlantByOrg = useMemo(() => {
        const map = new Map<string, PlantRow>();
        for (const plant of plants) {
            const orgId = plant.organization_id ?? null;
            if (!orgId) continue;
            if (!map.has(orgId)) map.set(orgId, plant);
        }
        return map;
    }, [plants]);

    const resolveContext = (machine: MachineRow | null | undefined) => {
        if (!machine) {
            return { customerName: null as string | null, resolvedPlantId: "", resolvedPlantName: null as string | null };
        }
        const assignment = activeAssignmentByMachine.get(machine.id);
        const customerName = assignment?.customer_org_id ? customerMap.get(assignment.customer_org_id) ?? "Cliente assegnato" : null;
        if (machine.plant_id) {
            const directPlant = plants.find((row) => row.id === machine.plant_id) ?? null;
            return {
                customerName,
                resolvedPlantId: machine.plant_id,
                resolvedPlantName: directPlant?.name ?? null,
            };
        }
        if (assignment?.customer_org_id) {
            const customerPlant = customerPrimaryPlantByOrg.get(assignment.customer_org_id) ?? null;
            return {
                customerName,
                resolvedPlantId: customerPlant?.id ?? "",
                resolvedPlantName: customerPlant?.name ?? null,
            };
        }
        return { customerName, resolvedPlantId: "", resolvedPlantName: null };
    };

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id) {
            setLoading(false);
            return;
        }
        if (!canCreate) {
            setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const [machineRes, userRes] = await Promise.all([
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase.from("profiles").select("id, display_name, first_name, last_name, email").order("display_name", { ascending: true }),
                ]);
                if (machineRes.error) throw machineRes.error;
                if (userRes.error) throw userRes.error;

                let assignmentRows: AssignmentRow[] = [];
                let customerRows: CustomerRow[] = [];
                let plantRows: PlantRow[] = [];

                if (isManufacturer) {
                    const { data: rawAssignments, error: assignmentError } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, customer_org_id, assigned_at")
                        .eq("manufacturer_org_id", organization.id)
                        .eq("is_active", true);
                    if (assignmentError) throw assignmentError;
                    assignmentRows = (rawAssignments ?? []) as AssignmentRow[];

                    const customerIds = Array.from(new Set(assignmentRows.map((row) => row.customer_org_id).filter(Boolean))) as string[];
                    if (customerIds.length > 0) {
                        const [{ data: orgRows, error: orgError }, { data: customerPlantRows, error: plantError }] = await Promise.all([
                            supabase.from("organizations").select("id, name").in("id", customerIds),
                            supabase.from("plants").select("id, name, organization_id").in("organization_id", customerIds).order("name", { ascending: true }),
                        ]);
                        if (orgError) throw orgError;
                        if (plantError) throw plantError;
                        customerRows = (orgRows ?? []) as CustomerRow[];
                        plantRows = (customerPlantRows ?? []) as PlantRow[];
                    }
                }

                if (!active) return;
                const machineRows = (machineRes.data ?? []) as MachineRow[];
                setMachines(machineRows);
                setUsers((userRes.data ?? []) as UserRow[]);
                setAssignments(assignmentRows);
                setCustomers(customerRows);
                setPlants(plantRows);

                if (planId) {
                    const { data: planRow, error: planError } = await supabase
                        .from("maintenance_plans")
                        .select(`
              id,
              machine_id,
              title,
              description,
              priority,
              instructions,
              safety_notes,
              default_assignee_id,
              next_due_date
            `)
                        .eq("organization_id", organization.id)
                        .eq("id", planId)
                        .single();
                    if (planError) throw planError;
                    const plan = planRow as PlanRow;
                    const machine = machineRows.find((row) => row.id === plan.machine_id) ?? null;
                    const context = resolveContext(machine);

                    setForm((current) => ({
                        ...current,
                        machine_id: plan.machine_id ?? machineRows[0]?.id ?? current.machine_id,
                        plant_id: context.resolvedPlantId || machine?.plant_id || "",
                        maintenance_plan_id: plan.id,
                        title: plan.title?.trim() ? `WO · ${plan.title}` : current.title,
                        description: [plan.description, plan.instructions, plan.safety_notes].filter(Boolean).join("\n\n"),
                        priority: plan.priority || "medium",
                        scheduled_date: plan.next_due_date || current.scheduled_date,
                        due_date: plan.next_due_date || current.due_date,
                        assigned_to: plan.default_assignee_id || current.assigned_to,
                    }));
                } else {
                    const firstMachine = machineRows[0] ?? null;
                    const context = resolveContext(firstMachine);
                    setForm((current) => ({
                        ...current,
                        machine_id: current.machine_id || firstMachine?.id || "",
                        plant_id: current.plant_id || context.resolvedPlantId || firstMachine?.plant_id || "",
                    }));
                }
            } catch (error: any) {
                console.error("work order create context error:", error);
                if (active) {
                    toast({
                        title: "Errore caricamento contesto",
                        description: error?.message || "Impossibile caricare macchine e utenti.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, canCreate, organization?.id, planId, isManufacturer, toast]);

    useEffect(() => {
        if (!organization?.id || !form.machine_id) {
            setChecklists([]);
            return;
        }
        let active = true;
        const loadChecklists = async () => {
            try {
                const { data, error } = await supabase
                    .from("checklists")
                    .select("id, title, checklist_type, machine_id, is_template")
                    .eq("organization_id", organization.id)
                    .eq("is_active", true)
                    .or(`machine_id.eq.${form.machine_id},machine_id.is.null`)
                    .order("title", { ascending: true });
                if (error) throw error;
                if (active) setChecklists((data ?? []) as ChecklistRow[]);
            } catch (error) {
                console.error("checklists for work order error:", error);
                if (active) setChecklists([]);
            }
        };
        void loadChecklists();
        return () => {
            active = false;
        };
    }, [form.machine_id, organization?.id]);

    const selectedMachine = useMemo(() => machines.find((machine) => machine.id === form.machine_id) ?? null, [form.machine_id, machines]);
    const selectedContext = useMemo(() => resolveContext(selectedMachine), [selectedMachine, activeAssignmentByMachine, customerMap, customerPrimaryPlantByOrg, plants]);

    const machineOptions = useMemo(() => {
        return machines.map((machine) => {
            const context = resolveContext(machine);
            const machineName = machine.internal_code?.trim() ? `${machine.internal_code} · ${machine.name ?? "Macchina"}` : machine.name ?? "Macchina";
            const contextName = isManufacturer ? context.customerName || "Non assegnata" : context.resolvedPlantName || "Senza stabilimento";
            return { value: machine.id, label: `${contextName} → ${machineName}${machine.area ? ` · ${machine.area}` : ""}` };
        });
    }, [machines, isManufacturer, activeAssignmentByMachine, customerMap, customerPrimaryPlantByOrg, plants]);

    const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === "machine_id") {
                const machine = machines.find((row) => row.id === value) ?? null;
                const context = resolveContext(machine);
                next.plant_id = context.resolvedPlantId || machine?.plant_id || "";
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!organization?.id || !user?.id) return;
        if (!form.title.trim()) {
            toast({ title: "Titolo obbligatorio", description: "Inserisci un titolo per l'ordine di lavoro.", variant: "destructive" });
            return;
        }
        if (!form.machine_id) {
            toast({ title: "Macchina obbligatoria", description: "Seleziona una macchina valida prima di creare l'ordine.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                organization_id: organization.id,
                machine_id: form.machine_id,
                plant_id: form.plant_id || null,
                maintenance_plan_id: form.maintenance_plan_id || null,
                title: form.title.trim(),
                description: form.description.trim() || null,
                work_type: form.work_type,
                priority: form.priority,
                status: form.status,
                scheduled_date: form.scheduled_date || null,
                due_date: form.due_date || null,
                assigned_to: form.assigned_to || null,
                created_by: user.id,
            };

            const { data, error } = await supabase.from("work_orders").insert(payload).select("id").single();
            if (error) throw error;

            toast({ title: "Ordine creato", description: "L'ordine di lavoro è stato registrato correttamente." });
            void router.push(`/work-orders/${data.id}`);
        } catch (error: any) {
            console.error("work order create error:", error);
            toast({
                title: "Errore creazione ordine",
                description: error?.message || "Impossibile creare l'ordine di lavoro.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">Caricamento contesto ordine di lavoro...</div>
            </MainLayout>
        );
    }

    if (!canCreate) {
        return (
            <MainLayout userRole={userRole}>
                <div className="mx-auto max-w-3xl p-8">
                    <Card className="rounded-2xl">
                        <CardContent className="p-6 text-sm text-muted-foreground">Solo admin e supervisor possono creare ordini di lavoro.</CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Nuovo ordine di lavoro - MACHINA" />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href="/work-orders"><ArrowLeft className="mr-2 h-4 w-4" />Torna agli ordini</Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuovo ordine di lavoro</h1>
                            <p className="text-sm text-muted-foreground">
                                {isManufacturer
                                    ? "Crea un ordine per una macchina venduta e assegnata a un cliente."
                                    : "Crea un ordine operativo per le tue macchine e assegnalo a un tecnico."}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
                        <Card className="rounded-3xl border-border/70 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl">Dati ordine</CardTitle>
                                <CardDescription>Compila i campi principali dell'intervento.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{isManufacturer ? "Cliente → Macchina" : machineContextLabel}</Label>
                                    <Select value={form.machine_id} onValueChange={(value) => handleChange("machine_id", value)}>
                                        <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Seleziona macchina" /></SelectTrigger>
                                        <SelectContent>
                                            {machineOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Titolo ordine</Label>
                                        <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="Es. Intervento mensile pressa HMS140" className="h-12 rounded-2xl" />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Descrizione</Label>
                                        <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Dettagli operativi, criticità note, richieste del cliente..." className="min-h-[120px] rounded-2xl" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Tipo lavoro</Label>
                                        <Select value={form.work_type} onValueChange={(value) => handleChange("work_type", value)}>
                                            <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="preventive">Preventivo</SelectItem>
                                                <SelectItem value="corrective">Correttivo</SelectItem>
                                                <SelectItem value="predictive">Predittivo</SelectItem>
                                                <SelectItem value="inspection">Ispezione</SelectItem>
                                                <SelectItem value="emergency">Emergenza</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Priorità</Label>
                                        <Select value={form.priority} onValueChange={(value) => handleChange("priority", value)}>
                                            <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Bassa</SelectItem>
                                                <SelectItem value="medium">Media</SelectItem>
                                                <SelectItem value="high">Alta</SelectItem>
                                                <SelectItem value="critical">Critica</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Data programmata</Label>
                                        <Input type="date" value={form.scheduled_date} onChange={(e) => handleChange("scheduled_date", e.target.value)} className="h-12 rounded-2xl" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Scadenza</Label>
                                        <Input type="date" value={form.due_date} onChange={(e) => handleChange("due_date", e.target.value)} className="h-12 rounded-2xl" />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Assegnatario</Label>
                                        <Select value={form.assigned_to || "__none__"} onValueChange={(value) => handleChange("assigned_to", value === "__none__" ? "" : value)}>
                                            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Nessun assegnatario" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Nessun assegnatario</SelectItem>
                                                {users.map((entry) => <SelectItem key={entry.id} value={entry.id}>{formatUser(entry)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <Button type="button" className="rounded-2xl bg-orange-500 px-6 text-white hover:bg-orange-600" disabled={saving} onClick={handleSave}>
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Crea ordine di lavoro
                                    </Button>
                                    <Button asChild type="button" variant="outline" className="rounded-2xl"><Link href="/work-orders">Annulla</Link></Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl">Contesto macchina</CardTitle>
                                    <CardDescription>Riepilogo della macchina e del contesto operativo corrente.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">{plantLabel}</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{isManufacturer ? (selectedContext.customerName || "—") : (selectedContext.resolvedPlantName || "—")}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Macchina</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{selectedMachine?.name || selectedMachine?.internal_code || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Area / linea</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{selectedMachine?.area?.trim() || "—"}</div>
                                    </div>
                                    {isManufacturer && selectedContext.customerName && !selectedContext.resolvedPlantId && (
                                        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground"><Info className="h-4 w-4" /> Stabilimento cliente opzionale</div>
                                            <div className="space-y-2">
                                                <p>
                                                    Per creare l'ordine basta selezionare la macchina specifica cliente. Lo stabilimento cliente non è obbligatorio.
                                                </p>
                                                <p>
                                                    Quando vuoi completare il contesto, vai su <strong>Assegnazioni macchine</strong> e imposta uno stabilimento cliente oppure aggiorna il campo <strong>Area / linea</strong> della macchina.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl"><ClipboardList className="h-5 w-5" /> Checklist compatibili</CardTitle>
                                    <CardDescription>Template attivi per la macchina selezionata o generici.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {checklists.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/70 p-4 text-muted-foreground">Nessuna checklist attiva compatibile con questa macchina.</div>
                                    ) : (
                                        checklists.map((checklist) => (
                                            <div key={checklist.id} className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                                                <div className="font-semibold text-foreground">{checklist.title}</div>
                                                <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{checklist.checklist_type || "inspection"}{checklist.machine_id ? " · macchina specifica" : " · template generico"}</div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
