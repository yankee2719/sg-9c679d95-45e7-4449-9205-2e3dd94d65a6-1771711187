import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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

export default function MaintenancePlanCreatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const { loading: authLoading, membership, organization } = useAuth();

    const tr = (key: string, fallback: string) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

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

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (authLoading) return;
            try {
                const context = await getWorkOrderCreateContext();
                if (!active) return;
                setMachines(context.machines ?? []);
                setAssignees(context.assignees ?? []);
            } catch (error: any) {
                console.error(error);
                toast({ title: tr("common.error", "Errore"), description: error?.message || "Errore caricamento contesto manutenzione", variant: "destructive" });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, toast]);

    const canSave = useMemo(() => canEdit && !!organization?.id, [canEdit, organization?.id]);

    const handleSave = async () => {
        if (!canSave) return;
        if (!title.trim()) {
            toast({ title: tr("common.error", "Errore"), description: "Inserisci il titolo del piano.", variant: "destructive" });
            return;
        }
        if (machineId === "none") {
            toast({ title: tr("common.error", "Errore"), description: "Seleziona la macchina collegata al piano.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                organization_id: organization!.id,
                machine_id: machineId,
                title: title.trim(),
                description: description.trim() || null,
                plan_type: "time_based",
                frequency_type: "time_based",
                frequency_value: Number(frequencyValue || 0),
                frequency_days: Number(frequencyValue || 0),
                estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : null,
                instructions: instructions.trim() || null,
                safety_notes: safetyNotes.trim() || null,
                default_assignee_id: defaultAssigneeId === "none" ? null : defaultAssigneeId,
                priority,
                requires_shutdown: false,
                is_active: true,
                spare_parts: [],
                compliance_tags: [],
                required_skills: [],
                required_tools: [],
                next_due_date: nextDueDate ? new Date(nextDueDate).toISOString() : null,
            };

            const { data, error } = await supabase.from("maintenance_plans").insert(payload).select("id").single();
            if (error) throw error;

            toast({ title: "OK", description: "Piano di manutenzione creato" });
            void router.push(`/maintenance/${data.id}`);
        } catch (error: any) {
            console.error(error);
            toast({ title: tr("common.error", "Errore"), description: error?.message || "Errore creazione piano", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`Nuovo piano di manutenzione - MACHINA`} />
                <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
                    <Button variant="ghost" onClick={() => router.push("/maintenance")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tr("common.back", "Indietro")}
                    </Button>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Nuovo piano di manutenzione</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Caricamento contesto...</div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Titolo</Label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Manutenzione mensile pressa 200T" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Macchina</Label>
                                        <Select value={machineId} onValueChange={setMachineId}>
                                            <SelectTrigger><SelectValue placeholder="Seleziona macchina" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Seleziona macchina</SelectItem>
                                                {machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}{machine.internal_code ? ` · ${machine.internal_code}` : ""}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Priorità</Label>
                                        <Select value={priority} onValueChange={setPriority}>
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
                                        <Label>Frequenza (giorni)</Label>
                                        <Input type="number" min="1" value={frequencyValue} onChange={(e) => setFrequencyValue(e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Prossima scadenza</Label>
                                        <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Durata stimata (minuti)</Label>
                                        <Input type="number" min="0" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Assegnatario predefinito</Label>
                                        <Select value={defaultAssigneeId} onValueChange={setDefaultAssigneeId}>
                                            <SelectTrigger><SelectValue placeholder="Non assegnato" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Non assegnato</SelectItem>
                                                {assignees.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.display_name || profile.email || "Utente"}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Descrizione</Label>
                                        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Istruzioni operative</Label>
                                        <Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Note di sicurezza</Label>
                                        <Textarea rows={4} value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={!canSave || saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salva piano
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
