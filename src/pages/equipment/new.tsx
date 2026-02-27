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
import { ArrowLeft, Save, Factory, Building2 } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type OrgType = "manufacturer" | "customer";
type CustomerOrg = { id: string; name: string };
type Plant = { id: string; name?: string | null; code?: string | null };
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
        .maybeSingle();

    if (error) throw error;

    const t = String((data as any)?.type ?? "").toLowerCase();
    if (t === "manufacturer") return "manufacturer";
    if (t === "customer") return "customer";
    return null;
}

export default function NewEquipmentPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const canCreate = useMemo(
        () => userRole === "admin" || userRole === "supervisor",
        [userRole]
    );

    // Common fields
    const [name, setName] = useState("");
    const [internalCode, setInternalCode] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [notes, setNotes] = useState("");

    // Manufacturer: select customer
    const [customers, setCustomers] = useState < CustomerOrg[] > ([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState < string > ("");

    // Customer: select plant + line
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [selectedPlantId, setSelectedPlantId] = useState < string > ("");
    const [lines, setLines] = useState < ProductionLine[] > ([]);
    const [selectedLineId, setSelectedLineId] = useState < string > ("");
    const [loadingLines, setLoadingLines] = useState(false);

    // =========================
    // INIT (HARD GUARDED)
    // =========================
    useEffect(() => {
        setMounted(true);

        const init = async () => {
            setPageLoading(true);
            try {
                const ctx: any = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setUserRole(ctx.role ?? "technician");

                const effectiveOrgId =
                    ctx.orgId || ctx.organizationId || ctx.organization_id || ctx.tenant_id || null;

                if (!effectiveOrgId) throw new Error("Organization non trovata nel contesto utente.");
                setOrgId(effectiveOrgId);

                // ✅ DB-TRUTH ALWAYS (ignore ctx.orgType completely)
                const resolvedType = await getOrgTypeById(effectiveOrgId);

                // ✅ HARD FAIL (no UI random)
                if (!resolvedType) {
                    throw new Error("orgType non risolto - RLS o organizations.type errato");
                }

                setOrgType(resolvedType);

                // Reset UI state to avoid “ghost” values between modes
                setSelectedCustomerId("");
                setSelectedPlantId("");
                setSelectedLineId("");
                setLines([]);

                if (resolvedType === "manufacturer") {
                    // load customers of this manufacturer
                    const { data, error } = await supabase
                        .from("organizations")
                        .select("id,name")
                        .eq("manufacturer_org_id", effectiveOrgId)
                        .eq("type", "customer")
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setCustomers((data ?? []) as any);

                    // IMPORTANT: clear plants for safety
                    setPlants([]);
                } else {
                    // load plants
                    const { data, error } = await supabase
                        .from("plants")
                        .select("id,name,code")
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setPlants((data ?? []) as any);

                    // IMPORTANT: clear customers for safety
                    setCustomers([]);
                }

                // Debug (useful to verify refresh behaviour)
                // eslint-disable-next-line no-console
                console.log("[EQUIPMENT NEW] orgType=", resolvedType, "orgId=", effectiveOrgId, "role=", ctx.role);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento",
                    variant: "destructive",
                });
                router.push("/equipment");
            } finally {
                setPageLoading(false);
            }
        };

        init();
    }, [router, toast]);

    // =========================
    // LOAD LINES (customer only)
    // =========================
    useEffect(() => {
        if (!mounted) return;
        if (orgType !== "customer") return;

        const loadLines = async () => {
            if (!selectedPlantId) {
                setLines([]);
                setSelectedLineId("");
                return;
            }

            setLoadingLines(true);
            try {
                const { data, error } = await supabase
                    .from("production_lines")
                    .select("id,name,code,plant_id")
                    .eq("plant_id", selectedPlantId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true });

                if (error) throw error;
                setLines((data ?? []) as any);
                setSelectedLineId("");
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento linee",
                    variant: "destructive",
                });
                setLines([]);
                setSelectedLineId("");
            } finally {
                setLoadingLines(false);
            }
        };

        loadLines();
    }, [mounted, orgType, selectedPlantId, toast]);

    // =========================
    // SAVE
    // =========================
    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono creare attrezzature.",
                variant: "destructive",
            });
            return;
        }

        if (!name.trim()) {
            toast({ title: "Errore", description: "Inserisci un nome", variant: "destructive" });
            return;
        }

        if (!orgId) {
            toast({ title: "Errore", description: "Organization non trovata.", variant: "destructive" });
            return;
        }

        if (!orgType) {
            toast({ title: "Errore", description: "orgType non risolto.", variant: "destructive" });
            return;
        }

        if (orgType === "manufacturer" && !selectedCustomerId) {
            toast({ title: "Errore", description: "Seleziona un cliente", variant: "destructive" });
            return;
        }

        if (orgType === "customer" && !selectedPlantId) {
            toast({ title: "Errore", description: "Seleziona uno stabilimento", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            // Insert machine (organization_id ALWAYS = current org)
            const payload: any = {
                organization_id: orgId,
                name: name.trim(),
                internal_code: internalCode.trim() || null,
                serial_number: serialNumber.trim() || null,
                notes: notes.trim() || null,
                is_archived: false,
                plant_id: orgType === "customer" ? selectedPlantId : null,
                production_line_id: orgType === "customer" ? (selectedLineId || null) : null,
            };

            const { data: machine, error } = await supabase
                .from("machines")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            // Manufacturer: create assignment to customer
            if (orgType === "manufacturer" && machine?.id) {
                const { error: assignError } = await supabase.from("machine_assignments").insert({
                    machine_id: machine.id,
                    customer_org_id: selectedCustomerId,
                    manufacturer_org_id: orgId,
                    assigned_at: new Date().toISOString(),
                    is_active: true,
                });

                if (assignError) throw assignError;
            }

            toast({ title: "OK", description: "Attrezzatura creata" });
            router.push("/equipment");
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore salvataggio",
                description: e?.message ?? "Errore creazione macchina",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    // ✅ HARD GUARD RENDER (no flash wrong UI)
    if (!mounted || pageLoading || !orgType) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Nuova attrezzatura - MACHINA" />

            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <p className="text-xs text-red-500">DEBUG ROUTE: pages/equipment/new.tsx</p>

                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground">Nuova attrezzatura</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {orgType === "manufacturer"
                                ? "Seleziona il cliente a cui assegnare l'attrezzatura"
                                : "Seleziona lo stabilimento e, se serve, la linea (opzionale)"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Org-specific selector */}
                        {orgType === "manufacturer" ? (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Factory className="w-4 h-4 text-purple-400" />
                                    Cliente *
                                </Label>

                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Seleziona cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {customers.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Nessun cliente trovato. Crea prima un cliente (organizations type=customer,
                                        manufacturer_org_id = la tua org).
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-400" />
                                        Stabilimento *
                                    </Label>

                                    <Select value={selectedPlantId} onValueChange={(v) => setSelectedPlantId(v)}>
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue placeholder="Seleziona stabilimento..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plants.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name ?? p.code ?? p.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Linea (opzionale)</Label>

                                    <Select
                                        value={selectedLineId}
                                        onValueChange={(v) => setSelectedLineId(v)}
                                        disabled={!selectedPlantId || loadingLines}
                                    >
                                        <SelectTrigger className="bg-muted border-border text-foreground disabled:opacity-60">
                                            <SelectValue
                                                placeholder={
                                                    !selectedPlantId ? "Seleziona prima lo stabilimento" : "Seleziona linea..."
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nessuna</SelectItem>
                                            {lines.map((l) => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.name ?? l.code ?? l.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Common fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Pressa B1" />
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
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Note..." />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : "Salva"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}