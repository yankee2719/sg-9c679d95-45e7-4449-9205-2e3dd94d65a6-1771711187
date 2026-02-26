// src/pages/equipment/new.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { ArrowLeft, Save } from "lucide-react";

type OrgType = "manufacturer" | "customer";

type CustomerOrg = { id: string; name: string };
type Plant = { id: string; name?: string | null; code?: string | null };
type ProductionLine = { id: string; name?: string | null; code?: string | null; plant_id: string };

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

export default function NewEquipmentPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const isManufacturer = orgType === "manufacturer";

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

    const canCreate = useMemo(() => userRole === "admin" || userRole === "supervisor", [userRole]);

    useEffect(() => {
        setMounted(true);

        const init = async () => {
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

                // === HARDENING orgType (DB truth, no random ctx) ===
                let resolvedType = ctx.orgType as OrgType | null;

                if (!resolvedType && effectiveOrgId) {
                    resolvedType = await getOrgTypeById(effectiveOrgId);
                }

                // HARD FAIL (fondamentale)
                if (!resolvedType) {
                    throw new Error("orgType non risolto - RLS o context errato");
                }

                setOrgType(resolvedType);

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
                } else {
                    // load plants (RLS will filter)
                    const { data, error } = await supabase
                        .from("plants")
                        .select("id,name,code")
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setPlants((data ?? []) as any);
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e.message ?? "Errore caricamento",
                    variant: "destructive",
                });
                router.push("/equipment");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router, toast]);

    useEffect(() => {
        if (!mounted) return;
        if (isManufacturer) return;

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
                toast({
                    title: "Errore",
                    description: e.message ?? "Errore caricamento linee",
                    variant: "destructive",
                });
                setLines([]);
                setSelectedLineId("");
            } finally {
                setLoadingLines(false);
            }
        };

        loadLines();
    }, [selectedPlantId, isManufacturer, mounted, toast]);

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
            toast({
                title: "Errore",
                description: "Inserisci un nome per la macchina/attrezzatura",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({ title: "Errore", description: "Organization non trovata.", variant: "destructive" });
            return;
        }

        if (isManufacturer && !selectedCustomerId) {
            toast({ title: "Errore", description: "Seleziona un cliente", variant: "destructive" });
            return;
        }

        if (!isManufacturer && !selectedPlantId) {
            toast({ title: "Errore", description: "Seleziona uno stabilimento", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                organization_id: orgId,
                name: name.trim(),
                internal_code: internalCode.trim() || null,
                serial_number: serialNumber.trim() || null,
                notes: notes.trim() || null,
                is_archived: false,
                plant_id: isManufacturer ? null : selectedPlantId,
                production_line_id: isManufacturer ? null : selectedLineId || null,
            };

            const { data: machine, error } = await supabase
                .from("machines")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            // Manufacturer: link machine to customer
            if (isManufacturer && machine?.id) {
                const { error: assignError } = await supabase.from("machine_assignments").insert({
                    machine_id: machine.id,
                    customer_org_id: selectedCustomerId,
                    manufacturer_org_id: orgId,
                    assigned_at: new Date().toISOString(),
                    is_active: true,
                });

                if (assignError) {
                    // non-fatal, ma te lo mostro
                    console.error("Assignment error:", assignError);
                    toast({
                        title: "Creato (ma non assegnato)",
                        description: "Macchina creata, ma errore nell’assegnazione al cliente.",
                        variant: "destructive",
                    });
                    router.push("/equipment");
                    return;
                }
            }

            toast({ title: "OK", description: "Attrezzatura creata" });
            router.push("/equipment");
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore salvataggio",
                description: e.message ?? "Errore creazione macchina",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (!mounted || loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Nuova attrezzatura - MACHINA" />

            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground">Nuova attrezzatura</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {isManufacturer
                                ? "Seleziona il cliente a cui assegnare l'attrezzatura"
                                : "Seleziona lo stabilimento e, se serve, la linea (opzionale)"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        {isManufacturer ? (
                            <div className="space-y-2">
                                <Label>Cliente *</Label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className="w-full border border-border bg-background rounded-md px-3 py-2"
                                >
                                    <option value="">— Seleziona cliente —</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>

                                {customers.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Nessun cliente trovato. Crea prima un cliente.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Stabilimento *</Label>
                                    <select
                                        value={selectedPlantId}
                                        onChange={(e) => setSelectedPlantId(e.target.value)}
                                        className="w-full border border-border bg-background rounded-md px-3 py-2"
                                    >
                                        <option value="">— Seleziona —</option>
                                        {plants.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name ?? p.code ?? p.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Linea (opzionale)</Label>
                                    <select
                                        value={selectedLineId}
                                        onChange={(e) => setSelectedLineId(e.target.value)}
                                        disabled={!selectedPlantId || loadingLines}
                                        className="w-full border border-border bg-background rounded-md px-3 py-2 disabled:opacity-60"
                                    >
                                        <option value="">— Nessuna —</option>
                                        {lines.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.name ?? l.code ?? l.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Pressa B1" />
                            </div>
                            <div className="space-y-2">
                                <Label>Codice interno</Label>
                                <Input value={internalCode} onChange={(e) => setInternalCode(e.target.value)} placeholder="es. PRS-B1" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Matricola</Label>
                                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="es. SN-12345" />
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