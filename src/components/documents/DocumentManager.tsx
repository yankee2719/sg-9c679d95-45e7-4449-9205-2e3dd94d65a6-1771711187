import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    createDocumentAndUploadV1,
    getSignedUrl,
    type DocumentCategory,
    uploadNewVersion,
} from "@/services/documentService";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Trash2,
    History,
    Loader2,
    Factory,
    Building2,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

interface DocumentVersionRow {
    id: string;
    document_id: string;
    version_number: number | null;
    file_name: string | null;
    file_path: string | null;
    file_size: number | null;
    change_summary: string | null;
    created_at: string | null;
}

interface DocumentWithVersions {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    current_version_id: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    is_archived: boolean | null;
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
    { label: "Manuale tecnico", value: "technical_manual" },
    { label: "Valutazione rischi", value: "risk_assessment" },
    { label: "Dichiarazione CE", value: "ce_declaration" },
    { label: "Schema elettrico", value: "electrical_schema" },
    { label: "Manuale manutenzione", value: "maintenance_manual" },
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

function resolveCurrentVersion(doc: DocumentWithVersions): DocumentVersionRow | null {
    if (!doc.document_versions?.length) return null;

    if (doc.current_version_id) {
        const exact = doc.document_versions.find((v) => v.id === doc.current_version_id);
        if (exact) return exact;
    }

    return [...doc.document_versions].sort(
        (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
    )[0] ?? null;
}

export default function DocumentManager({
    machineId,
    readOnly = false,
    machineOwnerOrgId = null,
    currentOrgId = null,
    currentOrgType = null,
    currentUserRole = null,
}: DocumentManagerProps) {
    const { toast } = useToast();
    const { organization, membership, user, session } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState < DocumentWithVersions[] > ([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState < DocumentCategory > ("technical_manual");
    const [language, setLanguage] = useState("it");
    const [regulatoryReference, setRegulatoryReference] = useState("");
    const [changeSummary, setChangeSummary] = useState("");
    const [selectedFile, setSelectedFile] = useState < File | null > (null);

    const [versionFiles, setVersionFiles] = useState < Record < string, File | null >> ({});
    const [versionNotes, setVersionNotes] = useState < Record < string, string>> ({});
    const [uploadingVersionId, setUploadingVersionId] = useState < string | null > (null);
    const [deletingId, setDeletingId] = useState < string | null > (null);
    const [downloadingId, setDownloadingId] = useState < string | null > (null);

    const ctxOrgId = currentOrgId ?? organization?.id ?? null;
    const ctxOrgType = (currentOrgType ?? organization?.type ?? null) as OrgType | null;
    const ctxRole = currentUserRole ?? membership?.role ?? "technician";

    const canWrite = useMemo(() => {
        if (readOnly) return false;
        if (!ctxOrgId || !ctxOrgType) return false;

        const isAdminLike = ["owner", "admin", "supervisor"].includes(ctxRole);

        if (ctxOrgType === "manufacturer") {
            return isAdminLike;
        }

        if (ctxOrgType === "customer") {
            const isOwnerOrg = machineOwnerOrgId === ctxOrgId;
            return isOwnerOrg && (isAdminLike || ctxRole === "technician");
        }

        return false;
    }, [readOnly, ctxOrgId, ctxOrgType, ctxRole, machineOwnerOrgId]);

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (await supabase.auth.getSession()).data.session?.access_token;

        if (!accessToken) throw new Error("Sessione scaduta");
        return accessToken;
    };

    const reloadDocuments = async () => {
        const { data, error } = await supabase
            .from("documents")
            .select(`
                id,
                organization_id,
                machine_id,
                title,
                description,
                category,
                language,
                regulatory_reference,
                current_version_id,
                version_count,
                file_size,
                updated_at,
                is_archived,
                document_versions (
                    id,
                    document_id,
                    version_number,
                    file_name,
                    file_path,
                    file_size,
                    change_summary,
                    created_at
                )
            `)
            .eq("machine_id", machineId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        setDocuments((data ?? []) as unknown as DocumentWithVersions[]);
    };

    useEffect(() => {
        let active = true;

        const init = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("documents")
                    .select(`
                        id,
                        organization_id,
                        machine_id,
                        title,
                        description,
                        category,
                        language,
                        regulatory_reference,
                        current_version_id,
                        version_count,
                        file_size,
                        updated_at,
                        is_archived,
                        document_versions (
                            id,
                            document_id,
                            version_number,
                            file_name,
                            file_path,
                            file_size,
                            change_summary,
                            created_at
                        )
                    `)
                    .eq("machine_id", machineId)
                    .eq("is_archived", false)
                    .order("updated_at", { ascending: false });

                if (error) throw error;
                if (!active) return;

                setDocuments((data ?? []) as unknown as DocumentWithVersions[]);
            } catch (e: any) {
                console.error(e);
                if (!active) return;
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento documenti.",
                    variant: "destructive",
                });
            } finally {
                if (active) setLoading(false);
            }
        };

        void init();

        return () => {
            active = false;
        };
    }, [machineId, toast]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCategory("technical_manual");
        setLanguage("it");
        setRegulatoryReference("");
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

        if (!ctxOrgId) {
            toast({
                title: "Errore",
                description: "Organizzazione attiva non trovata.",
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

        setSaving(true);
        try {
            await createDocumentAndUploadV1({
                organizationId: ctxOrgId,
                machineId,
                title: title.trim(),
                description: description.trim() || null,
                category,
                file: selectedFile,
                changeSummary: changeSummary.trim() || null,
                language: language.trim() || "it",
                regulatoryReference: regulatoryReference.trim() || null,
                createdBy: user?.id ?? null,
            });

            await reloadDocuments();
            resetForm();

            toast({
                title: "Documento creato",
                description: "File caricato correttamente.",
            });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore upload",
                description: e?.message ?? "Impossibile creare il documento.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async (doc: DocumentWithVersions) => {
        const version = resolveCurrentVersion(doc);
        if (!version?.file_path) return;

        setDownloadingId(doc.id);
        try {
            const signedUrl = await getSignedUrl(version.file_path, 600);
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore download",
                description: e?.message ?? "Impossibile aprire il file.",
                variant: "destructive",
            });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleUploadNewVersion = async (doc: DocumentWithVersions) => {
        if (!canWrite || !ctxOrgId) return;

        const file = versionFiles[doc.id];
        if (!file) {
            toast({
                title: "Errore",
                description: "Seleziona un file per la nuova versione.",
                variant: "destructive",
            });
            return;
        }

        setUploadingVersionId(doc.id);
        try {
            await uploadNewVersion({
                documentId: doc.id,
                organizationId: ctxOrgId,
                file,
                changeSummary: versionNotes[doc.id]?.trim() || null,
                createdBy: user?.id ?? null,
            });

            await reloadDocuments();
            setVersionFiles((prev) => ({ ...prev, [doc.id]: null }));
            setVersionNotes((prev) => ({ ...prev, [doc.id]: "" }));

            toast({
                title: "Nuova versione caricata",
                description: doc.title,
            });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore nuova versione",
                description: e?.message ?? "Upload versione fallito.",
                variant: "destructive",
            });
        } finally {
            setUploadingVersionId(null);
        }
    };

    const handleMoveToTrash = async (doc: DocumentWithVersions) => {
        if (!canWrite) return;
        if (!confirm(`Spostare "${doc.title}" nel cestino?`)) return;

        setDeletingId(doc.id);
        try {
            const accessToken = await getAccessToken();

            const response = await fetch(`/api/documents/${doc.id}/delete`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore spostamento documento nel cestino");
            }

            await reloadDocuments();

            toast({
                title: "Documento spostato nel cestino",
                description: doc.title,
            });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore cestino",
                description: e?.message ?? "Impossibile spostare il documento nel cestino.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {ctxOrgType === "manufacturer" ? (
                            <Factory className="h-5 w-5 text-orange-500" />
                        ) : (
                            <Building2 className="h-5 w-5 text-blue-500" />
                        )}
                        Documenti macchina
                    </CardTitle>
                    <CardDescription>
                        Archivio documentale tecnico collegato alla macchina nel contesto attivo.
                    </CardDescription>
                </CardHeader>
            </Card>

            {canWrite && (
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Nuovo documento
                        </CardTitle>
                        <CardDescription>
                            Crea il documento e carica subito la prima versione.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <LabelLite>Titolo *</LabelLite>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Es. Manuale uso e manutenzione"
                                />
                            </div>

                            <div className="space-y-2">
                                <LabelLite>Categoria</LabelLite>
                                <Select
                                    value={category}
                                    onValueChange={(value) =>
                                        setCategory(value as DocumentCategory)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                                <LabelLite>Lingua</LabelLite>
                                <Input
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    placeholder="it / en / es ..."
                                />
                            </div>

                            <div className="space-y-2">
                                <LabelLite>Riferimento normativo</LabelLite>
                                <Input
                                    value={regulatoryReference}
                                    onChange={(e) => setRegulatoryReference(e.target.value)}
                                    placeholder="Es. 2006/42/CE"
                                />
                            </div>

                            <div className="space-y-2">
                                <LabelLite>File</LabelLite>
                                <Input
                                    type="file"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <LabelLite>Descrizione</LabelLite>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Descrizione documento..."
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <LabelLite>Note versione iniziale</LabelLite>
                                <Textarea
                                    value={changeSummary}
                                    onChange={(e) => setChangeSummary(e.target.value)}
                                    rows={3}
                                    placeholder="Es. prima emissione, bozza iniziale..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleCreateDocument} disabled={saving}>
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {saving ? "Caricamento..." : "Crea documento"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Elenco documenti
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Caricamento documenti...
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                            Nessun documento trovato per questa macchina.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {documents.map((doc) => {
                                const version = resolveCurrentVersion(doc);

                                return (
                                    <div
                                        key={doc.id}
                                        className="rounded-2xl border border-border p-4"
                                    >
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="truncate text-lg font-semibold">
                                                        {doc.title}
                                                    </div>
                                                    <Badge variant="outline">
                                                        {categoryLabel(doc.category)}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        v{version?.version_number ?? doc.version_count ?? 1}
                                                    </Badge>
                                                </div>

                                                {doc.description && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {doc.description}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    <span>Lingua: {doc.language || "—"}</span>
                                                    <span>Size: {formatBytes(version?.file_size ?? doc.file_size)}</span>
                                                    <span>Aggiornato: {formatDate(doc.updated_at)}</span>
                                                    <span>Versioni: {doc.version_count ?? 1}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(doc)}
                                                    disabled={!version?.file_path || downloadingId === doc.id}
                                                >
                                                    {downloadingId === doc.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="mr-2 h-4 w-4" />
                                                    )}
                                                    Apri
                                                </Button>

                                                {canWrite && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleMoveToTrash(doc)}
                                                        disabled={deletingId === doc.id}
                                                    >
                                                        {deletingId === doc.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                        )}
                                                        Cestino
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {doc.document_versions?.length > 1 && (
                                            <div className="mt-4 rounded-xl bg-muted/40 p-3">
                                                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                                    <History className="h-4 w-4" />
                                                    Cronologia versioni
                                                </div>

                                                <div className="space-y-2">
                                                    {doc.document_versions
                                                        .sort(
                                                            (a, b) =>
                                                                (b.version_number ?? 0) -
                                                                (a.version_number ?? 0)
                                                        )
                                                        .map((ver) => (
                                                            <div
                                                                key={ver.id}
                                                                className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm md:flex-row md:items-center md:justify-between"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="font-medium">
                                                                        v{ver.version_number} ·{" "}
                                                                        {ver.file_name}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatDate(ver.created_at)}
                                                                        {ver.change_summary
                                                                            ? ` · ${ver.change_summary}`
                                                                            : ""}
                                                                    </div>
                                                                </div>

                                                                <div className="text-xs text-muted-foreground">
                                                                    {formatBytes(ver.file_size)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {canWrite && (
                                            <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                                                <div className="mb-3 text-sm font-medium">
                                                    Carica nuova versione
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                                    <Input
                                                        type="file"
                                                        onChange={(e) =>
                                                            setVersionFiles((prev) => ({
                                                                ...prev,
                                                                [doc.id]: e.target.files?.[0] ?? null,
                                                            }))
                                                        }
                                                    />
                                                    <Input
                                                        value={versionNotes[doc.id] ?? ""}
                                                        onChange={(e) =>
                                                            setVersionNotes((prev) => ({
                                                                ...prev,
                                                                [doc.id]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Note nuova versione"
                                                    />
                                                    <Button
                                                        onClick={() => handleUploadNewVersion(doc)}
                                                        disabled={uploadingVersionId === doc.id}
                                                    >
                                                        {uploadingVersionId === doc.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Upload className="mr-2 h-4 w-4" />
                                                        )}
                                                        Carica
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
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

function LabelLite({ children }: { children: React.ReactNode }) {
    return <div className="text-sm font-medium text-foreground">{children}</div>;
}