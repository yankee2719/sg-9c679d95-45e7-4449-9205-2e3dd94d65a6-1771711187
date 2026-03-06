import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    createDocumentAndUploadV1,
    getSignedUrl,
    listMachineDocuments,
    signDocumentVersion,
    uploadNewVersion,
    DocumentVersionRow,
    DocumentCategory,
} from "@/services/documentService";
import { SignaturePad } from "@/components/documents/SignaturePad";
import {
    Eye,
    FileUp,
    FolderOpen,
    History,
    PenTool,
    Search,
    ShieldCheck,
    UploadCloud,
    Wrench,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

type DocumentItem = {
    id: string;
    organization_id: string;
    plant_id: string | null;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: string | null;
    version_count: number | null;
    created_at: string;
    updated_at: string;
    document_versions?: DocumentVersionRow[];
};

function canCreateOrEdit(role: string) {
    return role === "admin" || role === "supervisor";
}

const CATEGORY_LABEL: Record<string, string> = {
    MANUAL: "Manuale",
    DRAWING: "Disegno",
    CERTIFICATE: "Certificato",
    REPORT: "Report",
    OTHER: "Altro",
};

function categoryLabel(value: string | null | undefined) {
    if (!value) return "Altro";
    return CATEGORY_LABEL[String(value).toUpperCase()] ?? value;
}

export function DocumentManager({
    currentOrganizationId,
    currentOrgType,
    machineId,
    machineOwnerOrganizationId,
    plantId,
    userRole,
}: {
    currentOrganizationId: string | null;
    currentOrgType: OrgType | null;
    machineId: string;
    machineOwnerOrganizationId: string | null;
    plantId: string | null;
    userRole: string;
}) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState < DocumentItem[] > ([]);
    const [query, setQuery] = useState("");

    const [newFile, setNewFile] = useState < File | null > (null);
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState < DocumentCategory > ("MANUAL");
    const [newDescription, setNewDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState < string | null > (null);
    const [previewTitle, setPreviewTitle] = useState("");

    const [versionDialogOpen, setVersionDialogOpen] = useState(false);
    const [versionFile, setVersionFile] = useState < File | null > (null);
    const [versionSummary, setVersionSummary] = useState("");
    const [targetDoc, setTargetDoc] = useState < DocumentItem | null > (null);
    const [versionUploading, setVersionUploading] = useState(false);

    const [signDialogOpen, setSignDialogOpen] = useState(false);
    const [targetVersion, setTargetVersion] = useState < DocumentVersionRow | null > (null);
    const [signing, setSigning] = useState(false);

    const editableByRole = useMemo(() => canCreateOrEdit(userRole), [userRole]);

    const load = async () => {
        if (!machineId) return;

        setLoading(true);
        try {
            const rows = await listMachineDocuments(machineId);
            setDocuments((rows ?? []) as DocumentItem[]);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento documenti",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineId]);

    const filteredDocuments = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return documents;

        return documents.filter((doc) => {
            const haystack = `${doc.title ?? ""} ${doc.description ?? ""} ${doc.category ?? ""}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [documents, query]);

    const ownDocuments = useMemo(
        () => filteredDocuments.filter((doc) => doc.organization_id === currentOrganizationId),
        [filteredDocuments, currentOrganizationId]
    );

    const externalDocuments = useMemo(
        () => filteredDocuments.filter((doc) => doc.organization_id !== currentOrganizationId),
        [filteredDocuments, currentOrganizationId]
    );

    const manufacturerSharedDocuments = useMemo(
        () =>
            externalDocuments.filter(
                (doc) => machineOwnerOrganizationId !== null && doc.organization_id !== machineOwnerOrganizationId
            ),
        [externalDocuments, machineOwnerOrganizationId]
    );

    const ownerOperationalDocuments = useMemo(
        () =>
            externalDocuments.filter(
                (doc) => machineOwnerOrganizationId !== null && doc.organization_id === machineOwnerOrganizationId
            ),
        [externalDocuments, machineOwnerOrganizationId]
    );

    const uploadEnabled = editableByRole && !!currentOrganizationId;

    const uploadSectionTitle = useMemo(() => {
        if (currentOrgType === "manufacturer") return "Nuovo documento costruttore";
        if (currentOrgType === "customer") return "Nuovo documento operativo cliente";
        return "Nuovo documento";
    }, [currentOrgType]);

    const uploadSectionDescription = useMemo(() => {
        if (currentOrgType === "manufacturer") {
            return "Manuali, schemi, certificati e documentazione originaria. I documenti creati dalla tua organizzazione sono modificabili solo da te.";
        }
        if (currentOrgType === "customer") {
            return "Procedure interne, report, istruzioni operative e allegati di stabilimento. La documentazione del costruttore resta in sola lettura.";
        }
        return "Carica documentazione collegata alla macchina.";
    }, [currentOrgType]);

    const getDocumentOriginLabel = (doc: DocumentItem) => {
        if (doc.organization_id === currentOrganizationId) return "Della tua organizzazione";
        if (machineOwnerOrganizationId && doc.organization_id === machineOwnerOrganizationId) return "Owner operativo";
        return "Condiviso da altra organizzazione";
    };

    const isEditableDocument = (doc: DocumentItem) => {
        return uploadEnabled && doc.organization_id === currentOrganizationId;
    };

    const onDropFile = (file: File) => {
        setNewFile(file);
        if (!newTitle.trim()) {
            setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onDropFile(file);
    };

    const handleCreateDocument = async () => {
        if (!uploadEnabled) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin e Supervisor possono creare documenti della propria organizzazione.",
                variant: "destructive",
            });
            return;
        }

        if (!currentOrganizationId) {
            toast({
                title: "Errore",
                description: "Organizzazione attiva non disponibile.",
                variant: "destructive",
            });
            return;
        }

        if (!newFile || !newTitle.trim()) {
            toast({
                title: "Errore",
                description: "Titolo e file sono obbligatori.",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            await createDocumentAndUploadV1({
                organizationId: currentOrganizationId,
                machineId,
                plantId,
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                category: newCategory,
                file: newFile,
                changeSummary: "Versione iniziale",
            });

            toast({
                title: "OK",
                description:
                    currentOrgType === "manufacturer"
                        ? "Documento costruttore caricato correttamente."
                        : "Documento operativo caricato correttamente.",
            });

            setNewFile(null);
            setNewTitle("");
            setNewDescription("");
            setNewCategory("MANUAL");
            await load();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore upload",
                description: e?.message ?? "Errore durante il caricamento del documento.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const openPreview = async (doc: DocumentItem, version: DocumentVersionRow) => {
        try {
            const url = await getSignedUrl(version.file_path, 600);
            setPreviewUrl(url);
            setPreviewTitle(`${doc.title} — v${version.version_number}`);
            setPreviewOpen(true);
        } catch (e: any) {
            toast({
                title: "Errore",
                description: e?.message ?? "Errore preview documento.",
                variant: "destructive",
            });
        }
    };

    const openNewVersionDialog = (doc: DocumentItem) => {
        if (!isEditableDocument(doc)) {
            toast({
                title: "Azione non consentita",
                description: "Puoi creare nuove versioni solo dei documenti della tua organizzazione.",
                variant: "destructive",
            });
            return;
        }

        setTargetDoc(doc);
        setVersionFile(null);
        setVersionSummary("");
        setVersionDialogOpen(true);
    };

    const handleUploadVersion = async () => {
        if (!targetDoc || !versionFile || !currentOrganizationId) return;

        if (!isEditableDocument(targetDoc)) {
            toast({
                title: "Azione non consentita",
                description: "Puoi creare nuove versioni solo dei documenti della tua organizzazione.",
                variant: "destructive",
            });
            return;
        }

        setVersionUploading(true);
        try {
            await uploadNewVersion({
                documentId: targetDoc.id,
                organizationId: currentOrganizationId,
                file: versionFile,
                changeSummary: versionSummary.trim() || null,
            });

            toast({
                title: "OK",
                description: "Nuova versione caricata correttamente.",
            });

            setVersionDialogOpen(false);
            await load();
        } catch (e: any) {
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento nuova versione.",
                variant: "destructive",
            });
        } finally {
            setVersionUploading(false);
        }
    };

    const openSignDialog = (doc: DocumentItem, version: DocumentVersionRow) => {
        if (!isEditableDocument(doc)) {
            toast({
                title: "Azione non consentita",
                description: "Puoi firmare solo versioni dei documenti della tua organizzazione.",
                variant: "destructive",
            });
            return;
        }

        setTargetDoc(doc);
        setTargetVersion(version);
        setSignDialogOpen(true);
    };

    const handleConfirmSign = async (dataUrl: string) => {
        if (!targetVersion || !targetDoc) return;

        if (!isEditableDocument(targetDoc)) {
            toast({
                title: "Azione non consentita",
                description: "Puoi firmare solo versioni dei documenti della tua organizzazione.",
                variant: "destructive",
            });
            return;
        }

        setSigning(true);
        try {
            await signDocumentVersion({
                versionId: targetVersion.id,
                signatureData: {
                    dataUrl,
                    signedAtClient: new Date().toISOString(),
                },
            });

            toast({ title: "OK", description: "Firma salvata." });
            setSignDialogOpen(false);
            await load();
        } catch (e: any) {
            toast({
                title: "Errore firma",
                description: e?.message ?? "Errore salvataggio firma.",
                variant: "destructive",
            });
        } finally {
            setSigning(false);
        }
    };

    const renderDocumentCard = (doc: DocumentItem) => {
        const versions = (doc.document_versions ?? []).slice().sort((a, b) => b.version_number - a.version_number);
        const currentVersion = versions[0] ?? null;
        const editableDoc = isEditableDocument(doc);

        return (
            <Card key={doc.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <div className="font-semibold text-foreground truncate">{doc.title}</div>
                        {doc.description && (
                            <div className="text-sm text-muted-foreground line-clamp-2">{doc.description}</div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{categoryLabel(doc.category)}</Badge>
                            <Badge variant="outline">v{doc.version_count ?? versions.length ?? 0}</Badge>
                            <Badge variant="outline">{getDocumentOriginLabel(doc)}</Badge>
                            {currentVersion?.signed_at ? (
                                <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30">
                                    Firmato
                                </Badge>
                            ) : (
                                <Badge className="bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30">
                                    Non firmato
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        {currentVersion && (
                            <Button variant="outline" size="sm" onClick={() => openPreview(doc, currentVersion)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                        )}

                        {editableDoc && (
                            <Button variant="outline" size="sm" onClick={() => openNewVersionDialog(doc)}>
                                <History className="w-4 h-4 mr-2" />
                                Nuova versione
                            </Button>
                        )}

                        {editableDoc && currentVersion && (
                            <Button variant="outline" size="sm" onClick={() => openSignDialog(doc, currentVersion)}>
                                <PenTool className="w-4 h-4 mr-2" />
                                Firma
                            </Button>
                        )}
                    </div>
                </div>

                {versions.length > 0 && (
                    <div className="mt-4 border-t border-border pt-3 space-y-2">
                        {versions.map((version) => (
                            <div key={version.id} className="flex items-center justify-between text-sm gap-3">
                                <div className="text-muted-foreground min-w-0 truncate">
                                    v{version.version_number} — {version.file_name}
                                    {version.change_summary ? ` • ${version.change_summary}` : ""}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => openPreview(doc, version)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Apri
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        );
    };

    const renderSection = ({
        title,
        description,
        icon,
        items,
        emptyMessage,
    }: {
        title: string;
        description: string;
        icon: React.ReactNode;
        items: DocumentItem[];
        emptyMessage: string;
    }) => (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <Badge variant="outline">{items.length}</Badge>
            </div>

            {items.length === 0 ? (
                <Card className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    {emptyMessage}
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{items.map(renderDocumentCard)}</div>
            )}
        </div>
    );

    if (loading) {
        return <div className="text-sm text-muted-foreground">Caricamento documenti...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="relative max-w-md w-full">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca documenti per titolo, descrizione o categoria..."
                        className="pl-9"
                    />
                </div>

                <Badge variant="outline" className="w-fit">
                    {filteredDocuments.length} documenti visibili
                </Badge>
            </div>

            <Card className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="font-semibold text-foreground">{uploadSectionTitle}</div>
                        <div className="text-sm text-muted-foreground">{uploadSectionDescription}</div>
                    </div>
                    {!uploadEnabled && (
                        <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30">
                            Sola lettura
                        </Badge>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div
                        className="rounded-xl border border-dashed border-border p-5 bg-muted/20 hover:bg-muted/30 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="flex items-center gap-3">
                            <UploadCloud className="w-5 h-5 text-muted-foreground" />
                            <div className="text-sm">
                                <div className="font-medium text-foreground">Trascina qui un file</div>
                                <div className="text-muted-foreground">oppure selezionalo manualmente</div>
                            </div>
                        </div>

                        <div className="mt-3">
                            <Input
                                type="file"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) onDropFile(file);
                                }}
                                disabled={!uploadEnabled}
                            />
                            {newFile && (
                                <div className="text-xs text-muted-foreground mt-2">
                                    Selezionato: <span className="font-mono">{newFile.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <Input
                                placeholder="Titolo documento"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                disabled={!uploadEnabled}
                            />

                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                                className="w-full border border-border bg-background rounded-md px-3 py-2 disabled:opacity-60"
                                disabled={!uploadEnabled}
                            >
                                <option value="MANUAL">Manuale</option>
                                <option value="DRAWING">Disegno</option>
                                <option value="CERTIFICATE">Certificato</option>
                                <option value="REPORT">Report</option>
                                <option value="OTHER">Altro</option>
                            </select>
                        </div>

                        <Textarea
                            placeholder="Descrizione documento (opzionale)"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            disabled={!uploadEnabled}
                            rows={3}
                        />

                        <div className="flex justify-end">
                            <Button
                                onClick={handleCreateDocument}
                                disabled={!uploadEnabled || uploading}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                <FileUp className="w-4 h-4 mr-2" />
                                {uploading ? "Upload..." : "Carica documento"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {currentOrgType === "customer" ? (
                <div className="space-y-6">
                    {renderSection({
                        title: "Documentazione del costruttore",
                        description:
                            "Manuali, schemi, certificati e documenti tecnici condivisi dal costruttore. Questi documenti sono sempre in sola lettura per il cliente finale.",
                        icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
                        items: manufacturerSharedDocuments,
                        emptyMessage: "Nessuna documentazione del costruttore disponibile per questa macchina.",
                    })}

                    {renderSection({
                        title: "Documenti operativi del cliente",
                        description:
                            "Procedure interne, report, istruzioni locali e allegati operativi della tua organizzazione.",
                        icon: <Wrench className="w-4 h-4 text-orange-500" />,
                        items: ownDocuments,
                        emptyMessage: "Non hai ancora caricato documenti operativi per questa macchina.",
                    })}
                </div>
            ) : (
                <div className="space-y-6">
                    {renderSection({
                        title: "Documenti della tua organizzazione",
                        description:
                            "Documentazione originaria del costruttore oppure documenti creati dalla tua organizzazione. Solo questi documenti sono modificabili da te.",
                        icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
                        items: ownDocuments,
                        emptyMessage: "Non ci sono ancora documenti creati dalla tua organizzazione per questa macchina.",
                    })}

                    {ownerOperationalDocuments.length > 0 &&
                        renderSection({
                            title: "Documenti operativi owner",
                            description:
                                "Documenti creati dall'organizzazione proprietaria/operativa della macchina. Sono visibili ma restano in sola lettura nel tuo contesto costruttore.",
                            icon: <Wrench className="w-4 h-4 text-orange-500" />,
                            items: ownerOperationalDocuments,
                            emptyMessage: "Nessun documento operativo owner disponibile.",
                        })}
                </div>
            )}

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{previewTitle}</DialogTitle>
                    </DialogHeader>
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-[75vh] rounded-md border border-border"
                            title={previewTitle}
                        />
                    ) : (
                        <div className="text-sm text-muted-foreground">Caricamento preview...</div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Carica nuova versione</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <Input
                            type="file"
                            onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
                            disabled={versionUploading}
                        />
                        <Textarea
                            placeholder="Descrizione modifiche (opzionale)"
                            value={versionSummary}
                            onChange={(e) => setVersionSummary(e.target.value)}
                            rows={3}
                            disabled={versionUploading}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
                                Annulla
                            </Button>
                            <Button
                                onClick={handleUploadVersion}
                                disabled={versionUploading || !versionFile}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                {versionUploading ? "Upload..." : "Carica"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Firma documento</DialogTitle>
                    </DialogHeader>
                    <SignaturePad
                        onCancel={() => setSignDialogOpen(false)}
                        onConfirm={handleConfirmSign}
                        loading={signing}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
