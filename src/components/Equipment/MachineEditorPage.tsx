import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Factory,
    GitBranch,
    Loader2,
    MapPin,
    Save,
    Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OrgType = "manufacturer" | "customer" | null;

interface MachineEditorPageProps {
    mode: "create" | "edit";
    machineId?: string | null;
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
    plant_id: string | null;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    notes: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    is_archived?: boolean | null;
    is_deleted?: boolean | null;
}

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

const copy = {
    it: {
        createTitle: "Nuova macchina",
        editTitle: "Modifica macchina",
        createSubtitle:
            "Inserisci i dati principali della macchina nel contesto organizzativo attivo.",
        editSubtitle:
            "Aggiorna i dati principali della macchina nel contesto organizzativo attivo.",
        back: "Torna a Macchine",
        saveCreate: "Crea macchina",
        saveEdit: "Salva modifiche",
        loading: "Caricamento dati macchina...",
        forbidden:
            "Questa pagina è disponibile solo nel contesto corretto della macchina attiva.",
        errorTitle: "Errore",
        requiredName: "Il nome macchina è obbligatorio.",
        mainData: "Dati principali",
        organizationContext: "Contesto organizzativo",
        locationContext: "Posizionamento impianto",
        name: "Nome macchina *",
        internalCode: "Codice interno",
        serialNumber: "Matricola",
        brand: "Marca",
        model: "Modello",
        lifecycle: "Stato macchina",
        notes: "Note",
        manufacturerContext: "Contesto costruttore",
        customerContext: "Contesto cliente finale",
        ownerOrg: "Organizzazione attiva",
        plant: "Stabilimento",
        line: "Linea (opzionale)",
        noPlant: "Nessuno",
        noLine: "Nessuna",
        noPlantsAvailable:
            "Non risultano stabilimenti nel contesto attivo. Puoi comunque salvare la macchina senza assegnazione a stabilimento.",
        createPlantsCta: "Apri stabilimenti",
        createSuccess: "Macchina creata",
        updateSuccess: "Macchina aggiornata",
        genericError: "Errore durante il salvataggio della macchina",
        placeholderName: "Es. HMS 140",
        placeholderInternalCode: "Es. HM-001",
        placeholderSerial: "Es. SN-2026-001",
        placeholderBrand: "Es. ITR",
        placeholderModel: "Es. TSS 180",
        placeholderNotes: "Note operative, configurazione, contesto...",
        lifecycleActive: "Attiva",
        lifecycleInactive: "Inattiva",
        lifecycleMaintenance: "In manutenzione",
        lifecycleCommissioning: "In commissioning",
        lifecycleDecommissioned: "Dismessa",
    },
    en: {
        createTitle: "New machine",
        editTitle: "Edit machine",
        createSubtitle:
            "Enter the main machine data in the active organization context.",
        editSubtitle:
            "Update the main machine data in the active organization context.",
        back: "Back to Machines",
        saveCreate: "Create machine",
        saveEdit: "Save changes",
        loading: "Loading machine data...",
        forbidden:
            "This page is only available in the correct active machine context.",
        errorTitle: "Error",
        requiredName: "Machine name is required.",
        mainData: "Main data",
        organizationContext: "Organizational context",
        locationContext: "Plant location",
        name: "Machine name *",
        internalCode: "Internal code",
        serialNumber: "Serial number",
        brand: "Brand",
        model: "Model",
        lifecycle: "Machine status",
        notes: "Notes",
        manufacturerContext: "Manufacturer context",
        customerContext: "End-customer context",
        ownerOrg: "Active organization",
        plant: "Plant",
        line: "Line (optional)",
        noPlant: "None",
        noLine: "None",
        noPlantsAvailable:
            "No plants found in the active context. You can still save the machine without a plant assignment.",
        createPlantsCta: "Open plants",
        createSuccess: "Machine created",
        updateSuccess: "Machine updated",
        genericError: "Error while saving machine",
        placeholderName: "e.g. HMS 140",
        placeholderInternalCode: "e.g. HM-001",
        placeholderSerial: "e.g. SN-2026-001",
        placeholderBrand: "e.g. ITR",
        placeholderModel: "e.g. TSS 180",
        placeholderNotes: "Operational notes, configuration, context...",
        lifecycleActive: "Active",
        lifecycleInactive: "Inactive",
        lifecycleMaintenance: "Under maintenance",
        lifecycleCommissioning: "Commissioning",
        lifecycleDecommissioned: "Decommissioned",
    },
    fr: {
        createTitle: "Nouvelle machine",
        editTitle: "Modifier la machine",
        createSubtitle:
            "Saisissez les données principales de la machine dans le contexte actif.",
        editSubtitle:
            "Mettez à jour les données principales de la machine dans le contexte actif.",
        back: "Retour aux machines",
        saveCreate: "Créer la machine",
        saveEdit: "Enregistrer les modifications",
        loading: "Chargement des données de la machine...",
        forbidden:
            "Cette page est disponible uniquement dans le bon contexte actif de la machine.",
        errorTitle: "Erreur",
        requiredName: "Le nom de la machine est obligatoire.",
        mainData: "Données principales",
        organizationContext: "Contexte organisationnel",
        locationContext: "Emplacement usine",
        name: "Nom de la machine *",
        internalCode: "Code interne",
        serialNumber: "Numéro de série",
        brand: "Marque",
        model: "Modèle",
        lifecycle: "État de la machine",
        notes: "Notes",
        manufacturerContext: "Contexte constructeur",
        customerContext: "Contexte client final",
        ownerOrg: "Organisation active",
        plant: "Usine",
        line: "Ligne (optionnelle)",
        noPlant: "Aucune",
        noLine: "Aucune",
        noPlantsAvailable:
            "Aucune usine trouvée dans le contexte actif. Vous pouvez tout de même enregistrer la machine sans affectation.",
        createPlantsCta: "Ouvrir les usines",
        createSuccess: "Machine créée",
        updateSuccess: "Machine mise à jour",
        genericError: "Erreur lors de l’enregistrement de la machine",
        placeholderName: "Ex. HMS 140",
        placeholderInternalCode: "Ex. HM-001",
        placeholderSerial: "Ex. SN-2026-001",
        placeholderBrand: "Ex. ITR",
        placeholderModel: "Ex. TSS 180",
        placeholderNotes: "Notes opérationnelles, configuration, contexte...",
        lifecycleActive: "Active",
        lifecycleInactive: "Inactive",
        lifecycleMaintenance: "En maintenance",
        lifecycleCommissioning: "En mise en service",
        lifecycleDecommissioned: "Mise hors service",
    },
    es: {
        createTitle: "Nueva máquina",
        editTitle: "Editar máquina",
        createSubtitle:
            "Introduce los datos principales de la máquina en el contexto organizativo activo.",
        editSubtitle:
            "Actualiza los datos principales de la máquina en el contexto organizativo activo.",
        back: "Volver a Máquinas",
        saveCreate: "Crear máquina",
        saveEdit: "Guardar cambios",
        loading: "Cargando datos de la máquina...",
        forbidden:
            "Esta página solo está disponible en el contexto correcto de la máquina activa.",
        errorTitle: "Error",
        requiredName: "El nombre de la máquina es obligatorio.",
        mainData: "Datos principales",
        organizationContext: "Contexto organizativo",
        locationContext: "Ubicación en planta",
        name: "Nombre de la máquina *",
        internalCode: "Código interno",
        serialNumber: "Número de serie",
        brand: "Marca",
        model: "Modelo",
        lifecycle: "Estado de la máquina",
        notes: "Notas",
        manufacturerContext: "Contexto del fabricante",
        customerContext: "Contexto del cliente final",
        ownerOrg: "Organización activa",
        plant: "Planta",
        line: "Línea (opcional)",
        noPlant: "Ninguna",
        noLine: "Ninguna",
        noPlantsAvailable:
            "No se encontraron plantas en el contexto activo. Aun así puedes guardar la máquina sin asignarla a una planta.",
        createPlantsCta: "Abrir plantas",
        createSuccess: "Máquina creada",
        updateSuccess: "Máquina actualizada",
        genericError: "Error al guardar la máquina",
        placeholderName: "Ej. HMS 140",
        placeholderInternalCode: "Ej. HM-001",
        placeholderSerial: "Ej. SN-2026-001",
        placeholderBrand: "Ej. ITR",
        placeholderModel: "Ej. TSS 180",
        placeholderNotes: "Notas operativas, configuración, contexto...",
        lifecycleActive: "Activa",
        lifecycleInactive: "Inactiva",
        lifecycleMaintenance: "En mantenimiento",
        lifecycleCommissioning: "En puesta en marcha",
        lifecycleDecommissioned: "Retirada",
    },
} as const;

