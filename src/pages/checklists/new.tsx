import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type PlantLite = { id: string; name: string | null; type: string | null };

type ItemDraft = {
    localId: string;
    title: string;
    description: string;
    is_required: boolean;
    expected_value: string;
    measurement_unit: string;
    min_value: string;
    max_value: string;
};

function makeItem(): ItemDraft {
    return {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        description: "",
        is_required: true,
        expected_value: "",
        measurement_unit: "",
        min_value: "",
        max_value: "",
    };
}

export default function NewChecklistPage() {
    const router = useRouter();
    const { user, organization, membership, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { isManufacturer, machineContextLabel } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState < MachineLite[] > ([]);
    const [plants, setPlants] = useState < Record < string, PlantLite>> ({});

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [checklistType, setChecklistType] = useState("inspection");
    const [machineId, setMachineId] = useState < string > ("generic");
    const [isTemplate, setIsTemplate] = useState(true);
    const [isActive, setIsActive] = useState(true);
    const [items, setItems] = useState < ItemDraft[] > ([makeItem()]);

    const canManage = ["owner", "admin", "supervisor"].includes(membership?.role ?? "");
    const userRole = membership?.role ?? "viewer";

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id) {
            setLoading(false);
            return;
        }

        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const { data: machineRows, error: machineError } = await supabase
                    .from("machines")
                    .select("id, name, internal_code, plant_id, area")
                    .eq("organization_id", organization.id)
                    .order("name", { ascending: true });
                if (machineError) throw machineError;
                const machineList = (machineRows ?? []) as MachineLite[];
                const plantIds = Array.from(new Set(machineList.map((row) => row.plant_id).filter(Boolean))) as string[];
                let plantMap: Record<string, PlantLite> = {};
                if (plantIds.length > 0) {
                    const { data: plantRows, error: plantError } = await supabase.from("plants").select("id, name").in("id", plantIds);
                    if (plantError) throw plantError;
                    plantMap = Object.fromEntries(((plantRows ?? []) as PlantLite[]).map((row) => [row.id, row]));
                }
                if (!active) return;
                setMachines(machineList);
                setPlants(plantMap);
            } catch (error: any) {
                console.error("Checklist new load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare macchine e contesto.", variant: "destructive" });
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, organization?.id, toast]);

    const machineOptions = useMemo(() => {
        return machines.map((machine) => {
            const plant = machine.plant_id ? plants[machine.plant_id] : null;
            const left = plant?.name ?? (isManufacturer ? "Cliente" : "Stabilimento");
            const right = machine.name ?? "Macchina";
            return { id: machine.id, label: `${left} → ${right}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` };
        });
    }, [isManufacturer, machines, plants]);

    const updateItem = (localId: string, patch: Partial<ItemDraft>) => {
        setItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
    };

    const moveItem = (localId: string, direction: -1 | 1) => {
        setItems((current) => {
            const index = current.findIndex((item) => item.localId === localId);
            if (index < 0) return current;
            const target = index + direction;
            if (target < 0 || target >= current.length) return current;
            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return next;
        });
    };

    const removeItem = (localId: string) => {
        setItems((current) => (current.length === 1 ? current : current.filter((item) => item.localId !== localId)));
    };

    const handleSave = async () => {
        if (!organization?.id || !canManage) return;
        const cleanTitle = title.trim();
        const cleanItems = items.map((item) => ({ ...item, title: item.title.trim(), description: item.description.trim(), measurement_unit: item.measurement_unit.trim(), expected_value: item.expected_value.trim(), min_value: item.min_value.trim(), max_value: item.max_value.trim() }));
        if (!cleanTitle) {
            toast({ title: "Titolo obbligatorio", description: "Inserisci il titolo della checklist.", variant: "destructive" });
            return;
        }
        if (cleanItems.some((item) => !item.title)) {
            toast({ title: "Punti incompleti", description: "Ogni punto di controllo deve avere un titolo.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { data: checklistRow, error: checklistError } = await supabase
                .from("checklists")
                .insert({
                    organization_id: organization.id,
                    machine_id: machineId === "generic" ? null : machineId,
                    title: cleanTitle,
                    description: description.trim() || null,
                    checklist_type: checklistType,
                    is_template: isTemplate,
                    is_active: isActive,
                    created_by: user?.id ?? null,
                })
                .select("id")
                .single();
            if (checklistError) throw checklistError;

            const rows = cleanItems.map((item, index) => ({
                checklist_id: checklistRow.id,
                title: item.title,
                description: item.description || null,
                item_order: index,
                is_required: item.is_required,
                expected_value: item.expected_value || null,
                measurement_unit: item.measurement_unit || null,
                min_value: item.min_value ? Number(item.min_value) : null,
                max_value: item.max_value ? Number(item.max_value) : null,
            }));

            const { error: itemsError } = await supabase.from("checklist_items").insert(rows);
            if (itemsError) throw itemsError;

            toast({ title: "Checklist creata", description: "Il template checklist è stato salvato correttamente." });
            router.push(`/checklists/${checklistRow.id}`);
        } catch (error: any) {
            console.error("Checklist save error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare la checklist.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`Nuova checklist - MACHINA`} />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push("/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alla lista
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Nuova checklist</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Crea un template checklist associato a una macchina o generico per più contesti operativi.</p>
                            </div>
                            <Button onClick={handleSave} disabled={saving || loading || !canManage} className="rounded-2xl">
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? "Salvataggio..." : "Salva checklist"}
                            </Button>
                        </div>

                        {!canManage ? (
                            <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Solo admin e supervisor possono creare checklist.</CardContent></Card>
                        ) : null}

                        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Dati generali</CardTitle>
                                    <CardDescription>Imposta titolo, tipo e contesto macchina della checklist.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="checklist-title">Titolo</Label>
                                        <Input id="checklist-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Es. Controllo mensile pressa 200T" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="checklist-description">Descrizione</Label>
                                        <Textarea id="checklist-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Scopo, campo di applicazione e note operative..." />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Tipo checklist</Label>
                                            <Select value={checklistType} onValueChange={setChecklistType}>
                                                <SelectTrigger><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="inspection">Ispezione</SelectItem>
                                                    <SelectItem value="startup">Avvio</SelectItem>
                                                    <SelectItem value="shutdown">Arresto</SelectItem>
                                                    <SelectItem value="safety">Sicurezza</SelectItem>
                                                    <SelectItem value="quality">Qualità</SelectItem>
                                                    <SelectItem value="custom">Personalizzata</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{machineContextLabel}</Label>
                                            <Select value={machineId} onValueChange={setMachineId}>
                                                <SelectTrigger><SelectValue placeholder="Template generico" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="generic">Template generico</SelectItem>
                                                    {machineOptions.map((option) => (
                                                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
                                            <Checkbox id="is-template" checked={isTemplate} onCheckedChange={(value) => setIsTemplate(Boolean(value))} />
                                            <div>
                                                <Label htmlFor="is-template">È un template</Label>
                                                <p className="text-xs text-muted-foreground">Mantieni attiva la checklist come modello riutilizzabile.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
                                            <Checkbox id="is-active" checked={isActive} onCheckedChange={(value) => setIsActive(Boolean(value))} />
                                            <div>
                                                <Label htmlFor="is-active">Checklist attiva</Label>
                                                <p className="text-xs text-muted-foreground">Se disattiva, resta in archivio ma non appare nei flussi operativi.</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Builder punti di controllo</CardTitle>
                                    <CardDescription>Aggiungi, riordina e configura i punti che il tecnico dovrà verificare.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {loading ? <div className="text-sm text-muted-foreground">Caricamento contesto...</div> : null}
                                    {items.map((item, index) => (
                                        <div key={item.localId} className="space-y-4 rounded-2xl border border-border p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-sm font-medium text-foreground">Punto {index + 1}</div>
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" size="icon" onClick={() => moveItem(item.localId, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button type="button" variant="outline" size="icon" onClick={() => moveItem(item.localId, 1)} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                    <Button type="button" variant="outline" size="icon" onClick={() => removeItem(item.localId)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Titolo controllo</Label>
                                                <Input value={item.title} onChange={(event) => updateItem(item.localId, { title: event.target.value })} placeholder="Es. Verifica livello olio" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Descrizione</Label>
                                                <Textarea rows={3} value={item.description} onChange={(event) => updateItem(item.localId, { description: event.target.value })} placeholder="Dettagli operativi, metodo di verifica, strumento..." />
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                <div className="space-y-2">
                                                    <Label>Valore atteso</Label>
                                                    <Input value={item.expected_value} onChange={(event) => updateItem(item.localId, { expected_value: event.target.value })} placeholder="Es. 200" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Unità misura</Label>
                                                    <Input value={item.measurement_unit} onChange={(event) => updateItem(item.localId, { measurement_unit: event.target.value })} placeholder="bar, °C, mm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Min</Label>
                                                    <Input type="number" value={item.min_value} onChange={(event) => updateItem(item.localId, { min_value: event.target.value })} placeholder="Min" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Max</Label>
                                                    <Input type="number" value={item.max_value} onChange={(event) => updateItem(item.localId, { max_value: event.target.value })} placeholder="Max" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                                                <Checkbox checked={item.is_required} onCheckedChange={(value) => updateItem(item.localId, { is_required: Boolean(value) })} />
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">Punto obbligatorio</div>
                                                    <div className="text-xs text-muted-foreground">Se non compilato, la checklist non potrà essere completata.</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, makeItem()])} className="rounded-2xl">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Aggiungi punto di controllo
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

