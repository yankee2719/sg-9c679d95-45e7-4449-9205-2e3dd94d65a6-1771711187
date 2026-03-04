import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Machine = {
    id: string;
    name: string;
    internal_code?: string | null;
};

type WorkType =
    | "preventive"
    | "corrective"
    | "predictive"
    | "inspection"
    | "emergency";

type WorkStatus =
    | "draft"
    | "scheduled"
    | "in_progress"
    | "pending_review"
    | "completed"
    | "cancelled";

type WorkPriority = "low" | "medium" | "high" | "critical";

function pickOrgId(ctx: any): string | null {
    return (
        ctx?.orgId ||
        ctx?.organizationId ||
        ctx?.organization_id ||
        ctx?.tenant_id ||
        null
    );
}

export default function WorkOrderCreatePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [role, setRole] = useState < string > ("technician");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [workType, setWorkType] = useState < WorkType > ("preventive");
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");

    const [dueDate, setDueDate] = useState("");

    const [machines, setMachines] = useState < Machine[] > ([]);
    const [machineId, setMachineId] = useState < string > ("none");

    const [orgId, setOrgId] = useState < string | null > (null);

    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const init = async () => {
            try {
                const ctx: any = await getUserContext();

                setRole(ctx?.role ?? "technician");

                const resolvedOrgId = pickOrgId(ctx);
                setOrgId(resolvedOrgId);

                const { data } = await supabase
                    .from("machines")
                    .select("id,name,internal_code")
                    .eq("is_archived", false)
                    .order("name");

                setMachines((data ?? []) as any);
            } catch (err) {
                console.error(err);
            }

            setLoading(false);
        };

        init();
    }, []);

    const handleSave = async () => {
        if (!title.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci titolo",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({
                title: "Errore",
                description: "Organization non trovata",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const { data: userRes } = await supabase.auth.getUser();

            const createdBy = userRes?.user?.id ?? null;

            const payload: any = {
                organization_id: orgId,
                title: title.trim(),
                description: description || null,
                work_type: workType,
                status,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                machine_id: machineId === "none" ? null : machineId,
                created_by: createdBy,
            };

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({
                title: "Creato",
                description: "Work order creato correttamente",
            });

            router.push(`/work-orders/${data.id}`);
        } catch (err: any) {
            console.error(err);

            toast({
                title: "Errore",
                description: err?.message ?? "Errore creazione",
                variant: "destructive",
            });
        }

        setSaving(false);
    };

    if (loading) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuovo Work Order</CardTitle>
                        <CardDescription>Crea un ordine di lavoro</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Titolo</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo lavoro</Label>

                            <Select
                                value={workType}
                                onValueChange={(v) => setWorkType(v as WorkType)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

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

                            <Select
                                value={status}
                                onValueChange={(v) => setStatus(v as WorkStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="in_progress">In progress</SelectItem>
                                    <SelectItem value="pending_review">Pending review</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priorità</Label>

                            <Select
                                value={priority}
                                onValueChange={(v) => setPriority(v as WorkPriority)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Macchina (opzionale)</Label>

                            <Select value={machineId} onValueChange={setMachineId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Nessuna" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="none">Nessuna</SelectItem>

                                    {machines.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Scadenza</Label>

                            <Input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrizione</Label>

                            <Textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" />
                                Salva
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}