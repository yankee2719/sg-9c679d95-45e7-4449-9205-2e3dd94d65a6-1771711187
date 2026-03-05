import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Template = { id: string; name: string };
type Machine = { id: string; name: string; internal_code?: string | null };

function canManage(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function ChecklistAssignmentsPage() {
    const { toast } = useToast();

    const [role, setRole] = useState < string > ("technician");
    const allow = useMemo(() => canManage(role), [role]);

    const [orgId, setOrgId] = useState < string | null > (null);
    const [templates, setTemplates] = useState < Template[] > ([]);
    const [machines, setMachines] = useState < Machine[] > ([]);

    const [templateId, setTemplateId] = useState < string > ("none");
    const [machineId, setMachineId] = useState < string > ("none");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const ctx: any = await getUserContext();
            const r = ctx?.role ?? "technician";
            setRole(r);

            const oid =
                ctx?.orgId || ctx?.organizationId || ctx?.organization_id || ctx?.tenant_id || null;
            if (!oid) throw new Error("Organization non trovata.");
            setOrgId(oid);

            const [{ data: tData, error: tErr }, { data: mData, error: mErr }] = await Promise.all([
                supabase
                    .from("checklist_templates")
                    .select("id,name")
                    .eq("organization_id", oid)
                    .eq("is_active", true)
                    .order("name", { ascending: true }),
                supabase
                    .from("machines")
                    .select("id,name,internal_code")
                    .eq("is_archived", false)
                    .order("name", { ascending: true })
                    .limit(1000),
            ]);

            if (tErr) throw tErr;
            if (mErr) throw mErr;

            setTemplates((tData ?? []) as any);
            setMachines((mData ?? []) as any);
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore caricamento", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const assign = async () => {
        if (!allow) {
            toast({ title: "Permesso negato", description: "Solo Admin/Supervisor.", variant: "destructive" });
            return;
        }
        if (!orgId) return;
        if (templateId === "none" || machineId === "none") {
            toast({ title: "Errore", description: "Seleziona template e macchina.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("checklist_assignments").insert({
                organization_id: orgId,
                template_id: templateId,
                machine_id: machineId,
                is_active: true,
            });

            if (error) throw error;

            toast({ title: "OK", description: "Checklist assegnata alla macchina." });
            setTemplateId("none");
            setMachineId("none");
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore assegnazione", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold">Assegnazioni Checklist</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Assegna template a macchina</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Template</div>
                                    <Select value={templateId} onValueChange={setTemplateId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Seleziona template...</SelectItem>
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Macchina</div>
                                    <Select value={machineId} onValueChange={setMachineId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona macchina..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Seleziona macchina...</SelectItem>
                                            {machines.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.name}{m.internal_code ? ` — ${m.internal_code}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={assign}
                                        disabled={saving || !allow}
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        {saving ? "Assegnazione..." : "Assegna"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground">
                    Dopo l’assegnazione, il tecnico potrà compilare la checklist come “execution” (da Work Order / Scanner / Maintenance).
                </div>
            </div>
        </MainLayout>
    );
}