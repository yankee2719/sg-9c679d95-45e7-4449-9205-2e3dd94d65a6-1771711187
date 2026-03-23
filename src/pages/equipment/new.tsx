import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { createMachine } from "@/services/machineApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OrgType = "manufacturer" | "customer" | null;

export default function NewEquipmentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading, organization, membership } = useAuth();
    const { t } = useLanguage();

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", internal_code: "", serial_number: "", model: "", brand: "", lifecycle_state: "active", notes: "", plant_id: "", production_line_id: "" });

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: t("common.error") || "Errore", description: t("equipment.errorNameRequired") || "Il nome macchina è obbligatorio.", variant: "destructive" }); return; }
        setSaving(true);
        try {
            const data = await createMachine({ name: form.name, internal_code: form.internal_code, serial_number: form.serial_number, model: form.model, brand: form.brand, lifecycle_state: form.lifecycle_state, notes: form.notes, plant_id: orgType === "customer" ? form.plant_id : null, production_line_id: orgType === "customer" ? form.production_line_id : null });
            toast({ title: t("equipment.created") || "Macchina creata", description: form.name });
            void router.push(`/equipment/${data.id}`);
        } catch (error: any) {
            console.error(error);
            toast({ title: t("common.error") || "Errore", description: error?.message || "Errore creazione macchina", variant: "destructive" });
        } finally { setSaving(false); }
    };

    if (loading) { return (<MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div></MainLayout>); }
    if (!canEdit) { return (<OrgContextGuard><MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("equipment.accessDenied") || "Accesso negato."}</div></MainLayout></OrgContextGuard>); }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("machines.new")} - MACHINA`} />
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href="/equipment"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                        <div><h1 className="text-3xl font-bold">{t("machines.new")}</h1><p className="text-sm text-muted-foreground">{t("equipment.newSubtitle") || "Crea una nuova macchina nel contesto attivo."}</p></div>
                    </div>
                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{t("equipment.mainData") || "Dati principali"}</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("equipment.machineName") || "Nome macchina"} *</div><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("equipment.internalCode") || "Codice interno"}</div><Input value={form.internal_code} onChange={(e) => setForm((p) => ({ ...p, internal_code: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.serialNumber")}</div><Input value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.manufacturer")}</div><Input value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} /></div>
                            <div><div className="mb-2 text-sm font-medium">{t("machines.model")}</div><Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} /></div>
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("machines.status")}</div><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.lifecycle_state} onChange={(e) => setForm((p) => ({ ...p, lifecycle_state: e.target.value }))}><option value="active">active</option><option value="inactive">inactive</option><option value="under_maintenance">under_maintenance</option><option value="commissioning">commissioning</option><option value="decommissioned">decommissioned</option></select></div>
                            <div className="md:col-span-2"><div className="mb-2 text-sm font-medium">{t("equipment.notes") || "Note"}</div><Textarea rows={4} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end gap-3">
                        <Link href="/equipment"><Button variant="outline">{t("common.cancel")}</Button></Link>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? t("common.saving") || "Salvataggio..." : t("equipment.createMachine") || "Crea macchina"}</Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
