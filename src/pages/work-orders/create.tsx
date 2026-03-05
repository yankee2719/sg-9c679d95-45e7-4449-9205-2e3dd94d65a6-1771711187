// src/pages/work-orders/create.tsx
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
    const canCreate = role === "admin" || role === "supervisor";

    const workTypeFromQuery = useMemo < WorkType > (() => {
        const t = router.query.work_type;
        if (typeof t !== "string") return "preventive";
        const v = t.trim();
        if (
            v === "preventive" ||
            v === "corrective" ||
            v === "predictive" ||
            v === "inspection" ||
            v === "emergency"
        )
            return v;
        return "preventive";
    }, [router.query.work_type]);

    const [orgId, setOrgId] = useState < string | null > (null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [workType, setWorkType] = useState < WorkType > (workTypeFromQuery);
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");
    const [dueDate, setDueDate] = useState < string > ("");

    const [machines, setMachines] = useState < Machine[] > ([]);
    const [machineId, setMachineId] = useState < string > ("none"); // REQUIRED

    useEffect(() => setWorkType(workTypeFromQuery), [workTypeFromQuery]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const ctx: any = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setRole(ctx?.role ?? "technician");

                const resolvedOrgId = pickOrgId(ctx);
                if (!resolvedOrgId) throw new Error("Organization non trovata nel contesto utente.");
                setOrgId(resolvedOrgId);

                // IMPORTANT:
                // Machines list should already be filtered by your RLS (manufacturer sees its scope)
                const { data, error } = await supabase
                    .from("machines")
                    .select("id,name,internal_code")
                    .eq("is_archived", false)
                    .order("name", { ascending: true })
                    .limit(1000);

                if (error) throw error;
                setMachines((data ?? []) as any);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento",
                    variant: "destructive",
                });
                router.push("/work-orders");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router, toast]);

    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono creare work orders.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci un titolo",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({
                title: "Errore",
                description: "orgId mancante nel contesto utente.",
                variant: "destructive",
            });
            return;
        }

        // We enforce machine REQUIRED to keep the model consistent.
        // plant_id is allowed to be NULL (manufacturer case) only if DB column is nullable.
        if (machineId === "none") {
            toast({
                title: "Errore",
                description: "Seleziona una macchina.",
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
                description: description.trim() || null,
                work_type: workType,
                status,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                machine_id: machineId,
                // KEY: manufacturer machines may not have plant_id. DB must allow NULL.
                // Optional trigger can fill it if machine has plant_id.
                plant_id: null,
                created_by: createdBy, // remove if your DB doesn't have this column
            };

            // Debug (leave it for now, remove later)
            // console.log("WORK_ORDER INSERT PAYLOAD", payload);

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({ title: "OK", description: "Work order creato" });
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

    if (loading) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground">Crea Work Order</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Macchina obbligatoria. (Plant viene gestito lato DB quando disponibile.)
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Titolo *</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo (work_type)</Label>
                                <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona tipo..." />
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
                                <Label>Priorità</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as WorkPriority)}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona priorità..." />
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
                                <Label>Stato</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as WorkStatus)}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona stato..." />
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
                                <Label>Scadenza (opzionale)</Label>
                                <Input
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Macchina *</Label>
                                <Select value={machineId} onValueChange={setMachineId}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona macchina..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleziona macchina...</SelectItem>
                                        {machines.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name}
                                                {m.internal_code ? ` — ${m.internal_code}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : "Salva"}
                            </Button>
                        </div>

                        {!canCreate && (
                            <p className="text-xs text-muted-foreground">
                                Sei loggato come <span className="font-mono">{role}</span>: non puoi creare work orders.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}