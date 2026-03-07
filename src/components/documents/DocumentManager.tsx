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
    Download,
    Factory,
    Building2,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

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
    organization_id: string | null;
    plant_id: string | null;
    machine_id: string | null;
    title: string | null;
    description: string | null;
    category: DocumentCategory | null;
    language: string | null;
    is_mandatory: boolean | null;
    regulatory_reference: string | null;
    current_version_id: string | null;
    version_count: number | null;
    tags: string[] | null;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
    is_archived: boolean | null;
    archived_at: string | null;
    external_url: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    mime_type: string | null;
    file_size: number | null;
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

function fileNameFromPath(path: string | null | undefined) {
    if (!path) return "—";
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
}

function normalizeMimeType(file: File) {
    if (file.type && file.type.trim()) return file.type;

    const name = file.name.toLowerCase();

    if (name.endsWith(".txt")) return "text/plain";
    if (name.endsWith(".csv")) return "text/csv";
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".doc")) return "application/msword";
    if (name.endsWith(".docx")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (name.endsWith(".xlsx")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (name.endsWith(".pptx")) {
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".gif")) return "image/gif";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".zip")) return "application/zip";
    if (name.endsWith(".mp4")) return "video/mp4";
    if (name.endsWith(".mov")) return "video/quicktime";

    return "application/octet-stream";
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
    const [language, setLanguage] = useState("it");
    const [regulatoryReference, setRegulatoryReference] = useState("");
    const [selectedFile, setSelectedFile] = useState < File | null > (null);

    const canWrite = useMemo(() => {
        if (props.readOnly) return false;
        if (!ctxOrgId || !ctxOrgType) return false;

        const isAdminLike = ctxRole === "admin" || ctxRole === "supervisor";

        if (ctxOrgType === "manufacturer") {
            return isAdminLike;
        }

        if (ctxOrgType === "customer") {
            const isOwner = resolvedMachineOwnerOrgId === ctxOrgId;
            return isOwner && (isAdminLike || ctxRole === "technician");
        }

        return false;
    }, [props.readOnly, ctxOrgId, ctxOrgType, ctxRole, resolvedMachineOwnerOrgId]);

    const visibleDocuments = useMemo(() => documents, [documents]);

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
                        "id, organization_id, plant_id, machine_id, title, description, category, language, is_mandatory, regulatory_reference, current_version_id, version_count, tags, created_at, updated_at, created_by, is_archived, archived_at, external_url, storage_bucket, storage_path, mime_type, file_size"
                    )
                    .eq("machine_id", props.machineId)
                    .eq("is_archived", false)
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
        setLanguage("it");
        setRegulatoryReference("");
        setSelectedFile(null);
    };

    const handleCreateDocument = async () => {
        if (!canWrite) {
            toast({
                title: "Azione non consentita",
                description: "Non hai permessi di scrittura nel contesto attuale.",
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

        const resolvedMimeType = normalizeMimeType(selectedFile);

        if (resolvedMimeType === "application/octet-stream") {
            toast({
                title: "Tipo file non supportato",
                description:
                    "Questo file non è supportato dal bucket documents. Prova con PDF, immagini, DOC/DOCX, XLSX, PPTX, TXT, CSV, ZIP, MP4 o MOV.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const safeFileName = selectedFile.name.replace(/\\s+/g, "_");
            const storagePath = `${ctxOrgId}/${props.machineId}/${Date.now()}_${safeFileName}`;

            const { error: uploadError } = await supabase.storage
                .from("documents")
                .upload(storagePath, selectedFile, {
                    upsert: false,
                    contentType: resolvedMimeType,
                });

            if (uploadError) throw uploadError;

            const {
                data: { user },
            } = await supabase.auth.getUser();

            const payload = {
                organization_id: ctxOrgId,
                machine_id: props.machineId,
                title: title.trim(),
                description: description.trim() || null,
                category,
                language: language.trim() || "it",
                is_mandatory: false,
                regulatory_reference: regulatoryReference.trim() || null,
                version_count: 1,
                tags: [] as string[],
                created_by: user?.id ?? null,
                is_archived: false,
                external_url: null,
                storage_bucket: "documents",
                storage_path: storagePath,
                mime_type: resolvedMimeType,
                file_size: selectedFile.size,
            };

            const { data, error } = await supabase
                .from("documents")
                .insert(payload)
                .select(
                    "id, organization_id, plant_id, machine_id, title, description, category, language, is_mandatory, regulatory_reference, current_version_id, version_count, tags, created_at, updated_at, created_by, is_archived, archived_at, external_url, storage_bucket, storage_path, mime_type, file_size"
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
            if (!doc.storage_bucket || !doc.storage_path) {
                throw new Error("Percorso storage non disponibile.");
            }

            const { data, error } = await supabase.storage
                .from(doc.storage_bucket)
                .download(doc.storage_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = fileNameFromPath(doc.storage_path);
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

    return (
        <div className="space-y-6">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documenti macchina
                    </CardTitle>
                    <CardDescription>
                        Archivio documentale collegato alla macchina. I file vengono salvati nel bucket documents
                        con path organizzazione/macchina/file.
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
                            ? "Il costruttore può caricare documenti tecnici della macchina."
                            : "Il cliente finale può caricare documenti operativi della propria macchina."}
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
                            <Label>Lingua</Label>
                            <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="it" />
                        </div>

                        <div className="space-y-2">
                            <Label>Riferimento normativo</Label>
                            <Input
                                value={regulatoryReference}
                                onChange={(e) => setRegulatoryReference(e.target.value)}
                                placeholder="Es. Direttiva Macchine / EN ISO ..."
                            />
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
                            <div className="text-xs text-muted-foreground">
                                Formati supportati: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLSX, PPTX, TXT, CSV, ZIP, MP4, MOV.
                                Per il test usa un PDF.
                            </div>
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
                            Non hai permessi di scrittura nel contesto attuale per questa macchina.
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
                                            <div className="font-medium">{doc.title || fileNameFromPath(doc.storage_path)}</div>

                                            <Badge variant="outline" className="capitalize">
                                                {categoryLabel(doc.category)}
                                            </Badge>

                                            {doc.organization_id === resolvedMachineOwnerOrgId ? (
                                                <Badge variant="outline" className="gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    Owner
                                                </Badge>
                                            ) : (
                                                <Badge className="gap-1">
                                                    <Factory className="w-3 h-3" />
                                                    Organizzazione documento
                                                </Badge>
                                            )}
                                        </div>

                                        {doc.description && <div className="text-sm text-muted-foreground">{doc.description}</div>}

                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                            <span>File: {fileNameFromPath(doc.storage_path)}</span>
                                            <span>Mime: {doc.mime_type || "—"}</span>
                                            <span>Dimensione: {formatBytes(doc.file_size)}</span>
                                            <span>Versioni: {doc.version_count ?? "—"}</span>
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