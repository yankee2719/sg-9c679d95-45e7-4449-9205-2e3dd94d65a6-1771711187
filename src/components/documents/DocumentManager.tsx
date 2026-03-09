import { useEffect, useMemo, useState } from "react";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    createDocumentAndUploadV1,
    getSignedUrl,
    listMachineDocuments,
    DocumentCategory,
    DocumentRow,
    DocumentVersionRow,
} from "@/services/documentService";
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

interface DocumentWithVersions extends DocumentRow {
    document_versions: DocumentVersionRow[];
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
    { label: "Manuale / Manual", value: "MANUAL" },
    { label: "Disegno / Schema", value: "DRAWING" },
    { label: "Certificato / Declaration", value: "CERTIFICATE" },
    { label: "Report / Verbale", value: "REPORT" },
    { label: "Altro", value: "OTHER" },
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

function currentVersion(doc: DocumentWithVersions) {
    if (!doc.document_versions?.length) return null;

    if (doc.current_version_id) {
        const exact = doc.document_versions.find((v) => v.id === doc.current_version_id);
        if (exact) return exact;
    }

    return [...doc.document_versions].sort(
        (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
    )[0] ?? null;
}

export default function DocumentManager(props: DocumentManagerProps) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState < DocumentWithVersions[] > ([]);

    const [ctxOrgId, setCtxOrgId] = useState < string | null > (props.currentOrgId ?? null);
    const [ctxOrgType, setCtxOrgType] = useState < OrgType | null > (props.currentOrgType ?? null);
    const [ctxRole, setCtxRole] = useState < string > (props.currentUserRole ?? "technician");
    const [resolvedMachineOwnerOrgId, setResolvedMachineOwnerOrgId] = useState < string | null > (
        props.machineOwnerOrgId ?? null
    );

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState < DocumentCategory > ("MANUAL");
    const [language, setLanguage] = useState("it");
    const [changeSummary, setChangeSummary] = useState("");
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

    const reloadDocuments = async () => {
        const rows = await listMachineDocuments(props.machineId);
        setDocuments(rows as DocumentWithVersions[]);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);

            try {
                const ctx = await getUserContext();
                if (ctx?.orgId) setCtxOrgId(ctx.orgId);
                if (ctx?.orgType) setCtxOrgType(ctx.orgType as OrgType);
                if (ctx?.role) setCtxRole(ctx.role);

                if (!props.machineOwnerOrgId) {
                    const { supabase } = await import("@/integrations/supabase/client");
                    const { data: machineRow, error: machineError } = await supabase
                        .from("machines")
                        .select("organization_id")
                        .eq("id", props.machineId)
                        .maybeSingle();

                    if (machineError) throw machineError;
                    setResolvedMachineOwnerOrgId((machineRow as any)?.organization_id ?? null);
                }

                await reloadDocuments();
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
    }, [props.machineId, props.machineOwnerOrgId]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCategory("MANUAL");
        setLanguage("it");
        setChangeSummary("");
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

        setSaving(true);

        try {
            await createDocumentAndUploadV1({
                organizationId: ctxOrgId,
                machineId: props.machineId,
                title: title.trim(),
                description: description.trim() || null,
                category,
                file: selectedFile,
                changeSummary: changeSummary.trim() || null,
                language: language.trim() || "it",
                isMandatory: false,
                tags: [],
            });

            toast({
                title: "OK",
                description: "Documento caricato correttamente.",
            });

            resetForm();
            await reloadDocuments();
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

    const handleDownload = async (doc: DocumentWithVersions) => {
        try {
            const version = currentVersion(doc);
            if (!version?.file_path) {
                throw new Error("Versione corrente del documento non disponibile.");
            }

            const signedUrl = await getSignedUrl(version.file_path, 600);

            const a = window.document.createElement("a");
            a.href = signedUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.download = version.file_name || "document";
            a.click();
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
                        <FileText className="h-5 w-5" />
                        Documenti macchina
                    </CardTitle>
                    <CardDescription>
                        Archivio documentale collegato alla macchina con versioning documentale.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Plus className="h-4 w-4" />
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
                            <Label>Version note</Label>
                            <Input
                                value={changeSummary}
                                onChange={(e) => setChangeSummary(e.target.value)}
                                placeholder="Es. Prima emissione"
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
                                Per il test usa preferibilmente un PDF o un file Office standard.
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
                        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
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
                            {visibleDocuments.map((doc) => {
                                const version = currentVersion(doc);

                                return (
                                    <div
                                        key={doc.id}
                                        className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="font-medium">{doc.title || "Documento"}</div>

                                                <Badge variant="outline" className="capitalize">
                                                    {categoryLabel(doc.category)}
                                                </Badge>

                                                {doc.organization_id === resolvedMachineOwnerOrgId ? (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        Owner
                                                    </Badge>
                                                ) : (
                                                    <Badge className="gap-1">
                                                        <Factory className="h-3 w-3" />
                                                        Organizzazione documento
                                                    </Badge>
                                                )}
                                            </div>

                                            {doc.description && (
                                                <div className="text-sm text-muted-foreground">{doc.description}</div>
                                            )}

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span>File: {version?.file_name ?? "—"}</span>
                                                <span>Mime: {version?.mime_type || "—"}</span>
                                                <span>Dimensione: {formatBytes(version?.file_size)}</span>
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
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}