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
import { ArrowLeft, Save, Upload, X } from "lucide-react";

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

type UploadDraft = {
    id: string;
    file: File;
    title: string;
};

const STORAGE_BUCKET = "documents"; // ✅ se il bucket ha nome diverso dimmelo

function safeExt(filename: string) {
    const parts = filename.split(".");
    if (parts.length < 2) return "";
    return parts.pop()!.toLowerCase();
}

function guessFileType(file: File) {
    // per db "file_type" puoi usare mime oppure estensione
    return file.type || safeExt(file.name) || "file";
}

async function getDefaultOrgId(): Promise<string | null> {
    try {
        const ctx: any = await getUserContext();
        if (ctx?.orgId) return ctx.orgId;
        if (ctx?.organization_id) return ctx.organization_id;
        if (ctx?.organizationId) return ctx.organizationId;
    } catch {
        /* ignore */
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (error) throw error;
    return (data as any)?.default_organization_id ?? null;
}

export default function NewEquipmentPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < string | null > (null);
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

    // ✅ Document upload drafts
    const [docDrafts, setDocDrafts] = useState < UploadDraft[] > ([]);
    const [uploadingDocs, setUploadingDocs] = useState(false);

    const canCreate = useMemo(() => true, []);

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
                setOrgId(ctx.orgId ?? null);

                const resolvedOrgId = ctx.orgId ?? null;
                if (!resolvedOrgId) throw new Error("Organizzazione non trovata (default_organization_id mancante).");

                // ✅ Ricavo SEMPRE il tipo org dal DB
                const { data: orgRow, error: orgErr } = await supabase
                    .from("organizations")
                    .select("id,type")
                    .eq("id", resolvedOrgId)
                    .single();

                if (orgErr) throw orgErr;

                const resolvedType = (orgRow as any)?.type ?? null;
                setOrgType(resolvedType);

                if (resolvedType === "manufacturer") {
                    const { data, error } = await supabase
                        .from("organizations")
                        .select("id,name")
                        .eq("manufacturer_org_id", resolvedOrgId)
                        .eq("type", "customer")
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setCustomers((data ?? []) as CustomerOrg[]);
                } else {
                    const { data, error } = await supabase
                        .from("plants")
                        .select("id,name,code")
                        .eq("organization_id", resolvedOrgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (error) throw error;
                    setPlants((data ?? []) as Plant[]);
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento dati",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router, toast]);

    useEffect(() => {
        if (!orgId) return;
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
                    .eq("organization_id", orgId)
                    .eq("plant_id", selectedPlantId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true });

                if (error) throw error;

                setLines((data ?? []) as ProductionLine[]);
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
    }, [selectedPlantId, isManufacturer, orgId, toast]);

    const onPickDocs = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const next: UploadDraft[] = [];
        for (const f of Array.from(files)) {
            // limite base (opzionale): 25MB
            if (f.size > 25 * 1024 * 1024) {
                toast({
                    title: "File troppo grande",
                    description: `${f.name} supera 25MB`,
                    variant: "destructive",
                });
                continue;
            }
            next.push({
                id: crypto.randomUUID(),
                file: f,
                title: f.name,
            });
        }

        setDocDrafts((prev) => [...prev, ...next]);
    };

    const removeDraft = (id: string) => {
        setDocDrafts((prev) => prev.filter((d) => d.id !== id));
    };

    const uploadDocsForMachine = async (machineId: string, orgIdForDocs: string) => {
        if (docDrafts.length === 0) return;

        setUploadingDocs(true);
        try {
            // 1) upload su storage
            const uploadedRows: { title: string; file_path: string; file_type: string }[] = [];

            for (const d of docDrafts) {
                const ext = safeExt(d.file.name);
                const safeName = d.file.name.replace(/[^\w.\-()+ ]+/g, "_");
                const path = `machines/${machineId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

                const { error: upErr } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(path, d.file, {
                        upsert: false,
                        contentType: d.file.type || undefined,
                    });

                if (upErr) throw upErr;

                uploadedRows.push({
                    title: (d.title || d.file.name).trim(),
                    file_path: path,
                    file_type: guessFileType(d.file),
                });
            }

            // 2) insert su tabella documents
            // ⚠️ se la tua tabella documents ha colonne diverse, dimmelo e lo adeguo
            const { error: insErr } = await supabase.from("documents").insert(
                uploadedRows.map((r) => ({
                    organization_id: orgIdForDocs,
                    machine_id: machineId,
                    title: r.title,
                    file_path: r.file_path,
                    file_type: r.file_type,
                }))
            );

            if (insErr) throw insErr;
        } finally {
            setUploadingDocs(false);
        }
    };

    const handleSave = async () => {
        if (!canCreate) return;

        if (!name.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci un nome per la macchina/attrezzatura",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({ title: "Errore", description: "Organizzazione non trovata.", variant: "destructive" });
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
            const defaultOrgId = await getDefaultOrgId();
            if (!defaultOrgId) throw new Error("Organization non trovata.");

            const payload: any = {
                organization_id: defaultOrgId,
                name: name.trim(),
                internal_code: internalCode.trim() || null,
                serial_number: serialNumber.trim() || null,
                notes: notes.trim() || null,
                is_archived: false,
            };

            if (!isManufacturer) {
                payload.plant_id = selectedPlantId;
                payload.production_line_id = selectedLineId || null;
            }

            const { data: machine, error } = await supabase.from("machines").insert(payload).select("id").single();
            if (error) throw error;

            // Manufacturer -> assegna a customer
            if (isManufacturer && selectedCustomerId && machine?.id) {
                const { error: assignError } = await supabase.from("machine_assignments").insert({
                    machine_id: machine.id,
                    customer_org_id: selectedCustomerId,
                    manufacturer_org_id: defaultOrgId,
                    assigned_at: new Date().toISOString(),
                    is_active: true,
                });

                if (assignError) {
                    console.error("Assignment error:", assignError);
                    toast({
                        title: "Creato (ma non assegnato)",
                        description: "Macchina creata, ma assegnazione al cliente fallita. Controlla RLS su machine_assignments.",
                        variant: "destructive",
                    });
                }
            }

            // ✅ Upload docs (se presenti)
            if (machine?.id && docDrafts.length > 0) {
                await uploadDocsForMachine(machine.id, defaultOrgId);
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
                                        Nessun cliente trovato.{" "}
                                        <a href="/customers/new" className="text-[#FF6B35] underline">
                                            Crea un cliente
                                        </a>{" "}
                                        prima di aggiungere attrezzature.
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
                                    {!selectedPlantId && (
                                        <p className="text-xs text-muted-foreground">Seleziona prima lo stabilimento per vedere le linee.</p>
                                    )}
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

                        {/* ✅ Documentazione tecnica */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div>
                                    <div className="font-semibold text-foreground">Documentazione tecnica</div>
                                    <div className="text-xs text-muted-foreground">
                                        Carica PDF, immagini, manuali, schemi elettrici. (opzionale)
                                    </div>
                                </div>
                                <label className="inline-flex items-center">
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => onPickDocs(e.target.files)}
                                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                                    />
                                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background cursor-pointer hover:bg-muted/30">
                                        <Upload className="w-4 h-4" />
                                        Aggiungi file
                                    </span>
                                </label>
                            </div>

                            {docDrafts.length > 0 && (
                                <div className="space-y-2">
                                    {docDrafts.map((d) => (
                                        <div key={d.id} className="flex items-center gap-2 border border-border rounded-xl p-3 bg-muted/20">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-foreground truncate">{d.file.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {(d.file.size / (1024 * 1024)).toFixed(2)} MB
                                                </div>
                                                <div className="mt-2">
                                                    <Label className="text-xs text-muted-foreground">Titolo documento</Label>
                                                    <Input
                                                        value={d.title}
                                                        onChange={(e) =>
                                                            setDocDrafts((prev) =>
                                                                prev.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x))
                                                            )
                                                        }
                                                        className="mt-1"
                                                        placeholder="es. Manuale uso e manutenzione"
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeDraft(d.id)}
                                                title="Rimuovi"
                                                className="shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={saving || uploadingDocs}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : uploadingDocs ? "Upload documenti..." : "Salva"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}