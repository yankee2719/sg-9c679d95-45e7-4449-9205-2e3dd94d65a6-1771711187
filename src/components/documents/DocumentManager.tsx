import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/services/auditClient";
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
    const { organization, membership, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState<DocumentWithVersions[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<DocumentCategory>("technical_manual");
    const [language, setLanguage] = useState("it");
    const [regulatoryReference, setRegulatoryReference] = useState("");
    const [changeSummary, setChangeSummary] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const ctxOrgId = currentOrgId ?? organization?.id ?? null;
    const ctxOrgType = (currentOrgType ?? organization?.type ?? null) as OrgType | null;
    const ctxRole = currentUserRole ?? membership?.role ?? "technician";

    const canWrite = useMemo(() => {
        if (readOnly) return false;
        if (!ctxOrgId || !ctxOrgType) return false;
        return ["owner", "admin", "supervisor"].includes(ctxRole);
    }, [readOnly, ctxOrgId, ctxOrgType, ctxRole]);

    const loadDocuments = async () => {
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
                document_versions:document_versions!document_versions_document_id_fkey (
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
        setDocuments((data ?? []) as DocumentWithVersions[]);
    };

    useEffect(() => {
        let active = true;

        const init = async () => {
            setLoading(true);
            try {
                await loadDocuments();
            } catch (e: any) {
                console.error(e);
                if (!active) return;
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento documenti",
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
    }, [machineId]);

    const handleCreate = async () => {
        if (!ctxOrgId || !selectedFile) return;

        setSaving(true);
        try {
            await createDocumentAndUploadV1({
                organizationId: ctxOrgId,
                machineId,
                title,
                description,
                category,
                file: selectedFile,
                language,
                regulatoryReference,
                changeSummary,
                createdBy: user?.id ?? null,
            });

            await logAudit({
                organizationId: ctxOrgId,
                entityType: "document",
                entityId: null,
                action: "create",
                machineId: machineId,
            });

            await logAudit({
                organizationId: ctxOrgId,
                entityType: "document",
                entityId: doc.id,
                action: "new_version",
                machineId: machineId,
                documentId: doc.id,
            });

            await logAudit({
                organizationId: ctxOrgId,
                entityType: "document",
                entityId: doc.id,
                action: "delete",
                machineId: machineId,
            });

            await loadDocuments();

            setTitle("");
            setDescription("");
            setSelectedFile(null);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Documenti macchina</CardTitle>
                    <CardDescription>Archivio documentale</CardDescription>
                </CardHeader>
            </Card>

            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nuovo documento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                        <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />

                        <Button onClick={handleCreate} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
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
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc) => {
                                const version = resolveCurrentVersion(doc);

                                return (
                                    <div key={doc.id} className="border p-3 rounded">
                                        <div className="flex justify-between">
                                            <div>{doc.title}</div>
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    if (!version?.file_path) return;
                                                    const url = await getSignedUrl(version.file_path);
                                                    window.open(url);
                                                }}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Apri
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