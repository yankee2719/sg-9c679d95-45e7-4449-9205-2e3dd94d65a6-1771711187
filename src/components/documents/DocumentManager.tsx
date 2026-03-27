import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { documentWorkspaceApi, type WorkspaceDocument, type WorkspaceDocumentVersion } from "@/lib/documentWorkspaceApi";

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

function resolveCurrentVersion(doc: WorkspaceDocument): WorkspaceDocumentVersion | null {
    if (!doc.document_versions?.length) return null;
    if (doc.current_version_id) {
        const exact = doc.document_versions.find((v) => v.id === doc.current_version_id);
        if (exact) return exact;
    }
    return [...doc.document_versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0] ?? null;
}

export default function DocumentManager({
    machineId,
    readOnly = false,
    currentOrgId = null,
    currentOrgType = null,
    currentUserRole = null,
}: DocumentManagerProps) {
    const { toast } = useToast();
    const { organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState < WorkspaceDocument[] > ([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState < DocumentCategory > ("technical_manual");
    const [selectedFile, setSelectedFile] = useState < File | null > (null);

    const ctxOrgId = currentOrgId ?? organization?.id ?? null;
    const ctxOrgType = (currentOrgType ?? organization?.type ?? null) as OrgType | null;
    const ctxRole = currentUserRole ?? membership?.role ?? "technician";

    const canWrite = useMemo(() => {
        if (readOnly) return false;
        if (!ctxOrgId || !ctxOrgType) return false;
        return ["owner", "admin", "supervisor"].includes(ctxRole);
    }, [readOnly, ctxOrgId, ctxOrgType, ctxRole]);

    const loadDocuments = async () => {
        const rows = await documentWorkspaceApi.listMachineDocuments(machineId);
        setDocuments(rows);
    };

    useEffect(() => {
        let active = true;
        const init = async () => {
            setLoading(true);
            try {
                const rows = await documentWorkspaceApi.listMachineDocuments(machineId);
                if (!active) return;
                setDocuments(rows);
            } catch (e: any) {
                console.error(e);
                if (!active) return;
                toast({ title: "Errore", description: e?.message ?? "Errore caricamento documenti", variant: "destructive" });
            } finally {
                if (active) setLoading(false);
            }
        };
        void init();
        return () => {
            active = false;
        };
    }, [machineId, toast]);

    const handleCreate = async () => {
        if (!selectedFile) return;
        if (!title.trim()) {
            toast({ title: "Errore", description: "Titolo documento obbligatorio", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            await documentWorkspaceApi.uploadMachineDocument({
                machineId,
                title: title.trim(),
                description,
                category,
                file: selectedFile,
            });
            await loadDocuments();
            setTitle("");
            setDescription("");
            setSelectedFile(null);
            toast({ title: "Documento caricato" });
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message || "Upload fallito", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleOpen = async (doc: WorkspaceDocument) => {
        try {
            await documentWorkspaceApi.openDocument(doc.id, resolveCurrentVersion(doc)?.id || undefined);
        } catch (e: any) {
            toast({ title: "Errore", description: e?.message || "Apertura fallita", variant: "destructive" });
        }
    };

    const handleDelete = async (doc: WorkspaceDocument) => {
        if (!doc.can_manage || !window.confirm(`Archiviare il documento "${doc.title}"?`)) return;
        try {
            await documentWorkspaceApi.archiveDocument(doc.id);
            await loadDocuments();
            toast({ title: "Documento archiviato" });
        } catch (e: any) {
            toast({ title: "Errore", description: e?.message || "Archiviazione fallita", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Documenti macchina</CardTitle>
                    <CardDescription>Archivio documentale server-first</CardDescription>
                </CardHeader>
            </Card>

            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nuovo documento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione" />
                        <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                        <Button onClick={handleCreate} disabled={saving || !selectedFile}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Carica
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Elenco documenti</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="animate-spin" />
                    ) : documents.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nessun documento presente.</div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc) => {
                                const version = resolveCurrentVersion(doc);
                                return (
                                    <div key={doc.id} className="rounded-xl border p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="space-y-1">
                                                <div className="font-medium">{doc.title}</div>
                                                <div className="text-sm text-muted-foreground">{doc.description || doc.category || "—"}</div>
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline">v{version?.version_number ?? doc.version_count ?? 1}</Badge>
                                                    <span>{version?.file_name || "file"}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => void handleOpen(doc)}>
                                                    <Download className="mr-2 h-4 w-4" />Apri
                                                </Button>
                                                {doc.can_manage ? (
                                                    <Button size="sm" variant="outline" onClick={() => void handleDelete(doc)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />Archivia
                                                    </Button>
                                                ) : null}
                                            </div>
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
