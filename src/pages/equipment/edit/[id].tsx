import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Save,
    Loader2,
    Wrench,
    Building2,
    MapPin,
    Calendar,
    Hash,
    Tag,
    Factory,
    AlertTriangle,
} from "lucide-react";
import { createAuditLog, diffObjects } from "@/services/auditService";

type OrgType = "manufacturer" | "customer";

interface Machine {
    id: string;
    name: string;
    internal_code: string | null;
    serial_number: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    lifecycle_state: string | null;
    position: string | null;
    commissioned_at: string | null;
    specifications: any;
    notes: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    qr_code_token: string | null;
    photo_url: string | null;
    year_of_manufacture: number | null;
    organization_id: string | null;
    is_archived: boolean | null;
}

interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
}

interface LineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id?: string | null;
}

interface MachineFormData {
    name: string;
    internal_code: string;
    serial_number: string;
    brand: string;
    model: string;
    category: string;
    lifecycle_state: string;
    position: string;
    commissioned_at: string;
    specifications: string;
    notes: string;
    plant_id: string;
    production_line_id: string;
    year_of_manufacture: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
        label: "Attivo",
        className:
            "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    },
    commissioning: {
        label: "Commissioning",
        className:
            "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30",
    },
    maintenance: {
        label: "In Manutenzione",
        className:
            "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
    },
    inactive: {
        label: "Inattivo",
        className:
            "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
    },
};

function parseSpecificationsToText(value: any): string {
    if (!value) return "";
    if (typeof value === "string") return value;

    if (typeof value === "object") {
        if (typeof value.text === "string") return value.text;
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return "";
        }
    }

    return "";
}

function buildSpecificationsValue(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        return { text: trimmed };
    }
}

