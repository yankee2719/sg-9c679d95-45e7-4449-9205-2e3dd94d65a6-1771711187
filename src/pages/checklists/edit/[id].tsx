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
import { ArrowDown, ArrowLeft, ArrowUp, Camera, Plus, Save, Trash2 } from "lucide-react";
import {
    buildChecklistItemDescription,
    inferChecklistItemMeta,
    parseChecklistItemDescription,
    type ChecklistItemResponseType,
} from "@/lib/checklistItemMeta";

type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type PlantLite = { id: string; name: string | null };
type ChecklistRow = { id: string; title: string; description: string | null; checklist_type: string | null; machine_id: string | null; is_template: boolean | null; is_active: boolean | null };
type ChecklistItemRow = { id: string; title: string; description: string | null; item_order: number | null; is_required: boolean | null; expected_value: string | null; measurement_unit: string | null; min_value: number | null; max_value: number | null };

type ItemDraft = {
    localId: string;
    title: string;
    description: string;
    is_required: boolean;
    responseType: ChecklistItemResponseType;
    expected_value: string;
    measurement_unit: string;
    min_value: string;
    max_value: string;
    allowPhoto: boolean;
};

function makeItem(): ItemDraft {
    return {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        description: "",
        is_required: true,
        responseType: "boolean",
        expected_value: "",
        measurement_unit: "",
        min_value: "",
        max_value: "",
        allowPhoto: false,
    };
}

function resetMeasurementFields(item: ItemDraft, responseType: ChecklistItemResponseType): ItemDraft {
    if (responseType === "numeric") return item;
    return { ...item, expected_value: "", measurement_unit: "", min_value: "", max_value: "" };
}

