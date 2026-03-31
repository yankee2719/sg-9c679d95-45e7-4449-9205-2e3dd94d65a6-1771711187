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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardList, Save } from "lucide-react";

type MachineRow = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
    plant: {
        id: string;
        name: string | null;
        type: string | null;
    } | { id: string; name: string | null; type: string | null }[] | null;
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
    estimated_duration_minutes: number | null;
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

function unwrapRelation<T>(value: T | T[] | null): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

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
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [users, setUsers] = useState < UserRow[] > ([]);
    const [checklists, setChecklists] = useState < ChecklistRow[] > ([]);
    const [form, setForm] = useState < FormState > ({
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
    const userRole = membership?.role ?? "viewer";
    const canCreate = ["owner", "admin", "supervisor"].includes(userRole);

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
                const [{ data: machineRows, error: machineError }, { data: userRows, error: userError }] = await Promise.all([
                    supabase
                        .from("machines")
                        .select(`
                            id,
                            name,
                            internal_code,
                            plant_id,
                            area,
                            plant:plants(id, name, type)
                        `)
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .order("display_name", { ascending: true }),
                ]);

                if (machineError) throw machineError;
                if (userError) throw userError;

                if (!active) return;
                setMachines((machineRows ?? []) as MachineRow[]);
                setUsers((userRows ?? []) as UserRow[]);

                if (planId) {
                    const { data: planRow, error: planError } = await supabase
                        .from("maintenance_plans")
                        .select(`
                            id,
                            machine_id,
                            title,
                            description,
                            priority,
                            estimated_duration_minutes,
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
                    const machine = (machineRows ?? []).find((row: any) => row.id === plan.machine_id) as MachineRow | undefined;

                    setForm((current) => ({
                        ...current,
                        machine_id: plan.machine_id ?? "",
                        plant_id: machine?.plant_id ?? "",
                        maintenance_plan_id: plan.id,
                        title: plan.title?.trim() ? `WO · ${plan.title}` : current.title,
                        description: [plan.description, plan.instructions, plan.safety_notes].filter(Boolean).join("\n\n"),
                        priority: plan.priority || "medium",
                        scheduled_date: plan.next_due_date || current.scheduled_date,
                        due_date: plan.next_due_date || current.due_date,
                        assigned_to: plan.default_assignee_id || current.assigned_to,
                    }));
                }
            } catch (error: any) {
                console.error("work order create context error:", error);
                toast({
                    title: "Errore caricamento contesto",
                    description: error?.message || "Impossibile caricare macchine e utenti.",
                    variant: "destructive",
                });
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, canCreate, organization?.id, planId, toast]);

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

    const selectedMachine = useMemo(
        () => machines.find((machine) => machine.id === form.machine_id) ?? null,
        [form.machine_id, machines]
    );

    const machineOptions = useMemo(() => {
        return machines.map((machine) => {
            const plant = unwrapRelation(machine.plant);
            const machineName = machine.internal_code?.trim() ? `${machine.internal_code} · ${machine.name ?? "Macchina"}` : machine.name ?? "Macchina";
            const context = plant?.name ? `${plant.name} → ${machineName}` : machineName;
            return { value: machine.id, label: context };
        });
    }, [machines]);

    const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === "machine_id") {
                const machine = machines.find((row) => row.id === value);
                next.plant_id = machine?.plant_id ?? "";
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
        if (!form.machine_id || !form.plant_id) {
            toast({ title: "Macchina obbligatoria", description: "Seleziona una macchina valida con relativo contesto impianto/cliente.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                organization_id: organization.id,
                machine_id: form.machine_id,
                plant_id: form.plant_id,
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

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({
                title: "Ordine creato",
                description: "L'ordine di lavoro è stato registrato correttamente.",
            });
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
                        <CardContent className="p-6 text-sm text-muted-foreground">
                            Solo admin e supervisor possono creare ordini di lavoro.
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Nuovo ordine di lavoro - MACHINA" />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuovo ordine di lavoro</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isManufacturer
                                    ? "Crea un ordine da inviare al cliente per una macchina venduta."
                                    : "Crea un ordine ad-hoc oppure partendo da un piano di manutenzione."}
                            </p>
                        </div>
                        <Link href="/work-orders">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Torna alla lista
                            </Button>
                        </Link>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Dati ordine</CardTitle>
                                <CardDescription>
                                    Compila i dati essenziali dell'ordine. Le checklist restano agganciate alla macchina secondo il modello dati attuale.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>{machineContextLabel}</Label>
                                        <Select value={form.machine_id} onValueChange={(value) => handleChange("machine_id", value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Seleziona ${plantLabel.toLowerCase()} e macchina`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {machineOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="wo-title">Titolo</Label>
                                        <Input id="wo-title" value={form.title} onChange={(event) => handleChange("title", event.target.value)} placeholder="Es. Manutenzione mensile pressa 200T" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="wo-description">Descrizione</Label>
                                        <Textarea id="wo-description" rows={5} value={form.description} onChange={(event) => handleChange("description", event.target.value)} placeholder="Obiettivi, attività previste, istruzioni operative..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo lavoro</Label>
                                        <Select value={form.work_type} onValueChange={(value) => handleChange("work_type", value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="preventive">Preventiva</SelectItem>
                                                <SelectItem value="corrective">Correttiva</SelectItem>
                                                <SelectItem value="predictive">Predittiva</SelectItem>
                                                <SelectItem value="inspection">Ispezione</SelectItem>
                                                <SelectItem value="emergency">Emergenza</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Priorità</Label>
                                        <Select value={form.priority} onValueChange={(value) => handleChange("priority", value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                                        <Input type="date" value={form.scheduled_date} onChange={(event) => handleChange("scheduled_date", event.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Scadenza</Label>
                                        <Input type="date" value={form.due_date} onChange={(event) => handleChange("due_date", event.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assegnatario</Label>
                                        <Select value={form.assigned_to || "unassigned"} onValueChange={(value) => handleChange("assigned_to", value === "unassigned" ? "" : value)}>
                                            <SelectTrigger><SelectValue placeholder="Non assegnato" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Non assegnato</SelectItem>
                                                {users.map((userRow) => (
                                                    <SelectItem key={userRow.id} value={userRow.id}>{formatUser(userRow)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stato iniziale</Label>
                                        <Select value={form.status} onValueChange={(value) => handleChange("status", value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Bozza</SelectItem>
                                                <SelectItem value="scheduled">Pianificato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                                    <Link href="/work-orders">
                                        <Button variant="outline">Annulla</Button>
                                    </Link>
                                    <Button onClick={handleSave} disabled={saving}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {saving ? "Salvataggio..." : "Crea ordine"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Contesto macchina</CardTitle>
                                    <CardDescription>
                                        Verifica il contesto prima di confermare l'ordine.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <SummaryRow label={plantLabel} value={unwrapRelation(selectedMachine?.plant)?.name ?? "—"} />
                                    <SummaryRow label="Macchina" value={selectedMachine?.name ?? "—"} />
                                    <SummaryRow label="Codice" value={selectedMachine?.internal_code ?? "—"} />
                                    {!isManufacturer && <SummaryRow label="Area / linea" value={selectedMachine?.area ?? "—"} />}
                                    <SummaryRow label="Piano origine" value={form.maintenance_plan_id || "Ad-hoc"} />
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Checklist disponibili</CardTitle>
                                    <CardDescription>
                                        Il modello dati attuale non usa una tabella ponte ordine↔checklist: nel dettaglio ordine verranno mostrate le checklist attive compatibili con la macchina selezionata.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {form.machine_id ? (
                                        checklists.length > 0 ? (
                                            checklists.map((checklist) => (
                                                <div key={checklist.id} className="rounded-2xl border border-border px-4 py-3 text-sm">
                                                    <div className="font-medium text-foreground">{checklist.title}</div>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        Tipo: {checklist.checklist_type || "inspection"}
                                                        {checklist.machine_id ? " · specifica macchina" : " · template generico"}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                                Nessuna checklist attiva trovata per questa macchina.
                                            </div>
                                        )
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                            Seleziona prima una macchina per vedere le checklist collegate.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        Se arrivi da un piano di manutenzione, titolo, priorità, assegnatario e prima scadenza vengono precompilati. Puoi comunque modificare tutto prima del salvataggio.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

