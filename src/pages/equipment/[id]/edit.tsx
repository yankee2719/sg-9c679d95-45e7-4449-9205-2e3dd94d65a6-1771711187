import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMachine, updateMachine } from "@/services/machineApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function EditEquipmentPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership } = useAuth();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", internal_code: "", serial_number: "", model: "", brand: "", lifecycle_state: "active", notes: "", plant_id: "", production_line_id: "" });

    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);
    const resolvedId = typeof id === "string" ? id : null;

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!resolvedId || authLoading) return;
            try {
                const data = await getMachine(resolvedId);
                if (!active) return;
                setForm({ name: data.name ?? "", internal_code: data.internal_code ?? "", serial_number: data.serial_number ?? "", model: data.model ?? "", brand: data.brand ?? "", lifecycle_state: data.lifecycle_state ?? "active", notes: data.notes ?? "", plant_id: data.plant_id ?? "", production_line_id: data.production_line_id ?? "" });
            } catch (error) { console.error(error); void router.replace("/equipment"); }
            finally { if (active) setLoading(false); }
        };
        void load();
        return () => { active = false; };
    }, [resolvedId, authLoading, router]);

    const handleSave = async () => {
        if (!resolvedId) return;
        setSaving(true);
        try {
            await updateMachine(resolvedId, form);
            toast({ title: t("equipment.updated") || "Macchina aggiornata", description: form.name });
            void router.push(`/equipment/${resolvedId}`);
        } catch (error: any) {
            console.error(error);
            toast({ title: t("common.error") || "Errore", description: error?.message || t("equipment.errorUpdate") || "Errore aggiornamento", variant: "destructive" });
        } finally { setSaving(false); }
    };

    if (authLoading || loading) { return (<MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div></MainLayout>); }
    if (!canEdit) { return (<OrgContextGuard><MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("equipment.accessDenied") || "Accesso negato."}</div></MainLayout></OrgContextGuard>); }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("equipment.editMachine") || "Modifica macchina"} - MACHINA`} />
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href={`/equipment/${resolvedId}`}><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                        <div><h1 className="text-3xl font-bold">{t("equipment.editMachine") || "Modifica macchina"}</h1><p className="text-sm text-muted-foreground">{t("equipment.editSubtitle") || "Aggiorna i dati principali della macchina."}</p></div>
                    </div>
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{t("equipment.mainData") || "Dati principali"}</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("equipment.machineName") || "Nome macchina"}</div><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("equipment.internalCode") || "Codice interno"}</div><Input value={form.internal_code} onChange={(e) => setForm((p) => ({ ...p, internal_code: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.serialNumber")}</div><Input value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.manufacturer")}</div><Input value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.model")}</div><Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} /></div>
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("machines.status")}</div><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.lifecycle_state} onChange={(e) => setForm((p) => ({ ...p, lifecycle_state: e.target.value }))}><option value="active">active</option><option value="inactive">inactive</option><option value="under_maintenance">under_maintenance</option><option value="commissioning">commissioning</option><option value="decommissioned">decommissioned</option></select></div>
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("equipment.notes") || "Note"}</div><Textarea rows={4} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end gap-3">
                        <Link href={`/equipment/${resolvedId}`}><Button variant="outline">{t("common.cancel")}</Button></Link>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? t("common.saving") || "Salvataggio..." : t("common.save")}</Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}