export default function EquipmentEditPage() {
    const router = useRouter();
    const { id } = router.query;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machine, setMachine] = useState < Machine | null > (null);

    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [lines, setLines] = useState < LineRow[] > ([]);
    const [availableLines, setAvailableLines] = useState < LineRow[] > ([]);

    const [errorMessage, setErrorMessage] = useState < string | null > (null);

    const [formData, setFormData] = useState < MachineFormData > ({
        name: "",
        internal_code: "",
        serial_number: "",
        brand: "",
        model: "",
        category: "",
        lifecycle_state: "active",
        position: "",
        commissioned_at: "",
        specifications: "",
        notes: "",
        plant_id: "",
        production_line_id: "",
        year_of_manufacture: "",
    });

    useEffect(() => {
        if (!router.isReady || !id || typeof id !== "string") return;

        const load = async () => {
            setLoading(true);
            setErrorMessage(null);

            try {
                const ctx = await getUserContext();

                if (!ctx?.orgId || !ctx?.orgType) {
                    router.replace("/settings/organization");
                    return;
                }

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType as OrgType);

                const { data: machineRow, error: machineError } = await supabase
                    .from("machines")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();

                if (machineError) throw machineError;
                if (!machineRow) {
                    router.replace("/equipment");
                    return;
                }

                const currentMachine = machineRow as Machine;
                setMachine(currentMachine);

                const [plantsRes, linesRes] = await Promise.all([
                    supabase
                        .from("plants")
                        .select("id, name, code")
                        .order("name", { ascending: true }),
                    supabase
                        .from("production_lines")
                        .select("id, name, code, plant_id")
                        .order("name", { ascending: true }),
                ]);

                if (plantsRes.error) throw plantsRes.error;
                if (linesRes.error) throw linesRes.error;

                const plantsData = (plantsRes.data ?? []) as PlantRow[];
                const linesData = (linesRes.data ?? []) as LineRow[];

                setPlants(plantsData);
                setLines(linesData);

                const currentPlantId = currentMachine.plant_id ?? "";
                const filteredLines = currentPlantId
                    ? linesData.filter((line) => line.plant_id === currentPlantId)
                    : linesData;

                setAvailableLines(filteredLines);

                setFormData({
                    name: currentMachine.name ?? "",
                    internal_code: currentMachine.internal_code ?? "",
                    serial_number: currentMachine.serial_number ?? "",
                    brand: currentMachine.brand ?? "",
                    model: currentMachine.model ?? "",
                    category: currentMachine.category ?? "",
                    lifecycle_state: currentMachine.lifecycle_state ?? "active",
                    position: currentMachine.position ?? "",
                    commissioned_at: currentMachine.commissioned_at
                        ? currentMachine.commissioned_at.slice(0, 10)
                        : "",
                    specifications: parseSpecificationsToText(currentMachine.specifications),
                    notes: currentMachine.notes ?? "",
                    plant_id: currentMachine.plant_id ?? "",
                    production_line_id: currentMachine.production_line_id ?? "",
                    year_of_manufacture: currentMachine.year_of_manufacture
                        ? String(currentMachine.year_of_manufacture)
                        : "",
                });
            } catch (error: any) {
                console.error("Equipment edit load error:", error);
                setErrorMessage(error?.message ?? "Errore nel caricamento della macchina");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router.isReady, id, router]);

    useEffect(() => {
        if (!formData.plant_id) {
            setAvailableLines(lines);
            return;
        }

        const filtered = lines.filter((line) => line.plant_id === formData.plant_id);
        setAvailableLines(filtered);

        if (
            formData.production_line_id &&
            !filtered.some((line) => line.id === formData.production_line_id)
        ) {
            setFormData((prev) => ({
                ...prev,
                production_line_id: "",
            }));
        }
    }, [formData.plant_id, formData.production_line_id, lines]);

    const canEdit = useMemo(() => {
        if (!machine || !orgId || !orgType) return false;

        const elevated = userRole === "admin" || userRole === "supervisor";

        if (orgType === "manufacturer") {
            return elevated && machine.organization_id === orgId;
        }

        if (orgType === "customer") {
            return machine.organization_id === orgId && (elevated || userRole === "technician");
        }

        return false;
    }, [machine, orgId, orgType, userRole]);

    const status =
        statusConfig[formData.lifecycle_state || "active"] ?? statusConfig.active;

    const handleChange = (
        field: keyof MachineFormData,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        if (!machine || !orgId || !canEdit) return;

        setSaving(true);
        setErrorMessage(null);

        try {
            const oldMachine = structuredClone(machine);

            const payload = {
                name: formData.name.trim(),
                internal_code: formData.internal_code.trim() || null,
                serial_number: formData.serial_number.trim() || null,
                brand: formData.brand.trim() || null,
                model: formData.model.trim() || null,
                category: formData.category.trim() || null,
                lifecycle_state: formData.lifecycle_state || null,
                position: formData.position.trim() || null,
                commissioned_at: formData.commissioned_at || null,
                specifications: buildSpecificationsValue(formData.specifications),
                notes: formData.notes.trim() || null,
                plant_id: formData.plant_id || null,
                production_line_id: formData.production_line_id || null,
                year_of_manufacture: formData.year_of_manufacture
                    ? Number(formData.year_of_manufacture)
                    : null,
            };

            const { error } = await supabase
                .from("machines")
                .update(payload)
                .eq("id", machine.id);

            if (error) throw error;

            const updatedMachine: Machine = {
                ...oldMachine,
                ...payload,
            };

            setMachine(updatedMachine);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            await createAuditLog({
                organizationId: orgId,
                actorUserId: user?.id ?? null,
                entityType: "machine",
                entityId: machine.id,
                action: "update",
                machineId: machine.id,
                oldData: oldMachine,
                newData: updatedMachine,
                metadata: {
                    source: "equipment/edit",
                    changes: diffObjects(oldMachine as any, updatedMachine as any),
                },
            });

            router.push(`/equipment/${machine.id}`);
        } catch (error: any) {
            console.error("Machine save error:", error);
            setErrorMessage(error?.message ?? "Errore durante il salvataggio");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={userRole}>
                <SEO title="Modifica macchina - MACHINA" />
                <div className="container mx-auto py-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!machine) {
        return (
            <MainLayout userRole={userRole}>
                <SEO title="Modifica macchina - MACHINA" />
                <div className="container mx-auto py-6 text-center">
                    <p className="text-red-500 text-lg">Macchina non trovata</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push("/equipment")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna alla lista
                    </Button>
                </div>
            </MainLayout>
        );
    }

    if (!canEdit) {
        return (
            <MainLayout userRole={userRole}>
                <SEO title="Modifica macchina - MACHINA" />
                <div className="container mx-auto py-6 max-w-3xl">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardContent className="p-8 text-center space-y-4">
                            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">
                                    Non hai i permessi per modificare questa macchina
                                </h2>
                                <p className="text-muted-foreground mt-2">
                                    Puoi visualizzare la scheda, ma non modificare i dati.
                                </p>
                            </div>
                            <div className="flex justify-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/equipment/${machine.id}`)}
                                >
                                    Torna al dettaglio
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={userRole}>
            <SEO title={`Modifica ${machine.name} - MACHINA`} />

            <div className="container mx-auto py-6 space-y-6 max-w-5xl">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/equipment/${machine.id}`)}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>

                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold text-foreground">
                                    Modifica macchina
                                </h1>
                                <Badge className={status.className}>{status.label}</Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mt-1">
                                {machine.name} • {machine.internal_code || machine.serial_number || "—"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/equipment/${machine.id}`)}
                        >
                            Annulla
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !formData.name.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Salva modifiche
                        </Button>
                    </div>
                </div>

                {errorMessage && (
                    <Card className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-500/10 shadow-sm">
                        <CardContent className="p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-700 dark:text-red-400">
                                    Errore
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-300">
                                    {errorMessage}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-primary" />
                            Informazioni Generali
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome macchina *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Es. Trituratore TSS 200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="internal_code">Codice interno</Label>
                            <Input
                                id="internal_code"
                                value={formData.internal_code}
                                onChange={(e) => handleChange("internal_code", e.target.value)}
                                placeholder="Es. EQ-001"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serial_number">Numero seriale</Label>
                            <Input
                                id="serial_number"
                                value={formData.serial_number}
                                onChange={(e) => handleChange("serial_number", e.target.value)}
                                placeholder="Es. SN-2026-001"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Marca</Label>
                            <Input
                                id="brand"
                                value={formData.brand}
                                onChange={(e) => handleChange("brand", e.target.value)}
                                placeholder="Es. ITR"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="model">Modello</Label>
                            <Input
                                id="model"
                                value={formData.model}
                                onChange={(e) => handleChange("model", e.target.value)}
                                placeholder="Es. HMS 140"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => handleChange("category", e.target.value)}
                                placeholder="Es. Shredder"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lifecycle_state">Stato</Label>
                            <select
                                id="lifecycle_state"
                                value={formData.lifecycle_state}
                                onChange={(e) => handleChange("lifecycle_state", e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="active">Attivo</option>
                                <option value="commissioning">Commissioning</option>
                                <option value="maintenance">In manutenzione</option>
                                <option value="inactive">Inattivo</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="year_of_manufacture">Anno di fabbricazione</Label>
                            <Input
                                id="year_of_manufacture"
                                type="number"
                                value={formData.year_of_manufacture}
                                onChange={(e) => handleChange("year_of_manufacture", e.target.value)}
                                placeholder="Es. 2024"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Ubicazione e impianto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="plant_id">Stabilimento</Label>
                            <select
                                id="plant_id"
                                value={formData.plant_id}
                                onChange={(e) => handleChange("plant_id", e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Non assegnato</option>
                                {plants.map((plant) => (
                                    <option key={plant.id} value={plant.id}>
                                        {plant.name || plant.code || plant.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="production_line_id">Linea produttiva</Label>
                            <select
                                id="production_line_id"
                                value={formData.production_line_id}
                                onChange={(e) =>
                                    handleChange("production_line_id", e.target.value)
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Non assegnata</option>
                                {availableLines.map((line) => (
                                    <option key={line.id} value={line.id}>
                                        {line.name || line.code || line.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="position">Posizione</Label>
                            <Input
                                id="position"
                                value={formData.position}
                                onChange={(e) => handleChange("position", e.target.value)}
                                placeholder="Es. Area triturazione lato nord"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Date e riferimenti
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="commissioned_at">Data commissioning</Label>
                            <Input
                                id="commissioned_at"
                                type="date"
                                value={formData.commissioned_at}
                                onChange={(e) => handleChange("commissioned_at", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Tag className="w-5 h-5 text-primary" />
                            Specifiche e note
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="specifications">Specifiche tecniche</Label>
                            <Textarea
                                id="specifications"
                                value={formData.specifications}
                                onChange={(e) => handleChange("specifications", e.target.value)}
                                placeholder='Testo libero oppure JSON, ad esempio: {"power_kw": 315, "rotor": "heavy duty"}'
                                className="min-h-[180px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Note</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                placeholder="Annotazioni operative, installazione, accessi, vincoli..."
                                className="min-h-[140px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Hash className="w-5 h-5 text-primary" />
                            Riepilogo salvataggio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Wrench className="w-4 h-4" />
                            <span>Entità: macchina</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>ID macchina: {machine.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Factory className="w-4 h-4" />
                            <span>Organizzazione: {orgId ?? "—"}</span>
                        </div>
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4">
                            <p className="text-blue-700 dark:text-blue-300 font-medium">
                                Audit attivo
                            </p>
                            <p className="text-blue-600 dark:text-blue-400 mt-1">
                                Al salvataggio verranno registrati stato precedente, stato nuovo e
                                differenze campo per campo.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pb-8">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/equipment/${machine.id}`)}
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !formData.name.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Salva modifiche
                    </Button>
                </div>
            </div>
        </MainLayout>
    );
}