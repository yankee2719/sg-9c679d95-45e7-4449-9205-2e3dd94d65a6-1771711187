import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { getWorkOrderCreateContext, type WorkOrderCreateContextAssignee, type WorkOrderCreateContextMachine } from "@/lib/workOrderCreateApi";

interface MaintenancePlanRow {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    instructions: string | null;
    safety_notes: string | null;
    frequency_value: number | null;
    estimated_duration_minutes: number | null;
    default_assignee_id: string | null;
    priority: string | null;
    next_due_date: string | null;
}

export default function MaintenancePlanEditPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership, organization } = useAuth();
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor", "technician"].includes(userRole);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState < WorkOrderCreateContextMachine[] > ([]);
    const [assignees, setAssignees] = useState < WorkOrderCreateContextAssignee[] > ([]);

    const [title, setTitle] = useState("");
    const [machineId, setMachineId] = useState("none");
    const [priority, setPriority] = useState("medium");
    const [frequencyValue, setFrequencyValue] = useState("30");
    const [nextDueDate, setNextDueDate] = useState("");
    const [estimatedDuration, setEstimatedDuration] = useState("");
    const [defaultAssigneeId, setDefaultAssigneeId] = useState("none");
    const [description, setDescription] = useState("");
    const [instructions, setInstructions] = useState("");
    const [safetyNotes, setSafetyNotes] = useState("");

    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (authLoading || !organization?.id || !resolvedId) return;
            try {
                const [planRes, context] = await Promise.all([
                    supabase.from("maintenance_plans").select("id, organization_id, machine_id, title, description, instructions, safety_notes, frequency_value, estimated_duration_minutes, default_assignee_id, priority, next_due_date").eq("id", resolvedId).eq("organization_id", organization.id).maybeSingle(),
                    getWorkOrderCreateContext(),
                ]);
                if (planRes.error) throw planRes.error;
                const plan = planRes.data as MaintenancePlanRow | null;
                if (!active || !plan) return;
                setMachines(context.machines ?? []);
                setAssignees(context.assignees ?? []);
                setTitle(plan.title || "");
                setMachineId(plan.machine_id || "none");
                setPriority(plan.priority || "medium");
                setFrequencyValue(String(plan.frequency_value || 30));
                setNextDueDate(plan.next_due_date ? new Date(plan.next_due_date).toISOString().slice(0, 10) : "");
                setEstimatedDuration(plan.estimated_duration_minutes ? String(plan.estimated_duration_minutes) : "");
                setDefaultAssigneeId(plan.default_assignee_id || "none");
                setDescription(plan.description || "");
                setInstructions(plan.instructions || "");
                setSafetyNotes(plan.safety_notes || "");
            } catch (error: any) {
                console.error(error);
                toast({ title: "Errore", description: error?.message || "Errore caricamento piano", variant: "destructive" });
                void router.push("/maintenance");
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, organization?.id, resolvedId, router, toast]);

    const handleSave = async () => {
        if (!canEdit || !resolvedId) return;
        if (!title.trim()) {
            toast({ title: "Errore", description: "Inserisci il titolo del piano.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const updates = {
                machine_id: machineId === "none" ? null : machineId,
                title: title.trim(),
                description: description.trim() || null,
                instructions: instructions.trim() || null,
                safety_notes: safetyNotes.trim() || null,
                frequency_type: "time_based",
                frequency_value: Number(frequencyValue || 0),
                frequency_days: Number(frequencyValue || 0),
                estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : null,
                default_assignee_id: defaultAssigneeId === "none" ? null : defaultAssigneeId,
                priority,
                next_due_date: nextDueDate ? new Date(nextDueDate).toISOString() : null,
            };
            const { error } = await supabase.from("maintenance_plans").update(updates).eq("id", resolvedId).eq("organization_id", organization?.id ?? "");
            if (error) throw error;
            toast({ title: "OK", description: "Piano di manutenzione aggiornato" });
            void router.push(`/maintenance/${resolvedId}`);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Errore", description: error?.message || "Errore aggiornamento piano", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`Modifica piano di manutenzione - MACHINA`} />
                <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
                    <Button variant="ghost" onClick={() => router.push(resolvedId ? `/maintenance/${resolvedId}` : "/maintenance")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Indietro
                    </Button>

                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>Modifica piano di manutenzione</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Caricamento piano...</div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2"><Label>Titolo</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Macchina</Label><Select value={machineId} onValueChange={setMachineId}><SelectTrigger><SelectValue placeholder="Seleziona macchina" /></SelectTrigger><SelectContent><SelectItem value="none">Seleziona macchina</SelectItem>{machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}{machine.internal_code ? ` · ${machine.internal_code}` : ""}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-2"><Label>Priorità</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Bassa</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Critica</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-2"><Label>Frequenza (giorni)</Label><Input type="number" min="1" value={frequencyValue} onChange={(e) => setFrequencyValue(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Prossima scadenza</Label><Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Durata stimata (minuti)</Label><Input type="number" min="0" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Assegnatario predefinito</Label><Select value={defaultAssigneeId} onValueChange={setDefaultAssigneeId}><SelectTrigger><SelectValue placeholder="Non assegnato" /></SelectTrigger><SelectContent><SelectItem value="none">Non assegnato</SelectItem>{assignees.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.display_name || profile.email || "Utente"}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-2 md:col-span-2"><Label>Descrizione</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                                    <div className="space-y-2 md:col-span-2"><Label>Istruzioni operative</Label><Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
                                    <div className="space-y-2 md:col-span-2"><Label>Note di sicurezza</Label><Textarea rows={4} value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} /></div>
                                </div>
                            )}
                            <div className="flex justify-end"><Button onClick={handleSave} disabled={!canEdit || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salva modifiche</Button></div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
