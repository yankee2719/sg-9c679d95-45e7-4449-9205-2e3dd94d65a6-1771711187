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
import { ArrowLeft, Loader2, Save, Wrench } from "lucide-react";

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
    type: string | null;
};

type UserRow = {
    id: string;
    displayName: string;
    role: string | null;
};

type PlanRow = {
    id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    frequency_type: FrequencyType;
    frequency_value: number;
    estimated_duration_minutes: number | null;
    required_skills: string[] | null;
    instructions: string | null;
    safety_notes: string | null;
    default_assignee_id: string | null;
    priority: PlanPriority | null;
    next_due_date: string | null;
    is_active: boolean | null;
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

function machineLabel(machine: MachineRow, plantMap: Map<string, PlantRow>, machineContextLabel: string) {
    const plantName = machine.plant_id ? plantMap.get(machine.plant_id)?.name ?? "Senza contesto" : "Senza contesto";
    const machineName = machine.name?.trim() || machine.internal_code?.trim() || "Macchina senza nome";
    const area = machine.area?.trim();
    return `${machineContextLabel}: ${plantName} → ${machineName}${area ? ` · ${area}` : ""}`;
}

export default function MaintenancePlanEditPage() {
    const router = useRouter();
    const { id } = router.query;
    const { organization, membership, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { machineContextLabel, plantLabel, canManageMaintenance, isManufacturer } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [users, setUsers] = useState < UserRow[] > ([]);
    const [form, setForm] = useState < FormState > (emptyForm);
    const [planActive, setPlanActive] = useState(true);

    const plantMap = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || typeof id !== "string") {
            if (!authLoading) setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const [{ data: planRow, error: planError }, { data: machineRows, error: machineError }, { data: plantRows, error: plantError }, { data: membershipRows, error: membershipError }] = await Promise.all([
                    supabase
                        .from("maintenance_plans")
                        .select("id, machine_id, title, description, frequency_type, frequency_value, estimated_duration_minutes, required_skills, instructions, safety_notes, default_assignee_id, priority, next_due_date, is_active")
                        .eq("organization_id", organization.id)
                        .eq("id", id)
                        .single(),
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("plants")
                        .select("id, name, type")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("organization_memberships")
                        .select("user_id, role")
                        .eq("organization_id", organization.id)
                        .eq("is_active", true),
                ]);

                if (planError) throw planError;
                if (machineError) throw machineError;
                if (plantError) throw plantError;
                if (membershipError) throw membershipError;

                const userIds = Array.from(new Set((membershipRows ?? []).map((row: any) => row.user_id).filter(Boolean)));
                let profileMap = new Map < string, any> ();
                if (userIds.length > 0) {
                    const { data: profileRows, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);
                    if (profileError) throw profileError;
                    profileMap = new Map((profileRows ?? []).map((profile: any) => [profile.id, profile]));
                }

                const normalizedUsers: UserRow[] = (membershipRows ?? []).map((row: any) => {
                    const profile = profileMap.get(row.user_id);
                    return {
                        id: row.user_id,
                        displayName:
                            profile?.display_name?.trim() ||
                            `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
                            profile?.email ||
                            row.user_id,
                        role: row.role ?? null,
                    };
                });

                const detail = planRow as PlanRow;

                if (!active) return;
                setMachines((machineRows ?? []) as MachineRow[]);
                setPlants((plantRows ?? []) as PlantRow[]);
                setUsers(normalizedUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, "it")));
                setPlanActive(detail.is_active ?? true);
                setForm({
                    machine_id: detail.machine_id || "",
                    title: detail.title || "",
                    description: detail.description || "",
                    frequency_type: detail.frequency_type || "days",
                    frequency_value: String(detail.frequency_value ?? 30),
                    priority: (detail.priority as PlanPriority) || "medium",
                    estimated_duration_minutes: detail.estimated_duration_minutes ? String(detail.estimated_duration_minutes) : "",
                    instructions: detail.instructions || "",
                    safety_notes: detail.safety_notes || "",
                    required_skills: (detail.required_skills ?? []).join(", "),
                    default_assignee_id: detail.default_assignee_id || "",
                    next_due_date: detail.next_due_date || "",
                });
            } catch (error: any) {
                console.error("maintenance edit load error:", error);
                if (active) {
                    toast({
                        title: "Errore caricamento piano",
                        description: error?.message || "Impossibile caricare il piano da modificare.",
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
    }, [authLoading, id, organization?.id, toast]);

    const selectedMachine = useMemo(() => machines.find((machine) => machine.id === form.machine_id) ?? null, [form.machine_id, machines]);
    const selectedPlant = selectedMachine?.plant_id ? plantMap.get(selectedMachine.plant_id) ?? null : null;

    const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!organization?.id || typeof id !== "string") return;
        if (!canManageMaintenance) {
            toast({ title: "Operazione non consentita", description: "Non hai i permessi per modificare piani di manutenzione.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                machine_id: form.machine_id || null,
                title: form.title.trim(),
                description: form.description.trim() || null,
                frequency_type: form.frequency_type,
                frequency_value: Number(form.frequency_value),
                estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
                required_skills: form.required_skills
                    ? form.required_skills.split(",").map((skill) => skill.trim()).filter(Boolean)
                    : [],
                instructions: form.instructions.trim() || null,
                safety_notes: form.safety_notes.trim() || null,
                default_assignee_id: form.default_assignee_id || null,
                priority: form.priority,
                next_due_date: form.next_due_date || null,
                is_active: planActive,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("maintenance_plans")
                .update(payload)
                .eq("organization_id", organization.id)
                .eq("id", id);

            if (error) throw error;

            toast({
                title: "Piano aggiornato",
                description: "Le modifiche al piano di manutenzione sono state salvate.",
            });
            router.push(`/maintenance/${id}`);
        } catch (error: any) {
            console.error("maintenance edit save error:", error);
            toast({
                title: "Errore aggiornamento piano",
                description: error?.message || "Impossibile aggiornare il piano di manutenzione.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const pageTitle = isManufacturer ? "Modifica piano per macchina venduta" : "Modifica piano di manutenzione";

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? undefined}>
                <SEO title={`${pageTitle} - MACHINA`} />
                <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
                    <div className="mb-6 space-y-2">
                        <Link href={typeof id === "string" ? `/maintenance/${id}` : "/maintenance"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Torna al dettaglio piano
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-border bg-card p-3">
                                <Wrench className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pageTitle}</h1>
                                <p className="text-sm text-muted-foreground">Aggiorna frequenza, priorità, note e contesto della macchina collegata al piano.</p>
                            </div>
                        </div>
                    </div>

                    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Modifica dati piano</CardTitle>
                                <CardDescription>Intervieni solo sui campi reali della tabella maintenance_plans.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {loading ? (
                                    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Caricamento dati...
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>{machineContextLabel}</Label>
                                            <Select value={form.machine_id} onValueChange={(value) => handleChange("machine_id", value)}>
                                                <SelectTrigger className="min-h-11">
                                                    <SelectValue placeholder="Seleziona una macchina" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {machines.map((machine) => (
                                                        <SelectItem key={machine.id} value={machine.id}>
                                                            {machineLabel(machine, plantMap, machineContextLabel)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="title">Titolo</Label>
                                            <Input id="title" value={form.title} onChange={(e) => handleChange("title", e.target.value)} className="min-h-11" required />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="description">Descrizione</Label>
                                            <Textarea id="description" value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tipo frequenza</Label>
                                            <Select value={form.frequency_type} onValueChange={(value: FrequencyType) => handleChange("frequency_type", value)}>
                                                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="hours">Ore</SelectItem>
                                                    <SelectItem value="days">Giorni</SelectItem>
                                                    <SelectItem value="weeks">Settimane</SelectItem>
                                                    <SelectItem value="months">Mesi</SelectItem>
                                                    <SelectItem value="cycles">Cicli</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="frequency_value">Valore frequenza</Label>
                                            <Input id="frequency_value" type="number" min={1} value={form.frequency_value} onChange={(e) => handleChange("frequency_value", e.target.value)} className="min-h-11" required />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Priorità</Label>
                                            <Select value={form.priority} onValueChange={(value: PlanPriority) => handleChange("priority", value)}>
                                                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Bassa</SelectItem>
                                                    <SelectItem value="medium">Media</SelectItem>
                                                    <SelectItem value="high">Alta</SelectItem>
                                                    <SelectItem value="critical">Critica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Durata stimata (min)</Label>
                                            <Input id="duration" type="number" min={0} value={form.estimated_duration_minutes} onChange={(e) => handleChange("estimated_duration_minutes", e.target.value)} className="min-h-11" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="assignee">Assegnatario predefinito</Label>
                                            <Select value={form.default_assignee_id || "__none"} onValueChange={(value) => handleChange("default_assignee_id", value === "__none" ? "" : value)}>
                                                <SelectTrigger id="assignee" className="min-h-11"><SelectValue placeholder="Nessun assegnatario" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none">Nessun assegnatario</SelectItem>
                                                    {users.map((orgUser) => (
                                                        <SelectItem key={orgUser.id} value={orgUser.id}>
                                                            {orgUser.displayName}{orgUser.role ? ` · ${orgUser.role}` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="due">Prossima scadenza</Label>
                                            <Input id="due" type="date" value={form.next_due_date} onChange={(e) => handleChange("next_due_date", e.target.value)} className="min-h-11" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="skills">Competenze richieste</Label>
                                            <Input id="skills" value={form.required_skills} onChange={(e) => handleChange("required_skills", e.target.value)} placeholder="Es. meccanica, pneumatica, elettrica" className="min-h-11" />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="instructions">Istruzioni operative</Label>
                                            <Textarea id="instructions" value={form.instructions} onChange={(e) => handleChange("instructions", e.target.value)} rows={5} />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="safety_notes">Note di sicurezza</Label>
                                            <Textarea id="safety_notes" value={form.safety_notes} onChange={(e) => handleChange("safety_notes", e.target.value)} rows={4} />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Riepilogo contesto</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">{plantLabel}</p>
                                        <p className="font-medium text-foreground">{selectedPlant?.name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Macchina</p>
                                        <p className="font-medium text-foreground">{selectedMachine?.name || selectedMachine?.internal_code || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Area / linea</p>
                                        <p className="font-medium text-foreground">{selectedMachine?.area || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Stato piano</p>
                                        <p className="font-medium text-foreground">{planActive ? "Attivo" : "Inattivo"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <Button type="submit" className="min-h-11 flex-1" disabled={loading || saving || !canManageMaintenance}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salva modifiche
                                </Button>
                                <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => setPlanActive((prev) => !prev)} disabled={loading || saving}>
                                    {planActive ? "Segna come inattivo" : "Segna come attivo"}
                                </Button>
                                <Button type="button" variant="outline" className="min-h-11 flex-1" asChild>
                                    <Link href={typeof id === "string" ? `/maintenance/${id}` : "/maintenance"}>Annulla</Link>
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

