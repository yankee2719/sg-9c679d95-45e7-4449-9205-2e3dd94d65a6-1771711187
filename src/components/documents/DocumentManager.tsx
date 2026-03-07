// src/components/documents/DocumentManager.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    FileText,
    Upload,
    Plus,
    Factory,
    Building2,
    Download,
    Lock,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";
type DocumentScope = "manufacturer" | "customer";
type DocumentCategory =
    | "technical_manual"
    | "risk_assessment"
    | "ce_declaration"
    | "electrical_schema"
    | "maintenance_manual"
    | "spare_parts_catalog"
    | "training_material"
    | "inspection_report"
    | "certificate"
    | "photo"
    | "video"
    | "other";

interface DocumentRow {
    id: string;
    title: string | null;
    description: string | null;
    file_name: string | null;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    version: string | null;
    document_category: DocumentCategory | null;
    scope: DocumentScope | null;
    organization_id: string | null;
    machine_id: string | null;
    is_locked: boolean | null;
    created_at: string | null;
}

interface DocumentManagerProps {
    machineId: string;
    readOnly?: boolean;
    machineOwnerOrgId?: string | null;
    currentOrgId?: string | null;
    currentOrgType?: OrgType | null;
    currentUserRole?: string | null;
}

const DOCUMENT_CATEGORY_OPTIONS: Array<{ label: string; value: DocumentCategory }> = [
    { label: "Manuale tecnico", value: "technical_manual" },
    { label: "Valutazione rischi", value: "risk_assessment" },
    { label: "Dichiarazione CE", value: "ce_declaration" },
    { label: "Schema elettrico", value: "electrical_schema" },
    { label: "Manuale uso e manutenzione", value: "maintenance_manual" },
    { label: "Catalogo ricambi", value: "spare_parts_catalog" },
    { label: "Materiale formazione", value: "training_material" },
    { label: "Rapporto ispezione", value: "inspection_report" },
    { label: "Certificato", value: "certificate" },
    { label: "Foto", value: "photo" },
    { label: "Video", value: "video" },
    { label: "Altro", value: "other" },
];

const DOCUMENT_SCOPE_OPTIONS: Array<{ label: string; value: DocumentScope }> = [
    { label: "Documento costruttore", value: "manufacturer" },
    { label: "Documento operativo cliente", value: "customer" },
];

function formatBytes(value: number | null | undefined) {
    if (!value || value <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT");
    } catch {
        return value;
    }
}

function categoryLabel(category: string | null | undefined) {
    return DOCUMENT_CATEGORY_OPTIONS.find((x) => x.value === category)?.label ?? category ?? "—";
}

function scopeLabel(scope: string | null | undefined) {
    return scope === "manufacturer" ? "Costruttore" : scope === "customer" ? "Cliente" : "—";
}