export default function MachineEditorPage({
    mode,
    machineId = null,
}: MachineEditorPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;

    const {
        loading: authLoading,
        organization,
        membership,
    } = useAuth();

    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [lines, setLines] = useState<LineRow[]>([]);
    const [form, setForm] = useState<FormState>({
        name: "",
        internal_code: "",
        serial_number: "",
        model: "",
        brand: "",
        lifecycle_state: "active",
        notes: "",
        plant_id: "",
        production_line_id: "",
    });

    const orgId = organization?.id ?? null;
    const orgName = organization?.name ?? "—";
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    const pageTitle = mode === "create" ? text.createTitle : text.editTitle;
    const pageSubtitle =
        mode === "create" ? text.createSubtitle : text.editSubtitle;

    const loadLines = async (plantId: string) => {
        if (!orgId || orgType !== "customer" || !plantId) {
            setLines([]);
            return;
        }

        const { data, error } = await supabase
            .from("production_lines")
            .select("id, name, code, plant_id")
            .eq("organization_id", orgId)
            .eq("plant_id", plantId)
            .order("name");

        if (error) {
            throw error;
        }

        setLines((data ?? []) as LineRow[]);
    };

    useEffect(() => {
        let active = true;

        const loadBaseData = async () => {
            if (authLoading) return;

            if (!orgId || !orgType || !canEdit) {
                if (active) setLoading(false);
                return;
            }

            try {
                if (orgType === "customer") {
                    const { data: plantsData, error: plantsError } = await supabase
                        .from("plants")
                        .select("id, name, code")
                        .eq("organization_id", orgId)
                        .order("name");

                    if (plantsError) throw plantsError;
                    if (active) setPlants((plantsData ?? []) as PlantRow[]);
                } else if (active) {
                    setPlants([]);
                    setLines([]);
                }

                if (mode === "edit" && machineId) {
                    const { data: machineData, error: machineError } = await supabase
                        .from("machines")
                        .select(
                            "id, name, internal_code, serial_number, model, brand, notes, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, is_deleted"
                        )
                        .eq("id", machineId)
                        .maybeSingle();

                    if (machineError) throw machineError;

                    const machine = machineData as MachineRow | null;

                    if (!machine || machine.organization_id !== orgId) {
                        void router.replace("/equipment");
                        return;
                    }

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

                    if (orgType === "customer" && machine.plant_id) {
                        await loadLines(machine.plant_id);
                    }
                }
            } catch (error) {
                console.error("Machine editor load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadBaseData();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType, machineId, mode, canEdit, router]);

    const handleField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handlePlantChange = async (plantId: string) => {
        setForm((prev) => ({
            ...prev,
            plant_id: plantId,
            production_line_id: "",
        }));

        try {
            await loadLines(plantId);
        } catch (error) {
            console.error("Load lines error:", error);
            setLines([]);
        }
    };

    const handleSave = async () => {
        if (!orgId || !orgType) return;

        if (!form.name.trim()) {
            toast({
                title: text.errorTitle,
                description: text.requiredName,
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const payload = {
                organization_id: orgId,
                name: form.name.trim(),
                internal_code: form.internal_code.trim() || null,
                serial_number: form.serial_number.trim() || null,
                model: form.model.trim() || null,
                brand: form.brand.trim() || null,
                lifecycle_state: form.lifecycle_state || "active",
                notes: form.notes.trim() || null,
                plant_id: orgType === "customer" ? form.plant_id || null : null,
                production_line_id:
                    orgType === "customer" ? form.production_line_id || null : null,
                updated_at: new Date().toISOString(),
            };

            if (mode === "create") {
                const { data, error } = await supabase
                    .from("machines")
                    .insert(payload)
                    .select("id")
                    .single();

                if (error) throw error;

                toast({
                    title: text.createSuccess,
                    description: form.name.trim(),
                });

                void router.push(`/equipment/${data.id}`);
            } else {
                const { error } = await supabase
                    .from("machines")
                    .update(payload)
                    .eq("id", machineId)
                    .eq("organization_id", orgId);

                if (error) throw error;

                toast({
                    title: text.updateSuccess,
                    description: form.name.trim(),
                });

                void router.push(`/equipment/${machineId}`);
            }
        } catch (error: any) {
            console.error("Machine save error:", error);
            toast({
                title: text.errorTitle,
                description: error?.message || text.genericError,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${pageTitle} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {text.loading}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!orgId || !orgType || !canEdit) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${pageTitle} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {text.forbidden}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href="/equipment">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{pageTitle}</h1>
                            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5" />
                                {text.mainData}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.name}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => handleField("name", e.target.value)}
                                    placeholder={text.placeholderName}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.internalCode}</Label>
                                <Input
                                    value={form.internal_code}
                                    onChange={(e) => handleField("internal_code", e.target.value)}
                                    placeholder={text.placeholderInternalCode}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.serialNumber}</Label>
                                <Input
                                    value={form.serial_number}
                                    onChange={(e) => handleField("serial_number", e.target.value)}
                                    placeholder={text.placeholderSerial}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.brand}</Label>
                                <Input
                                    value={form.brand}
                                    onChange={(e) => handleField("brand", e.target.value)}
                                    placeholder={text.placeholderBrand}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.model}</Label>
                                <Input
                                    value={form.model}
                                    onChange={(e) => handleField("model", e.target.value)}
                                    placeholder={text.placeholderModel}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.lifecycle}</Label>
                                <select
                                    value={form.lifecycle_state}
                                    onChange={(e) =>
                                        handleField("lifecycle_state", e.target.value)
                                    }
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="active">{text.lifecycleActive}</option>
                                    <option value="inactive">{text.lifecycleInactive}</option>
                                    <option value="under_maintenance">
                                        {text.lifecycleMaintenance}
                                    </option>
                                    <option value="commissioning">
                                        {text.lifecycleCommissioning}
                                    </option>
                                    <option value="decommissioned">
                                        {text.lifecycleDecommissioned}
                                    </option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.notes}</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={(e) => handleField("notes", e.target.value)}
                                    rows={4}
                                    placeholder={text.placeholderNotes}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {orgType === "manufacturer" ? (
                                    <Factory className="h-5 w-5" />
                                ) : (
                                    <Building2 className="h-5 w-5" />
                                )}
                                {text.organizationContext}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                <div className="text-sm text-muted-foreground">
                                    {orgType === "manufacturer"
                                        ? text.manufacturerContext
                                        : text.customerContext}
                                </div>
                                <div className="mt-1 font-semibold text-foreground">
                                    {text.ownerOrg}: {orgName}
                                </div>
                            </div>

                            {orgType === "customer" && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            {text.plant}
                                        </Label>
                                        <select
                                            value={form.plant_id}
                                            onChange={(e) => handlePlantChange(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="">{text.noPlant}</option>
                                            {plants.map((plant) => (
                                                <option key={plant.id} value={plant.id}>
                                                    {plant.name || plant.code || plant.id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <GitBranch className="h-4 w-4" />
                                            {text.line}
                                        </Label>
                                        <select
                                            value={form.production_line_id}
                                            onChange={(e) =>
                                                handleField("production_line_id", e.target.value)
                                            }
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="">{text.noLine}</option>
                                            {lines.map((line) => (
                                                <option key={line.id} value={line.id}>
                                                    {line.name || line.code || line.id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {plants.length === 0 && (
                                        <div className="md:col-span-2 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                            {text.noPlantsAvailable}{" "}
                                            <Link
                                                href="/plants"
                                                className="font-medium text-orange-500 hover:underline"
                                            >
                                                {text.createPlantsCta}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href="/equipment">
                            <Button variant="outline">{text.back}</Button>
                        </Link>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {mode === "create" ? text.saveCreate : text.saveEdit}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
