import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, Factory, GitBranch, Loader2, MapPin, Save, Settings2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasMinimumCompatibleRole } from "@/lib/roles";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMachine, getMachine, getPlantsContext, updateMachine } from "@/lib/machineWorkspaceApi";

type OrgType = "manufacturer" | "customer" | null;

interface MachineEditorPageProps {
    mode: "create" | "edit";
    machineId?: string | null;
}

type PlantRow = { id: string; name: string | null; code: string | null };
type LineRow = { id: string; name: string | null; code: string | null; plant_id: string | null };

type FormState = {
    name: string;
    internal_code: string;
    serial_number: string;
    model: string;
    brand: string;
    lifecycle_state: string;
    notes: string;
    plant_id: string;
    production_line_id: string;
};

export default function MachineEditorPage({ mode, machineId = null }: MachineEditorPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const tx = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [lines, setLines] = useState < LineRow[] > ([]);
    const [allLines, setAllLines] = useState < LineRow[] > ([]);
    const [form, setForm] = useState < FormState > ({ name: "", internal_code: "", serial_number: "", model: "", brand: "", lifecycle_state: "active", notes: "", plant_id: "", production_line_id: "" });

    const orgId = organization?.id ?? null;
    const orgName = organization?.name ?? "—";
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = hasMinimumCompatibleRole(userRole, "supervisor");

    const pageTitle = mode === "create" ? (t("equipment.new") || "Nuova macchina") : tx("equipment.editMachine", "Modifica macchina");
    const pageSubtitle = mode === "create" ? tx("equipment.createSubtitle", "Inserisci i dati principali della macchina nel contesto organizzativo attivo.") : tx("equipment.editSubtitle", "Aggiorna i dati principali della macchina nel contesto organizzativo attivo.");

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (authLoading) return;
            if (!orgId || !orgType || !canEdit) {
                if (active) setLoading(false);
                return;
            }
            try {
                setLoading(true);
                if (orgType === "customer") {
                    const data = await getPlantsContext();
                    if (!active) return;
                    setPlants((data.plants ?? []) as PlantRow[]);
                    setAllLines((data.lines ?? []) as LineRow[]);
                } else {
                    setPlants([]);
                    setAllLines([]);
                    setLines([]);
                }

                if (mode === "edit" && machineId) {
                    const machine = await getMachine(machineId);
                    if (!active) return;
                    setForm({
                        name: machine.name ?? "",
                        internal_code: machine.internal_code ?? "",
                        serial_number: machine.serial_number ?? "",
                        model: machine.model ?? "",
                        brand: machine.brand ?? "",
                        lifecycle_state: machine.lifecycle_state ?? "active",
                        notes: machine.notes ?? "",
                        plant_id: machine.plant_id ?? "",
                        production_line_id: machine.production_line_id ?? "",
                    });
                }
            } catch (error) {
                console.error("Machine editor load error:", error);
                if (mode === "edit") void router.replace("/equipment");
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, orgId, orgType, canEdit, mode, machineId, router]);

    useEffect(() => {
        if (orgType !== "customer" || !form.plant_id) {
            setLines([]);
            return;
        }
        setLines(allLines.filter((line) => line.plant_id === form.plant_id));
    }, [allLines, form.plant_id, orgType]);

    const handleField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
    const handlePlantChange = (plantId: string) => setForm((prev) => ({ ...prev, plant_id: plantId, production_line_id: "" }));

    const handleSave = async () => {
        if (!orgId || !orgType) return;
        if (!form.name.trim()) {
            toast({ title: tx("common.error", "Errore"), description: tx("equipment.requiredName", "Il nome macchina è obbligatorio."), variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const payload = { name: form.name.trim(), internal_code: form.internal_code.trim() || null, serial_number: form.serial_number.trim() || null, model: form.model.trim() || null, brand: form.brand.trim() || null, lifecycle_state: form.lifecycle_state || "active", notes: form.notes.trim() || null, plant_id: orgType === "customer" ? form.plant_id || null : null, production_line_id: orgType === "customer" ? form.production_line_id || null : null };
            if (mode === "create") {
                const data = await createMachine(payload);
                toast({ title: tx("equipment.created", "Macchina creata"), description: form.name.trim() });
                void router.push(`/equipment/${data.id}`);
            } else if (machineId) {
                await updateMachine(machineId, payload);
                toast({ title: tx("equipment.updated", "Macchina aggiornata"), description: form.name.trim() });
                void router.push(`/equipment/${machineId}`);
            }
        } catch (error: any) {
            console.error("Machine save error:", error);
            toast({ title: tx("common.error", "Errore"), description: error?.message || tx("equipment.genericSaveError", "Errore durante il salvataggio della macchina"), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return <OrgContextGuard><MainLayout userRole={userRole}><SEO title={`${pageTitle} - MACHINA`} /><div className="mx-auto max-w-5xl px-4 py-8"><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("common.loading") || "Caricamento..."}</CardContent></Card></div></MainLayout></OrgContextGuard>;
    }

    if (!orgId || !orgType || !canEdit) {
        return <OrgContextGuard><MainLayout userRole={userRole}><SEO title={`${pageTitle} - MACHINA`} /><div className="mx-auto max-w-5xl px-4 py-8"><Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{tx("equipment.forbidden", "Questa pagina non è disponibile nel contesto attivo.")}</CardContent></Card></div></MainLayout></OrgContextGuard>;
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/equipment"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />{t("nav.equipment") || "Macchine"}</Button></Link></div>
                    <div><h1 className="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1><p className="mt-2 text-muted-foreground">{pageSubtitle}</p></div>
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{tx("equipment.mainData", "Dati principali")}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2 md:col-span-2"><Label>{tx("equipment.name", "Nome macchina")} *</Label><Input value={form.name} onChange={(e) => handleField("name", e.target.value)} placeholder={tx("equipment.placeholderName", "Es. HMS 140")} /></div><div className="space-y-2"><Label>{tx("equipment.internalCode", "Codice interno")}</Label><Input value={form.internal_code} onChange={(e) => handleField("internal_code", e.target.value)} /></div><div className="space-y-2"><Label>{t("machines.serialNumber") || "Matricola"}</Label><Input value={form.serial_number} onChange={(e) => handleField("serial_number", e.target.value)} /></div><div className="space-y-2"><Label>{t("machines.manufacturer") || "Marca"}</Label><Input value={form.brand} onChange={(e) => handleField("brand", e.target.value)} /></div><div className="space-y-2"><Label>{t("machines.model") || "Modello"}</Label><Input value={form.model} onChange={(e) => handleField("model", e.target.value)} /></div><div className="space-y-2 md:col-span-2"><Label>{t("machines.status") || "Stato macchina"}</Label><select value={form.lifecycle_state} onChange={(e) => handleField("lifecycle_state", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="active">{tx("equipment.lifecycle.active", "Attiva")}</option><option value="inactive">{tx("equipment.lifecycle.inactive", "Inattiva")}</option><option value="under_maintenance">{tx("equipment.lifecycle.maintenance", "In manutenzione")}</option><option value="commissioning">{tx("equipment.lifecycle.commissioning", "In commissioning")}</option><option value="decommissioned">{tx("equipment.lifecycle.decommissioned", "Dismessa")}</option></select></div><div className="space-y-2 md:col-span-2"><Label>{tx("equipment.notes", "Note")}</Label><Textarea value={form.notes} onChange={(e) => handleField("notes", e.target.value)} rows={4} /></div></CardContent></Card>
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2">{orgType === "manufacturer" ? <Factory className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}{tx("equipment.organizationContext", "Contesto organizzativo")}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border border-border bg-muted/30 p-4"><div className="text-sm text-muted-foreground">{orgType === "manufacturer" ? (t("org.manufacturer") || "Costruttore") : (t("org.customer") || "Cliente finale")}</div><div className="mt-1 font-semibold text-foreground">{tx("equipment.owner", "Organizzazione attiva")}: {orgName}</div></div>{orgType === "customer" && <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t("plants.fallbackPlant") || "Stabilimento"}</Label><select value={form.plant_id} onChange={(e) => handlePlantChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("common.none") || "Nessuno"}</option>{plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name || plant.code || plant.id}</option>)}</select></div><div className="space-y-2"><Label className="flex items-center gap-2"><GitBranch className="h-4 w-4" />{tx("plants.line", "Linea")}</Label><select value={form.production_line_id} onChange={(e) => handleField("production_line_id", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("common.none") || "Nessuna"}</option>{lines.map((line) => <option key={line.id} value={line.id}>{line.name || line.code || line.id}</option>)}</select></div>{plants.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground md:col-span-2">{tx("equipment.noPlantsAvailable", "Non risultano stabilimenti nel contesto attivo.")} <Link href="/plants" className="font-medium text-orange-500 hover:underline">{tx("equipment.createPlantsCta", "Apri stabilimenti")}</Link></div>}</div>}</CardContent></Card>
                    <div className="flex justify-end gap-3"><Link href="/equipment"><Button variant="outline">{t("common.cancel") || "Annulla"}</Button></Link><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{mode === "create" ? (t("equipment.new") || "Crea macchina") : (t("common.save") || "Salva")}</Button></div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