export default function EditChecklistPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : null;
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
        if (authLoading || !organization?.id || !checklistId) return;
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

                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, title, description, checklist_type, machine_id, is_template, is_active")
                    .eq("id", checklistId)
                    .eq("organization_id", organization.id)
                    .single();
                if (checklistError) throw checklistError;

                const { data: itemRows, error: itemsError } = await supabase
                    .from("checklist_items")
                    .select("id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value")
                    .eq("checklist_id", checklistId)
                    .order("item_order", { ascending: true });
                if (itemsError) throw itemsError;

                if (!active) return;
                const c = checklistRow as ChecklistRow;
                const mapped = ((itemRows ?? []) as ChecklistItemRow[]).map((row, index) => {
                    const parsed = parseChecklistItemDescription(row.description);
                    const meta = inferChecklistItemMeta({
                        description: row.description,
                        expected_value: row.expected_value,
                        measurement_unit: row.measurement_unit,
                        min_value: row.min_value,
                        max_value: row.max_value,
                    });
                    return {
                        localId: row.id ?? `${index}`,
                        title: row.title ?? "",
                        description: parsed.cleanDescription,
                        is_required: row.is_required !== false,
                        responseType: meta.responseType,
                        expected_value: row.expected_value ?? "",
                        measurement_unit: row.measurement_unit ?? "",
                        min_value: row.min_value === null || row.min_value === undefined ? "" : String(row.min_value),
                        max_value: row.max_value === null || row.max_value === undefined ? "" : String(row.max_value),
                        allowPhoto: meta.allowPhoto,
                    } satisfies ItemDraft;
                });

                setMachines(machineList);
                setPlants(plantMap);
                setTitle(c.title ?? "");
                setDescription(c.description ?? "");
                setChecklistType(c.checklist_type ?? "inspection");
                setMachineId(c.machine_id ?? "generic");
                setIsTemplate(Boolean(c.is_template));
                setIsActive(c.is_active !== false);
                setItems(mapped.length > 0 ? mapped : [makeItem()]);
            } catch (error: any) {
                console.error("Checklist edit load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare la checklist.", variant: "destructive" });
                    router.replace("/checklists");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [authLoading, checklistId, organization?.id, router, toast]);

    const machineOptions = useMemo(() => {
        return machines.map((machine) => {
            const plant = machine.plant_id ? plants[machine.plant_id] : null;
            const left = plant?.name ?? (isManufacturer ? "Cliente" : "Stabilimento");
            const right = machine.name ?? "Macchina";
            return { id: machine.id, label: `${left} → ${right}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` };
        });
    }, [isManufacturer, machines, plants]);

    const updateItem = (localId: string, patch: Partial<ItemDraft>) => {
        setItems((current) => current.map((item) => {
            if (item.localId !== localId) return item;
            const next = { ...item, ...patch };
            return patch.responseType ? resetMeasurementFields(next, patch.responseType) : next;
        }));
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
        if (!organization?.id || !checklistId || !canManage) return;
        const cleanTitle = title.trim();
        const cleanItems = items.map((item) => ({
            ...item,
            title: item.title.trim(),
            description: item.description.trim(),
            measurement_unit: item.measurement_unit.trim(),
            expected_value: item.expected_value.trim(),
            min_value: item.min_value.trim(),
            max_value: item.max_value.trim(),
        }));

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
            const { error: checklistError } = await supabase
                .from("checklists")
                .update({
                    machine_id: machineId === "generic" ? null : machineId,
                    title: cleanTitle,
                    description: description.trim() || null,
                    checklist_type: checklistType,
                    is_template: isTemplate,
                    is_active: isActive,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", checklistId)
                .eq("organization_id", organization.id);
            if (checklistError) throw checklistError;

            const { error: deleteError } = await supabase.from("checklist_items").delete().eq("checklist_id", checklistId);
            if (deleteError) throw deleteError;

            const rows = cleanItems.map((item, index) => ({
                checklist_id: checklistId,
                title: item.title,
                description: buildChecklistItemDescription(item.description, { responseType: item.responseType, allowPhoto: item.allowPhoto }),
                item_order: index,
                is_required: item.is_required,
                expected_value: item.responseType === "numeric" ? item.expected_value || null : null,
                measurement_unit: item.responseType === "numeric" ? item.measurement_unit || null : null,
                min_value: item.responseType === "numeric" && item.min_value ? Number(item.min_value) : null,
                max_value: item.responseType === "numeric" && item.max_value ? Number(item.max_value) : null,
            }));
            const { error: itemsError } = await supabase.from("checklist_items").insert(rows);
            if (itemsError) throw itemsError;

            toast({ title: "Checklist aggiornata", description: "Le modifiche sono state salvate." });
            router.push(`/checklists/${checklistId}`);
        } catch (error: any) {
            console.error("Checklist update error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare la checklist.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Modifica checklist - MACHINA" />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push(checklistId ? `/checklists/${checklistId}` : "/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alla checklist
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Modifica checklist</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Aggiorna il template checklist e i suoi punti di controllo.</p>
                            </div>
                            <Button onClick={handleSave} disabled={saving || loading || !canManage} className="rounded-2xl">
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? "Salvataggio..." : "Salva modifiche"}
                            </Button>
                        </div>

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader>
                                <CardTitle>Dati checklist</CardTitle>
                                <CardDescription>Definisci ambito, tipo e contesto macchina del template.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="title">Titolo</Label>
                                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Controllo mensile pressa 200T" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Descrizione</Label>
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scopo, note operative, contesto d'uso..." rows={4} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo checklist</Label>
                                    <Select value={checklistType} onValueChange={setChecklistType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="inspection">Ispezione</SelectItem>
                                            <SelectItem value="startup">Avviamento</SelectItem>
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
                                        <SelectTrigger><SelectValue placeholder="Seleziona macchina" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="generic">Template generico</SelectItem>
                                            {machineOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                                    <Checkbox checked={isTemplate} onCheckedChange={(value) => setIsTemplate(Boolean(value))} id="isTemplate" />
                                    <div>
                                        <Label htmlFor="isTemplate">È un template</Label>
                                        <p className="text-sm text-muted-foreground">Mantieni il comportamento da template riutilizzabile.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                                    <Checkbox checked={isActive} onCheckedChange={(value) => setIsActive(Boolean(value))} id="isActive" />
                                    <div>
                                        <Label htmlFor="isActive">Checklist attiva</Label>
                                        <p className="text-sm text-muted-foreground">Se disattiva, non viene proposta nei flussi operativi.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Punti di controllo</CardTitle>
                                    <CardDescription>Definisci il tipo di risposta e se il punto può raccogliere una foto.</CardDescription>
                                </div>
                                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setItems((current) => [...current, makeItem()])}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Aggiungi punto
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={item.localId} className="rounded-3xl border border-border/70 bg-background/70 p-5 shadow-sm">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="font-medium text-foreground">Punto {index + 1}</h3>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.localId, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.localId, 1)} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.localId)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Titolo</Label>
                                                <Input value={item.title} onChange={(e) => updateItem(item.localId, { title: e.target.value })} placeholder="Es. Verifica pressione circuito" />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Descrizione</Label>
                                                <Textarea value={item.description} onChange={(e) => updateItem(item.localId, { description: e.target.value })} placeholder="Dettagli operativi, metodo di verifica, strumento..." rows={3} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tipo risposta</Label>
                                                <Select value={item.responseType} onValueChange={(value) => updateItem(item.localId, { responseType: value as ChecklistItemResponseType })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="boolean">Conferma semplice</SelectItem>
                                                        <SelectItem value="numeric">Valore numerico</SelectItem>
                                                        <SelectItem value="text">Testo / note</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                                                <Checkbox checked={item.allowPhoto} onCheckedChange={(value) => updateItem(item.localId, { allowPhoto: Boolean(value) })} id={`photo-${item.localId}`} />
                                                <div>
                                                    <Label htmlFor={`photo-${item.localId}`} className="inline-flex items-center gap-2"><Camera className="h-4 w-4" /> Foto opzionale</Label>
                                                    <p className="text-sm text-muted-foreground">In esecuzione il tecnico potrà allegare una foto su questo punto.</p>
                                                </div>
                                            </div>

                                            {item.responseType === "numeric" ? (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>Valore atteso</Label>
                                                        <Input value={item.expected_value} onChange={(e) => updateItem(item.localId, { expected_value: e.target.value })} placeholder="Es. 200" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Unità misura</Label>
                                                        <Input value={item.measurement_unit} onChange={(e) => updateItem(item.localId, { measurement_unit: e.target.value })} placeholder="bar, °C, mm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Min</Label>
                                                        <Input value={item.min_value} onChange={(e) => updateItem(item.localId, { min_value: e.target.value })} placeholder="Min" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Max</Label>
                                                        <Input value={item.max_value} onChange={(e) => updateItem(item.localId, { max_value: e.target.value })} placeholder="Max" />
                                                    </div>
                                                </>
                                            ) : null}

                                            <div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                                                <Checkbox checked={item.is_required} onCheckedChange={(value) => updateItem(item.localId, { is_required: Boolean(value) })} id={`required-${item.localId}`} />
                                                <div>
                                                    <Label htmlFor={`required-${item.localId}`}>Punto obbligatorio</Label>
                                                    <p className="text-sm text-muted-foreground">Se non compilato, la checklist non potrà essere completata.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