export default function DocumentManager(props: DocumentManagerProps) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState < DocumentRow[] > ([]);

    const [ctxOrgId, setCtxOrgId] = useState < string | null > (props.currentOrgId ?? null);
    const [ctxOrgType, setCtxOrgType] = useState < OrgType | null > (props.currentOrgType ?? null);
    const [ctxRole, setCtxRole] = useState < string > (props.currentUserRole ?? "technician");
    const [resolvedMachineOwnerOrgId, setResolvedMachineOwnerOrgId] = useState < string | null > (
        props.machineOwnerOrgId ?? null
    );

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState < DocumentCategory > ("technical_manual");
    const [scope, setScope] = useState < DocumentScope > ("manufacturer");
    const [version, setVersion] = useState("1.0");
    const [selectedFile, setSelectedFile] = useState < File | null > (null);

    const canWrite = useMemo(() => {
        if (props.readOnly) return false;
        if (!ctxOrgId || !ctxOrgType) return false;

        const isAdminLike = ctxRole === "admin" || ctxRole === "supervisor";

        if (ctxOrgType === "manufacturer") {
            return isAdminLike && scope === "manufacturer";
        }

        if (ctxOrgType === "customer") {
            const isOwner = resolvedMachineOwnerOrgId === ctxOrgId;
            if (!isOwner) return false;
            return scope === "customer" && (isAdminLike || ctxRole === "technician");
        }

        return false;
    }, [props.readOnly, ctxOrgId, ctxOrgType, ctxRole, scope, resolvedMachineOwnerOrgId]);

    const visibleDocuments = useMemo(() => {
        if (!ctxOrgId || !ctxOrgType) return documents;

        if (ctxOrgType === "manufacturer") {
            return documents.filter((doc) => doc.scope === "manufacturer");
        }

        if (ctxOrgType === "customer") {
            return documents.filter((doc) => {
                if (doc.scope === "manufacturer") return true;
                return doc.organization_id === ctxOrgId;
            });
        }

        return documents;
    }, [documents, ctxOrgId, ctxOrgType]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);

            try {
                const ctx = await getUserContext();
                if (ctx?.orgId) setCtxOrgId(ctx.orgId);
                if (ctx?.orgType) setCtxOrgType(ctx.orgType as OrgType);
                if (ctx?.role) setCtxRole(ctx.role);

                if (!props.machineOwnerOrgId) {
                    const { data: machineRow, error: machineError } = await supabase
                        .from("machines")
                        .select("organization_id")
                        .eq("id", props.machineId)
                        .maybeSingle();

                    if (machineError) throw machineError;
                    setResolvedMachineOwnerOrgId((machineRow as any)?.organization_id ?? null);
                }

                const { data, error } = await supabase
                    .from("documents")
                    .select(
                        "id, title, description, file_name, file_path, file_size, mime_type, version, document_category, scope, organization_id, machine_id, is_locked, created_at"
                    )
                    .eq("machine_id", props.machineId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                setDocuments((data ?? []) as DocumentRow[]);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento documenti.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [props.machineId, props.machineOwnerOrgId, toast]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCategory("technical_manual");
        setScope(ctxOrgType === "customer" ? "customer" : "manufacturer");
        setVersion("1.0");
        setSelectedFile(null);
    };

    const handleCreateDocument = async () => {
        if (!canWrite) {
            toast({
                title: "Azione non consentita",
                description:
                    ctxOrgType === "customer"
                        ? "Il cliente finale può creare solo documenti operativi propri."
                        : "Puoi creare solo documenti costruttore nel tuo contesto attivo.",
                variant: "destructive",
            });
            return;
        }

        if (!selectedFile) {
            toast({
                title: "Errore",
                description: "Seleziona un file da caricare.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci il titolo del documento.",
                variant: "destructive",
            });
            return;
        }

        if (!ctxOrgId) {
            toast({
                title: "Errore",
                description: "Organizzazione attiva non trovata.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const fileExt = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop() : "";
            const safeFileName = selectedFile.name.replace(/\s+/g, "_");
            const storagePath = `${ctxOrgId}/${props.machineId}/${Date.now()}_${safeFileName}`;

            const { error: uploadError } = await supabase.storage
                .from("documents")
                .upload(storagePath, selectedFile, {
                    upsert: false,
                    contentType: selectedFile.type || "application/octet-stream",
                });

            if (uploadError) throw uploadError;

            const payload = {
                title: title.trim(),
                description: description.trim() || null,
                file_name: selectedFile.name,
                file_path: storagePath,
                file_size: selectedFile.size,
                mime_type: selectedFile.type || null,
                version: version.trim() || "1.0",
                document_category: category,
                scope,
                organization_id: ctxOrgId,
                machine_id: props.machineId,
                is_locked: scope === "manufacturer",
                file_extension: fileExt || null,
            };

            const { data, error } = await supabase
                .from("documents")
                .insert(payload)
                .select(
                    "id, title, description, file_name, file_path, file_size, mime_type, version, document_category, scope, organization_id, machine_id, is_locked, created_at"
                )
                .single();

            if (error) throw error;

            setDocuments((prev) => [data as DocumentRow, ...prev]);
            toast({
                title: "OK",
                description: "Documento caricato correttamente.",
            });
            resetForm();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore upload",
                description: e?.message ?? "Errore durante il caricamento del documento.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async (doc: DocumentRow) => {
        try {
            if (!doc.file_path) throw new Error("Percorso file non disponibile.");

            const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = doc.file_name || "document";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore download",
                description: e?.message ?? "Impossibile scaricare il documento.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        if (ctxOrgType === "customer") {
            setScope("customer");
            setCategory("technical_manual");
        } else if (ctxOrgType === "manufacturer") {
            setScope("manufacturer");
        }
    }, [ctxOrgType]);

    return (
        <div className="space-y-6">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documenti macchina
                    </CardTitle>
                    <CardDescription>
                        I documenti costruttore sono in sola lettura per il cliente finale. I documenti operativi
                        cliente sono modificabili solo dall’organizzazione proprietaria.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Nuovo documento
                    </CardTitle>
                    <CardDescription>
                        {ctxOrgType === "manufacturer"
                            ? "Il costruttore può caricare documenti propri della macchina."
                            : "Il cliente finale può caricare solo documenti operativi del proprio contesto."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Titolo *</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Es. Manuale uso e manutenzione"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Versione</Label>
                            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona categoria..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Scope</Label>
                            <Select
                                value={scope}
                                onValueChange={(v) => setScope(v as DocumentScope)}
                                disabled={ctxOrgType === "customer"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona scope..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_SCOPE_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            disabled={ctxOrgType === "customer" && option.value !== "customer"}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Descrizione</Label>
                            <Textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descrizione documento..."
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>File</Label>
                            <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleCreateDocument} disabled={saving || !canWrite}>
                            <Upload className="mr-2 h-4 w-4" />
                            {saving ? "Caricamento..." : "Carica documento"}
                        </Button>
                    </div>

                    {!canWrite && (
                        <div className="text-sm text-muted-foreground rounded-xl border border-border p-3 bg-muted/30">
                            Non hai permessi di scrittura nel contesto attuale per questo tipo di documento.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-base">Elenco documenti</CardTitle>
                    <CardDescription>Visualizzazione documenti collegati alla macchina.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Caricamento documenti...</div>
                    ) : visibleDocuments.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nessun documento presente.</div>
                    ) : (
                        <div className="space-y-3">
                            {visibleDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="rounded-xl border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-medium">{doc.title || doc.file_name || "Documento"}</div>

                                            <Badge variant="outline" className="capitalize">
                                                {categoryLabel(doc.document_category)}
                                            </Badge>

                                            <Badge variant="secondary">{scopeLabel(doc.scope)}</Badge>

                                            {doc.scope === "manufacturer" ? (
                                                <Badge className="gap-1">
                                                    <Factory className="w-3 h-3" />
                                                    Costruttore
                                                </Badge>
                                            ) : (
                                                <Badge className="gap-1" variant="outline">
                                                    <Building2 className="w-3 h-3" />
                                                    Cliente
                                                </Badge>
                                            )}

                                            {doc.is_locked && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Lock className="w-3 h-3" />
                                                    Bloccato
                                                </Badge>
                                            )}
                                        </div>

                                        {doc.description && <div className="text-sm text-muted-foreground">{doc.description}</div>}

                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                            <span>File: {doc.file_name || "—"}</span>
                                            <span>Versione: {doc.version || "—"}</span>
                                            <span>Dimensione: {formatBytes(doc.file_size)}</span>
                                            <span>Creato: {formatDate(doc.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => handleDownload(doc)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Scarica
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
