// src/pages/equipment/new.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
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
import { getUserContext } from "@/lib/supabaseHelpers";
import { ArrowLeft, Save, Factory, Building2, Cpu } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type OrgType = "manufacturer" | "customer";

type CustomerOrg = {
    id: string;
    name: string;
};

type Plant = {
    id: string;
    name?: string | null;
    code?: string | null;
};

type ProductionLine = {
    id: string;
    name?: string | null;
    code?: string | null;
    plant_id: string;
};

async function getOrgTypeById(orgId: string): Promise<OrgType | null> {
    const { data, error } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", orgId)
        .single();

    if (error) throw error;

    const t = String((data as any)?.type ?? "").toLowerCase();
    if (t === "manufacturer") return "manufacturer";
    if (t === "customer") return "customer";
    return null;
}

export default function NewMachinePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const canCreate = useMemo(() => {
        return userRole === "admin" || userRole === "supervisor";
    }, [userRole]);

    // Common machine fields
    const [name, setName] = useState("");
    const [internalCode, setInternalCode] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [notes, setNotes] = useState("");

    // Manufacturer flow
    const [customers, setCustomers] = useState < CustomerOrg[] > ([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState < string > ("none");

    // Customer flow
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [selectedPlantId, setSelectedPlantId] = useState < string > ("");
    const [lines, setLines] = useState < ProductionLine[] > ([]);
    const [selectedLineId, setSelectedLineId] = useState < string > ("none");
    const [loadingLines, setLoadingLines] = useState(false);

    useEffect(() => {
        setMounted(true);

        const init = async () => {
            setPageLoading(true);

            try {
                const ctx = await getUserContext();

                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setUserRole(ctx.role ?? "technician");

                const effectiveOrgId = ctx.orgId ?? null;
                if (!effectiveOrgId) {
                    throw new Error("Organizzazione attiva non trovata nel contesto utente.");
                }

                setOrgId(effectiveOrgId);

                const resolvedType = await getOrgTypeById(effectiveOrgId);
                if (!resolvedType) {
                    throw new Error("orgType non risolto da organizations.type.");
                }

                setOrgType(resolvedType);

                // reset state
                setSelectedCustomerId("none");
                setSelectedPlantId("");
                setSelectedLineId("none");
                setLines([]);
                setCustomers([]);
                setPlants([]);

                if (resolvedType === "manufacturer") {
                    const { data, error } = await supabase
                        .from("organizations")
                        .select("id, name")
                        .eq("manufacturer_org_id", effectiveOrgId)
                        .eq("type", "customer")
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setCustomers((data ?? []) as CustomerOrg[]);
                }

                if (resolvedType === "customer") {
                    const { data, error } = await supabase
                        .from("plants")
                        .select("id, name, code")
                        .eq("organization_id", effectiveOrgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setPlants((data ?? []) as Plant[]);
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento pagina",
                    variant: "destructive",
                });
                router.push("/equipment");
            } finally {
                setPageLoading(false);
            }
        };

        init();
    }, [router, toast]);

    useEffect(() => {
        if (!mounted) return;
        if (orgType !== "customer") return;

        const loadLines = async () => {
            if (!selectedPlantId) {
                setLines([]);
                setSelectedLineId("none");
                return;
            }

            setLoadingLines(true);

            try {
                const { data, error } = await supabase
                    .from("production_lines")
                    .select("id, name, code, plant_id")
                    .eq("plant_id", selectedPlantId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true });

                if (error) throw error;

                setLines((data ?? []) as ProductionLine[]);
                setSelectedLineId("none");
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento linee",
                    variant: "destructive",
                });
                setLines([]);
                setSelectedLineId("none");
            } finally {
                setLoadingLines(false);
            }
        };

        loadLines();
    }, [mounted, orgType, selectedPlantId, toast]);

    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin e Supervisor possono creare macchine.",
                variant: "destructive",
            });
            return;
        }

        if (!name.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci il nome della macchina.",
                variant: "destructive",
            });
            return;
        }

        if (!orgId || !orgType) {
            toast({
                title: "Errore",
                description: "Contesto organizzativo non valido.",
                variant: "destructive",
            });
            return;
        }

        if (orgType === "customer" && !selectedPlantId) {
            toast({
                title: "Errore",
                description: "Per il cliente finale lo stabilimento è obbligatorio.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const isManufacturerFlow = orgType === "manufacturer";
            const hasSelectedCustomer =
                isManufacturerFlow &&
                selectedCustomerId !== "none" &&
                !!selectedCustomerId;

            // Regola dominio:
            // - manufacturer + customer selezionato => owner = customer
            // - manufacturer senza customer => owner = manufacturer
            // - customer => owner = customer stesso
            const machineOwnerOrgId =
                isManufacturerFlow
                    ? hasSelectedCustomer
                        ? selectedCustomerId
                        : orgId
                    : orgId;

            const payload: any = {
                organization_id: machineOwnerOrgId,
                name: name.trim(),
                internal_code: internalCode.trim() || null,
                serial_number: serialNumber.trim() || null,
                notes: notes.trim() || null,
                is_archived: false,

                // solo il customer setta stabilimento/linea in creazione
                plant_id: orgType === "customer" ? selectedPlantId : null,
                production_line_id:
                    orgType === "customer"
                        ? selectedLineId === "none"
                            ? null
                            : selectedLineId
                        : null,
            };

            const { data: machine, error: machineError } = await supabase
                .from("machines")
                .insert(payload)
                .select("id")
                .single();

            if (machineError) throw machineError;

            // Se manufacturer crea per un customer:
            // crea anche l'assegnazione manufacturer -> customer
            if (isManufacturerFlow && hasSelectedCustomer && machine?.id) {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                const { error: assignmentError } = await supabase
                    .from("machine_assignments")
                    .insert({
                        machine_id: machine.id,
                        manufacturer_org_id: orgId,
                        customer_org_id: selectedCustomerId,
                        assigned_at: new Date().toISOString(),
                        assigned_by: user?.id ?? null,
                        is_active: true,
                    });

                if (assignmentError) throw assignmentError;
            }

            toast({
                title: "OK",
                description:
                    isManufacturerFlow && hasSelectedCustomer
                        ? "Macchina creata e assegnata al cliente."
                        : isManufacturerFlow
                            ? "Macchina creata come non assegnata."
                            : "Macchina creata correttamente.",
            });

            router.push("/equipment");
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore salvataggio",
                description: e?.message ?? "Errore durante la creazione della macchina.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (!mounted || pageLoading || !orgType) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Nuova macchina - MACHINA" />

            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Cpu className="w-5 h-5" />
                            Nuova macchina
                        </CardTitle>

                        <CardDescription className="text-muted-foreground">
                            {orgType === "manufacturer"
                                ? "Il costruttore può creare una macchina non assegnata oppure collegarla subito a un cliente finale."
                                : "Il cliente finale crea la macchina nel proprio contesto operativo, associandola a uno stabilimento e opzionalmente a una linea."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {orgType === "manufacturer" ? (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Factory className="w-4 h-4 text-purple-400" />
                                    Cliente finale (opzionale)
                                </Label>

                                <Select
                                    value={selectedCustomerId}
                                    onValueChange={setSelectedCustomerId}
                                >
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona cliente oppure lascia non assegnata" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Non assegnare ora
                                        </SelectItem>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <p className="text-xs text-muted-foreground">
                                    Se selezioni un cliente, la macchina nascerà già sotto il suo
                                    ownership operativo e verrà creata anche la relazione di
                                    assignment con il costruttore.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-400" />
                                        Stabilimento *
                                    </Label>

                                    <Select
                                        value={selectedPlantId}
                                        onValueChange={setSelectedPlantId}
                                    >
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue placeholder="Seleziona stabilimento..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plants.map((plant) => (
                                                <SelectItem key={plant.id} value={plant.id}>
                                                    {plant.name ?? plant.code ?? plant.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Linea (opzionale)</Label>
                                    <Select
                                        value={selectedLineId}
                                        onValueChange={setSelectedLineId}
                                        disabled={!selectedPlantId || loadingLines}
                                    >
                                        <SelectTrigger className="bg-muted border-border text-foreground disabled:opacity-60">
                                            <SelectValue
                                                placeholder={
                                                    !selectedPlantId
                                                        ? "Seleziona prima lo stabilimento"
                                                        : "Seleziona linea..."
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nessuna</SelectItem>
                                            {lines.map((line) => (
                                                <SelectItem key={line.id} value={line.id}>
                                                    {line.name ?? line.code ?? line.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome macchina *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="es. Pressa B1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Codice interno</Label>
                                <Input
                                    value={internalCode}
                                    onChange={(e) => setInternalCode(e.target.value)}
                                    placeholder="es. PRS-B1"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Matricola</Label>
                                <Input
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    placeholder="es. SN-12345"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Note</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Note tecniche o operative..."
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
                                {saving ? "Salvataggio..." : "Salva macchina"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}