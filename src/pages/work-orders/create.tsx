import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
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
import { ArrowLeft, Save } from "lucide-react";
import { PageLoader } from "@/components/feedback/PageLoader";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled";
type WorkPriority = "low" | "medium" | "high" | "critical";

type MachineRow = {
    id: string;
    name: string;
    internal_code: string | null;
    plant_id: string | null;
};

type ProfileRow = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
};

function formatName(profile: ProfileRow) {
    if (profile.display_name?.trim()) return profile.display_name.trim();
    const full = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    return full || profile.id;
}

export default function WorkOrderCreatePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [assignees, setAssignees] = useState < ProfileRow[] > ([]);

    const workTypeFromQuery = useMemo < WorkType > (() => {
        const raw = router.query.work_type;
        if (typeof raw !== "string") return "preventive";
        if (["preventive", "corrective", "predictive", "inspection", "emergency"].includes(raw)) {
            return raw as WorkType;
        }
        return "preventive";
    }, [router.query.work_type]);

    const preselectedMachineId = useMemo(() => {
        const raw = router.query.machine_id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.machine_id]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [workType, setWorkType] = useState < WorkType > (workTypeFromQuery);
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");
    const [dueDate, setDueDate] = useState("");
    const [machineId, setMachineId] = useState < string > (preselectedMachineId ?? "none");
    const [assignedTo, setAssignedTo] = useState < string > ("none");

    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        setWorkType(workTypeFromQuery);
    }, [workTypeFromQuery]);

    useEffect(() => {
        if (preselectedMachineId) {
            setMachineId(preselectedMachineId);
        }
    }, [preselectedMachineId]);

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

                const [{ data: machineRows, error: machineErr }, { data: memberships, error: memErr }] = await Promise.all([
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id")
                        .eq("organization_id", activeOrgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true }),
                    supabase
                        .from("organization_memberships")
                        .select("user_id")
                        .eq("organization_id", activeOrgId)
                        .eq("is_active", true),
                ]);

                if (machineErr) throw machineErr;
                if (memErr) throw memErr;

                setMachines((machineRows ?? []) as MachineRow[]);

                const userIds = Array.from(new Set((memberships ?? []).map((m: any) => m.user_id).filter(Boolean)));
                if (userIds.length > 0) {
                    const { data: profRows, error: profErr } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name")
                        .in("id", userIds)
                        .order("display_name", { ascending: true });

                    if (profErr) throw profErr;
                    setAssignees((profRows ?? []) as ProfileRow[]);
                } else {
                    setAssignees([]);
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento pagina",
                    variant: "destructive",
                });
                router.push("/work-orders");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, toast]);

    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin e Supervisor possono creare work order.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({ title: "Errore", description: "Inserisci il titolo.", variant: "destructive" });
            return;
        }

        if (!orgId) {
            toast({ title: "Errore", description: "Contesto organizzativo non valido.", variant: "destructive" });
            return;
        }

        if (machineId === "none") {
            toast({
                title: "Errore",
                description: "Seleziona una macchina. Il work order appartiene sempre alla macchina owner del contesto attivo.",
                variant: "destructive",
            });
            return;
        }

        const selectedMachine = machines.find((m) => m.id === machineId);
        if (!selectedMachine?.plant_id) {
            toast({
                title: "Errore",
                description: "La macchina selezionata non ha uno stabilimento associato (plant_id).",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const payload: any = {
                organization_id: orgId,
                machine_id: selectedMachine.id,
                plant_id: selectedMachine.plant_id,
                title: title.trim(),
                description: description.trim() || null,
                work_type: workType,
                status,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                assigned_to: assignedTo === "none" ? null : assignedTo,
                created_by: user?.id ?? null,
            };

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({ title: "OK", description: "Work order creato correttamente." });
            router.push(`/work-orders/${data.id}`);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore creazione work order",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={role as any}>
                <PageLoader title="Crea Work Order" description="Stiamo preparando il contesto operativo, le macchine e gli assegnatari disponibili." />
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Crea Work Order</CardTitle>
                        <CardDescription>
                            Il work order è sempre operativo e appartiene all&apos;organizzazione owner della macchina nel contesto attivo.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Titolo *</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Sostituzione cuscinetto lato motore" />
                            </div>

                            <div className="space-y-2">
                                <Label>Macchina *</Label>
                                <Select value={machineId} onValueChange={setMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona macchina..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleziona macchina</SelectItem>
                                        {machines.map((machine) => (
                                            <SelectItem key={machine.id} value={machine.id}>
                                                {machine.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Assegna a</Label>
                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Non assegnato" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Non assegnato</SelectItem>
                                        {assignees.map((profile) => (
                                            <SelectItem key={profile.id} value={profile.id}>
                                                {formatName(profile)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo lavoro</Label>
                                <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="preventive">Preventive</SelectItem>
                                        <SelectItem value="corrective">Corrective</SelectItem>
                                        <SelectItem value="predictive">Predictive</SelectItem>
                                        <SelectItem value="inspection">Inspection</SelectItem>
                                        <SelectItem value="emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Stato</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as WorkStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
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
                                <Select value={priority} onValueChange={(v) => setPriority(v as WorkPriority)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Bassa</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Critica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Scadenza</Label>
                                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Descrizione intervento, sintomi, note operative..." />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : "Salva work order"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
