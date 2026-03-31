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
};

type UserRow = {
    id: string;
    displayName: string;
    role: string | null;
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

export default function MaintenancePlanNewPage() {
    const router = useRouter();
    const { organization, membership, user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { plantLabel, machineContextLabel, canManageMaintenance, isManufacturer } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [users, setUsers] = useState < UserRow[] > ([]);
    const [form, setForm] = useState < FormState > (emptyForm);

    const plantMap = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);

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
                const [{ data: machineRows, error: machineError }, { data: plantRows, error: plantError }, { data: membershipRows, error: membershipError }] = await Promise.all([
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("plants")
                        .select("id, name")
                        .eq("organization_id", organization.id)
                        .order("name", { ascending: true }),
                    supabase
                        .from("organization_memberships")
                        .select("user_id, role")
                        .eq("organization_id", organization.id)
                        .eq("is_active", true),
                ]);

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
                    const displayName =
                        profile?.display_name?.trim() ||
                        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
                        profile?.email ||
                        row.user_id;

                    return {
                        id: row.user_id,
                        displayName,
                        role: row.role ?? null,
                    };
                });

                if (!active) return;

                const machineList = (machineRows ?? []) as MachineRow[];
                setMachines(machineList);
                setPlants((plantRows ?? []) as PlantRow[]);
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
    }, [authLoading, organization?.id, toast]);

    const selectedMachine = useMemo(() => machines.find((machine) => machine.id === form.machine_id) ?? null, [form.machine_id, machines]);
    const selectedPlant = selectedMachine?.plant_id ? plantMap.get(selectedMachine.plant_id) ?? null : null;

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
                required_skills: form.required_skills
                    ? form.required_skills.split(",").map((skill) => skill.trim()).filter(Boolean)
                    : [],
                instructions: form.instructions.trim() || null,
                safety_notes: form.safety_notes.trim() || null,
                default_assignee_id: form.default_assignee_id || null,
                priority: form.priority,
                next_due_date: form.next_due_date || null,
                created_by: user.id,
                is_active: true,
            };

            const { data, error } = await supabase
                .from("maintenance_plans")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({
                title: "Piano creato",
                description: "Il piano di manutenzione è stato salvato correttamente.",
            });

            router.push(`/maintenance/${data.id}`);
        } catch (error: any) {
            console.error("maintenance new save error:", error);
            toast({
                title: "Errore salvataggio piano",
                description: error?.message || "Impossibile salvare il piano di manutenzione.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const pageTitle = isManufacturer ? "Nuovo piano per macchina venduta" : "Nuovo piano di manutenzione";

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? undefined}>
                <SEO title={`${pageTitle} - MACHINA`} />
                <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Link href="/maintenance" className="inline-flex items-center gap-1 hover:text-foreground">
                                    <ArrowLeft className="h-4 w-4" />
                                    Torna ai piani
                                </Link>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl border border-border bg-card p-3">
                                    <Wrench className="h-6 w-6 text-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pageTitle}</h1>
                                    <p className="text-sm text-muted-foreground">
                                        {isManufacturer
                                            ? "Definisci frequenza, priorità e istruzioni per una macchina presso cliente."
                                            : "Configura frequenza, priorità e istruzioni operative del piano."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Dati piano</CardTitle>
                                <CardDescription>Usa solo campi reali dello schema maintenance_plans.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {loading ? (
                                    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Caricamento dati...
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="machine">{machineContextLabel}</Label>
                                            <Select value={form.machine_id} onValueChange={(value) => handleChange("machine_id", value)}>
                                                <SelectTrigger id="machine" className="min-h-11">
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

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="title">Titolo</Label>
                                                <Input
                                                    id="title"
                                                    value={form.title}
                                                    onChange={(e) => handleChange("title", e.target.value)}
                                                    placeholder="Es. Manutenzione preventiva mensile pressa"
                                                    className="min-h-11"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="description">Descrizione</Label>
                                                <Textarea
                                                    id="description"
                                                    value={form.description}
                                                    onChange={(e) => handleChange("description", e.target.value)}
                                                    placeholder="Descrivi attività, ambito e obiettivo del piano."
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Tipo frequenza</Label>
                                                <Select value={form.frequency_type} onValueChange={(value: FrequencyType) => handleChange("frequency_type", value)}>
                                                    <SelectTrigger className="min-h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
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
                                                <Input
                                                    id="frequency_value"
                                                    type="number"
                                                    min={1}
                                                    value={form.frequency_value}
                                                    onChange={(e) => handleChange("frequency_value", e.target.value)}
                                                    className="min-h-11"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Priorità</Label>
                                                <Select value={form.priority} onValueChange={(value: PlanPriority) => handleChange("priority", value)}>
                                                    <SelectTrigger className="min-h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
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
                                                <Input
                                                    id="duration"
                                                    type="number"
                                                    min={0}
                                                    value={form.estimated_duration_minutes}
                                                    onChange={(e) => handleChange("estimated_duration_minutes", e.target.value)}
                                                    className="min-h-11"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="assignee">Assegnatario predefinito</Label>
                                                <Select
                                                    value={form.default_assignee_id || "__none"}
                                                    onValueChange={(value) => handleChange("default_assignee_id", value === "__none" ? "" : value)}
                                                >
                                                    <SelectTrigger id="assignee" className="min-h-11">
                                                        <SelectValue placeholder="Nessun assegnatario" />
                                                    </SelectTrigger>
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
                                                <Label htmlFor="due">Prima scadenza</Label>
                                                <Input
                                                    id="due"
                                                    type="date"
                                                    value={form.next_due_date}
                                                    onChange={(e) => handleChange("next_due_date", e.target.value)}
                                                    className="min-h-11"
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="skills">Competenze richieste</Label>
                                                <Input
                                                    id="skills"
                                                    value={form.required_skills}
                                                    onChange={(e) => handleChange("required_skills", e.target.value)}
                                                    placeholder="Es. meccanica, idraulica, pneumatica"
                                                    className="min-h-11"
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="instructions">Istruzioni operative</Label>
                                                <Textarea
                                                    id="instructions"
                                                    value={form.instructions}
                                                    onChange={(e) => handleChange("instructions", e.target.value)}
                                                    placeholder="Passaggi, strumenti e controlli da eseguire."
                                                    rows={5}
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="safety_notes">Note di sicurezza</Label>
                                                <Textarea
                                                    id="safety_notes"
                                                    value={form.safety_notes}
                                                    onChange={(e) => handleChange("safety_notes", e.target.value)}
                                                    placeholder="Blocchi energia, DPI, accessi, procedure di lockout/tagout..."
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Contesto macchina</CardTitle>
                                    <CardDescription>Riepilogo del contesto selezionato.</CardDescription>
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
                                    <div className="rounded-2xl border border-border bg-muted/30 p-3 text-muted-foreground">
                                        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                                            <CalendarDays className="h-4 w-4" />
                                            Logica di utilizzo
                                        </div>
                                        <p>
                                            Questo piano definisce la regola. Gli ordini di lavoro verranno generati dal piano e le checklist si compileranno dentro il work order.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <ShieldAlert className="h-4 w-4" />
                                        Controllo permessi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p>Ruolo attivo: <span className="font-medium text-foreground">{membership?.role ?? "—"}</span></p>
                                    <p>Solo admin e supervisor possono creare o modificare piani.</p>
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button type="submit" className="min-h-11 flex-1" disabled={loading || saving || !canManageMaintenance}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salva piano
                                </Button>
                                <Button type="button" variant="outline" className="min-h-11 flex-1" asChild>
                                    <Link href="/maintenance">Annulla</Link>
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

