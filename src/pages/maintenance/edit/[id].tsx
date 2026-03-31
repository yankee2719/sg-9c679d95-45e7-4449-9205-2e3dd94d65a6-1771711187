import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { supabase } from "@/integrations/supabase/client";

function isoDate(value?: string | null) {
    if (!value) return "";
    return value.slice(0, 10);
}

type MachineOption = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; plants?: { name: string | null } | null };
type UserOption = { id: string; first_name: string | null; last_name: string | null; display_name: string | null; email: string | null };

export default function EditMaintenancePlanPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { user, membership } = useAuth();
    const { plantLabel, machineContextLabel } = useOrgType();
    const userRole = membership?.role ?? "viewer";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizationId, setOrganizationId] = useState < string | null > (null);
    const [machines, setMachines] = useState < MachineOption[] > ([]);
    const [users, setUsers] = useState < UserOption[] > ([]);
    const [form, setForm] = useState({
        machine_id: "",
        title: "",
        description: "",
        frequency_type: "days",
        frequency_value: 30,
        estimated_duration_minutes: "",
        priority: "medium",
        instructions: "",
        safety_notes: "",
        default_assignee_id: "",
        next_due_date: "",
        required_skills: "",
        is_active: true,
    });

    useEffect(() => {
        if (!user || !id || typeof id !== "string") return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("default_organization_id")
                    .eq("id", user.id)
                    .maybeSingle();

                const orgId = (profile as any)?.default_organization_id ?? null;
                if (!orgId) throw new Error("Organizzazione attiva non trovata.");

                const [{ data: planData, error: planError }, { data: machineData, error: machineError }, { data: memberships, error: membersError }] = await Promise.all([
                    supabase
                        .from("maintenance_plans")
                        .select("id, machine_id, title, description, frequency_type, frequency_value, estimated_duration_minutes, priority, instructions, safety_notes, default_assignee_id, next_due_date, required_skills, is_active")
                        .eq("id", id)
                        .maybeSingle(),
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, plants(name)")
                        .eq("organization_id", orgId)
                        .order("name"),
                    supabase
                        .from("organization_memberships")
                        .select("user_id")
                        .eq("organization_id", orgId)
                        .eq("is_active", true),
                ]);

                if (planError) throw planError;
                if (machineError) throw machineError;
                if (membersError) throw membersError;

                const userIds = Array.from(new Set((memberships ?? []).map((m: any) => m.user_id).filter(Boolean)));
                const { data: usersData, error: usersError } = userIds.length
                    ? await supabase.from("profiles").select("id, first_name, last_name, display_name, email").in("id", userIds).order("display_name")
                    : { data: [], error: null as any };

                if (usersError) throw usersError;
                if (!active) return;

                setOrganizationId(orgId);
                setMachines((machineData as any) ?? []);
                setUsers((usersData as any) ?? []);
                setForm({
                    machine_id: (planData as any)?.machine_id ?? "",
                    title: (planData as any)?.title ?? "",
                    description: (planData as any)?.description ?? "",
                    frequency_type: (planData as any)?.frequency_type ?? "days",
                    frequency_value: Number((planData as any)?.frequency_value ?? 30),
                    estimated_duration_minutes: (planData as any)?.estimated_duration_minutes ? String((planData as any).estimated_duration_minutes) : "",
                    priority: (planData as any)?.priority ?? "medium",
                    instructions: (planData as any)?.instructions ?? "",
                    safety_notes: (planData as any)?.safety_notes ?? "",
                    default_assignee_id: (planData as any)?.default_assignee_id ?? "",
                    next_due_date: isoDate((planData as any)?.next_due_date),
                    required_skills: Array.isArray((planData as any)?.required_skills) ? (planData as any).required_skills.join(", ") : "",
                    is_active: Boolean((planData as any)?.is_active ?? true),
                });
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore caricamento piano", description: error?.message ?? "Impossibile aprire il piano." });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [id, toast, user]);

    const machineOptions = useMemo(
        () =>
            machines.map((machine) => ({
                value: machine.id,
                label: `${machine.plants?.name || plantLabel} â†’ ${machine.name || machine.internal_code || machine.id}`,
            })),
        [machines, plantLabel]
    );

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!id || typeof id !== "string") return;
        setSaving(true);
        try {
            const payload = {
                machine_id: form.machine_id || null,
                title: form.title.trim(),
                description: form.description.trim() || null,
                frequency_type: form.frequency_type,
                frequency_value: Number(form.frequency_value || 0),
                estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
                priority: form.priority,
                instructions: form.instructions.trim() || null,
                safety_notes: form.safety_notes.trim() || null,
                default_assignee_id: form.default_assignee_id || null,
                next_due_date: form.next_due_date || null,
                required_skills: form.required_skills
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                is_active: form.is_active,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from("maintenance_plans").update(payload).eq("id", id);
            if (error) throw error;
            toast({ title: "Piano aggiornato" });
            router.push(`/maintenance/${id}`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare il piano." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Modifica piano - MACHINA" />
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Modifica piano di manutenzione</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-sm text-muted-foreground">Caricamento...</div>
                            ) : (
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="machine_id">{machineContextLabel}</Label>
                                            <select id="machine_id" className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.machine_id} onChange={(e) => setForm((prev) => ({ ...prev, machine_id: e.target.value }))}>
                                                <option value="">Template generico</option>
                                                {machineOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="title">Titolo</Label>
                                            <Input id="title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="description">Descrizione</Label>
                                            <Textarea id="description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="frequency_type">Tipo frequenza</Label>
                                            <select id="frequency_type" className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.frequency_type} onChange={(e) => setForm((prev) => ({ ...prev, frequency_type: e.target.value }))}>
                                                <option value="hours">Ore</option>
                                                <option value="days">Giorni</option>
                                                <option value="weeks">Settimane</option>
                                                <option value="months">Mesi</option>
                                                <option value="cycles">Cicli</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="frequency_value">Valore frequenza</Label>
                                            <Input id="frequency_value" type="number" min={1} value={form.frequency_value} onChange={(e) => setForm((prev) => ({ ...prev, frequency_value: Number(e.target.value || 1) }))} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="priority">PrioritÃ </Label>
                                            <select id="priority" className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
                                                <option value="low">Bassa</option>
                                                <option value="medium">Media</option>
                                                <option value="high">Alta</option>
                                                <option value="critical">Critica</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="estimated_duration_minutes">Durata stimata (min)</Label>
                                            <Input id="estimated_duration_minutes" type="number" min={0} value={form.estimated_duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, estimated_duration_minutes: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="default_assignee_id">Assegnatario predefinito</Label>
                                            <select id="default_assignee_id" className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.default_assignee_id} onChange={(e) => setForm((prev) => ({ ...prev, default_assignee_id: e.target.value }))}>
                                                <option value="">Nessuno</option>
                                                {users.map((entry) => {
                                                    const label = entry.display_name || `${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim() || entry.email || entry.id;
                                                    return <option key={entry.id} value={entry.id}>{label}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="next_due_date">Prossima scadenza</Label>
                                            <Input id="next_due_date" type="date" value={form.next_due_date} onChange={(e) => setForm((prev) => ({ ...prev, next_due_date: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="required_skills">Competenze richieste</Label>
                                            <Input id="required_skills" value={form.required_skills} onChange={(e) => setForm((prev) => ({ ...prev, required_skills: e.target.value }))} placeholder="elettrico, meccanico, oleodinamica" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="instructions">Istruzioni operative</Label>
                                            <Textarea id="instructions" rows={5} value={form.instructions} onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="safety_notes">Note di sicurezza</Label>
                                            <Textarea id="safety_notes" rows={4} value={form.safety_notes} onChange={(e) => setForm((prev) => ({ ...prev, safety_notes: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-3">
                                        <Button asChild variant="outline">
                                            <Link href={id ? `/maintenance/${id}` : "/maintenance"}>Annulla</Link>
                                        </Button>
                                        <Button type="submit" disabled={saving || !organizationId}>{saving ? "Salvataggio..." : "Salva modifiche"}</Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

