import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CalendarDays, Loader2, Save, ShieldAlert, Wrench } from "lucide-react";

type FrequencyType = "hours" | "days" | "weeks" | "months" | "cycles";
type PlanPriority = "low" | "medium" | "high" | "critical";

type MachineRow = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
};

type PlantRow = {
    id: string;
    name: string | null;
    organization_id?: string | null;
};

type UserRow = {
    id: string;
    displayName: string;
    role: string | null;
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

type FormState = {
    machine_id: string;
    title: string;
    description: string;
    frequency_type: FrequencyType;
    frequency_value: string;
    priority: PlanPriority;
    estimated_duration_minutes: string;
    instructions: string;
    safety_notes: string;
    required_skills: string;
    default_assignee_id: string;
    next_due_date: string;
};

const emptyForm: FormState = {
    machine_id: "",
    title: "",
    description: "",
    frequency_type: "days",
    frequency_value: "30",
    priority: "medium",
    estimated_duration_minutes: "",
    instructions: "",
    safety_notes: "",
    required_skills: "",
    default_assignee_id: "",
    next_due_date: "",
};

export default function MaintenancePlanNewPage() {
    const router = useRouter();
    const { organization, membership, user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { plantLabel, machineContextLabel, canManageMaintenance, isManufacturer } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [form, setForm] = useState<FormState>(emptyForm);

    const plantMap = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
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

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id) {
            setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const [machineRes, membershipRes] = await Promise.all([
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("organization_memberships")
                        .select("user_id, role")
                        .eq("organization_id", organization.id)
                        .eq("is_active", true),
                ]);

                if (machineRes.error) throw machineRes.error;
                if (membershipRes.error) throw membershipRes.error;

                const membershipRows = membershipRes.data ?? [];
                const userIds = Array.from(new Set(membershipRows.map((row: any) => row.user_id).filter(Boolean)));

                let profileMap = new Map<string, any>();
                if (userIds.length > 0) {
                    const { data: profileRows, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);
                    if (profileError) throw profileError;
                    profileMap = new Map((profileRows ?? []).map((profile: any) => [profile.id, profile]));
                }

                const normalizedUsers: UserRow[] = membershipRows.map((row: any) => {
                    const profile = profileMap.get(row.user_id);
                    const displayName =
                        profile?.display_name?.trim() ||
                        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
                        profile?.email ||
                        row.user_id;
                    return { id: row.user_id, displayName, role: row.role ?? null };
                });

                let plantRows: PlantRow[] = [];
                let assignmentRows: AssignmentRow[] = [];
                let customerRows: CustomerRow[] = [];

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
                        const [{ data: orgRows, error: orgError }, { data: customerPlantRows, error: customerPlantsError }] = await Promise.all([
                            supabase.from("organizations").select("id, name").in("id", customerIds),
                            supabase.from("plants").select("id, name, organization_id").in("organization_id", customerIds).order("name", { ascending: true }),
                        ]);
                        if (orgError) throw orgError;
                        if (customerPlantsError) throw customerPlantsError;
                        customerRows = (orgRows ?? []) as CustomerRow[];
                        plantRows = (customerPlantRows ?? []) as PlantRow[];
                    }
                } else {
                    const { data: ownPlants, error: plantError } = await supabase
                        .from("plants")
                        .select("id, name, organization_id")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true });
                    if (plantError) throw plantError;
                    plantRows = (ownPlants ?? []) as PlantRow[];
                }

                if (!active) return;

                const machineList = (machineRes.data ?? []) as MachineRow[];
                setMachines(machineList);
                setPlants(plantRows);
                setAssignments(assignmentRows);
                setCustomers(customerRows);
                setUsers(normalizedUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, "it")));
                setForm((prev) => ({
                    ...prev,
                    machine_id: prev.machine_id || machineList[0]?.id || "",
                }));
            } catch (error: any) {
                console.error("maintenance new load error:", error);
                if (active) {
                    toast({
                        title: "Errore caricamento dati",
                        description: error?.message || "Impossibile preparare il modulo piano di manutenzione.",
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
    }, [authLoading, organization?.id, isManufacturer, toast]);

    const selectedMachine = useMemo(() => machines.find((machine) => machine.id === form.machine_id) ?? null, [form.machine_id, machines]);
    const selectedAssignment = useMemo(
        () => (selectedMachine ? activeAssignmentByMachine.get(selectedMachine.id) ?? null : null),
        [selectedMachine, activeAssignmentByMachine]
    );
    const selectedCustomerName = selectedAssignment?.customer_org_id ? customerMap.get(selectedAssignment.customer_org_id) ?? "Cliente assegnato" : null;
    const selectedPlant = useMemo(() => {
        if (!selectedMachine) return null;
        if (selectedMachine.plant_id) return plantMap.get(selectedMachine.plant_id) ?? null;
        if (isManufacturer && selectedAssignment?.customer_org_id) {
            return customerPrimaryPlantByOrg.get(selectedAssignment.customer_org_id) ?? null;
        }
        return null;
    }, [selectedMachine, plantMap, isManufacturer, selectedAssignment, customerPrimaryPlantByOrg]);

    const machineOptions = useMemo(() => {
        return machines.map((machine) => {
            const machineName = machine.name?.trim() || machine.internal_code?.trim() || "Macchina senza nome";
            const assignment = activeAssignmentByMachine.get(machine.id);
            const customerName = assignment?.customer_org_id ? customerMap.get(assignment.customer_org_id) ?? "Cliente assegnato" : null;
            const plantName = machine.plant_id ? plantMap.get(machine.plant_id)?.name ?? null : null;
            const contextName = isManufacturer ? customerName || "Non assegnata" : plantName || "Senza stabilimento";
            const area = machine.area?.trim();
            return {
                value: machine.id,
                label: `${machineContextLabel}: ${contextName} → ${machineName}${area ? ` · ${area}` : ""}`,
            };
        });
    }, [machines, activeAssignmentByMachine, customerMap, plantMap, isManufacturer, machineContextLabel]);

    const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!organization?.id || !user?.id) return;
        if (!canManageMaintenance) {
            toast({ title: "Operazione non consentita", description: "Non hai i permessi per creare piani di manutenzione.", variant: "destructive" });
            return;
        }
        if (!form.machine_id) {
            toast({ title: "Macchina obbligatoria", description: "Seleziona una macchina prima di salvare il piano.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                organization_id: organization.id,
                machine_id: form.machine_id,
                title: form.title.trim(),
                description: form.description.trim() || null,
                frequency_type: form.frequency_type,
                frequency_value: Number(form.frequency_value),
                estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
                required_skills: form.required_skills ? form.required_skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [],
                instructions: form.instructions.trim() || null,
                safety_notes: form.safety_notes.trim() || null,
                default_assignee_id: form.default_assignee_id || null,
                priority: form.priority,
                next_due_date: form.next_due_date || null,
                created_by: user.id,
                is_active: true,
            };

            const { data, error } = await supabase.from("maintenance_plans").insert(payload).select("id").single();
            if (error) throw error;

            toast({ title: "Piano creato", description: "Il piano di manutenzione è stato salvato correttamente." });
            void router.push(`/maintenance/${data.id}`);
        } catch (error: any) {
            console.error("maintenance plan save error:", error);
            toast({
                title: "Errore salvataggio",
                description: error?.message || "Impossibile salvare il piano di manutenzione.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const userRole = membership?.role ?? "technician";

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <div className="p-8 text-sm text-muted-foreground">Caricamento contesto piano di manutenzione...</div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Nuovo piano di manutenzione - MACHINA" />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href="/maintenance">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai piani
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuovo piano di manutenzione</h1>
                            <p className="text-sm text-muted-foreground">
                                {isManufacturer
                                    ? "Definisci la regola di manutenzione per una macchina venduta a un cliente."
                                    : "Definisci un piano di manutenzione interno per macchina e stabilimento."}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
                        <Card className="rounded-3xl border-border/70 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl">Configurazione piano</CardTitle>
                                <CardDescription>Compila i dati principali della regola manutentiva.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>{machineContextLabel}</Label>
                                            <Select value={form.machine_id} onValueChange={(value) => handleChange("machine_id", value)}>
                                                <SelectTrigger className="h-12 rounded-2xl">
                                                    <SelectValue placeholder="Seleziona la macchina" />
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
                                            <Label>Titolo piano</Label>
                                            <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="Es. Manutenzione mensile pressa HMS140" className="h-12 rounded-2xl" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Descrizione</Label>
                                            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Scopo del piano, condizioni operative, note generali..." className="min-h-[120px] rounded-2xl" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Frequenza</Label>
                                            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                                                <Input value={form.frequency_value} type="number" min="1" onChange={(e) => handleChange("frequency_value", e.target.value)} className="h-12 rounded-2xl" />
                                                <Select value={form.frequency_type} onValueChange={(value: FrequencyType) => handleChange("frequency_type", value)}>
                                                    <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hours">Ore</SelectItem>
                                                        <SelectItem value="days">Giorni</SelectItem>
                                                        <SelectItem value="weeks">Settimane</SelectItem>
                                                        <SelectItem value="months">Mesi</SelectItem>
                                                        <SelectItem value="cycles">Cicli</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Priorità</Label>
                                            <Select value={form.priority} onValueChange={(value: PlanPriority) => handleChange("priority", value)}>
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
                                            <Label>Durata stimata (minuti)</Label>
                                            <Input value={form.estimated_duration_minutes} type="number" min="0" onChange={(e) => handleChange("estimated_duration_minutes", e.target.value)} className="h-12 rounded-2xl" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Prima scadenza</Label>
                                            <Input value={form.next_due_date} type="date" onChange={(e) => handleChange("next_due_date", e.target.value)} className="h-12 rounded-2xl" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Assegnatario predefinito</Label>
                                            <Select value={form.default_assignee_id || "__none__"} onValueChange={(value) => handleChange("default_assignee_id", value === "__none__" ? "" : value)}>
                                                <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Nessun assegnatario" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Nessun assegnatario</SelectItem>
                                                    {users.map((entry) => (
                                                        <SelectItem key={entry.id} value={entry.id}>{entry.displayName}{entry.role ? ` · ${entry.role}` : ""}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Competenze richieste</Label>
                                            <Input value={form.required_skills} onChange={(e) => handleChange("required_skills", e.target.value)} placeholder="Es. meccanica, lubrificazione, sicurezza" className="h-12 rounded-2xl" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Istruzioni operative</Label>
                                            <Textarea value={form.instructions} onChange={(e) => handleChange("instructions", e.target.value)} placeholder="Passi principali, strumenti necessari, modalità di verifica..." className="min-h-[140px] rounded-2xl" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Note di sicurezza</Label>
                                            <Textarea value={form.safety_notes} onChange={(e) => handleChange("safety_notes", e.target.value)} placeholder="DPI, lockout/tagout, area da isolare, punti di rischio..." className="min-h-[120px] rounded-2xl" />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <Button type="submit" className="rounded-2xl bg-orange-500 px-6 text-white hover:bg-orange-600" disabled={saving}>
                                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salva piano
                                        </Button>
                                        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/maintenance")}>Annulla</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl">Contesto macchina</CardTitle>
                                    <CardDescription>Riepilogo del contesto selezionato.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">{plantLabel}</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{isManufacturer ? (selectedCustomerName || "—") : (selectedPlant?.name || "—")}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Macchina</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{selectedMachine?.name || selectedMachine?.internal_code || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Area / linea</div>
                                        <div className="mt-1 text-lg font-semibold text-foreground">{selectedMachine?.area?.trim() || "—"}</div>
                                    </div>
                                    {isManufacturer && selectedCustomerName && !selectedPlant && (
                                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                                            Cliente assegnato rilevato correttamente. Non risulta però nessuno stabilimento del cliente disponibile da associare automaticamente ai futuri work order.
                                        </div>
                                    )}
                                    <div className="rounded-3xl border border-border/70 bg-muted/30 p-4">
                                        <div className="flex items-center gap-2 text-base font-semibold text-foreground"><CalendarDays className="h-4 w-4" /> Logica di utilizzo</div>
                                        <p className="mt-3 leading-7 text-muted-foreground">
                                            Questo piano definisce la regola. Gli ordini di lavoro verranno generati dal piano e le checklist si compileranno dentro il work order.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl"><Wrench className="h-5 w-5" /> Buone pratiche</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm text-muted-foreground">
                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="mb-1 font-semibold text-foreground">Titolo chiaro</div>
                                        <p>Usa un nome leggibile che identifichi macchina, frequenza e tipo di intervento.</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="mb-1 font-semibold text-foreground">Istruzioni operative</div>
                                        <p>Scrivi cosa fare, con quali strumenti e quali soglie controllare, così il work order sarà già pronto.</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="mb-1 font-semibold text-foreground">Sicurezza</div>
                                        <p>Indica sempre blocchi energia, DPI e verifiche preliminari prima dell'intervento.</p>
                                    </div>
                                    {isManufacturer && (
                                        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-700 dark:text-blue-300">
                                            <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" /> Contesto costruttore</div>
                                            <p>Il costruttore definisce il piano per la macchina venduta; il cliente finale eseguirà gli interventi e compilerà le checklist operative.</p>
                                        </div>
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
