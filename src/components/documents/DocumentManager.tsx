// src/components/documents/DocumentManager.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FileUp, Search, Eye, UploadCloud, PenTool, History } from "lucide-react";

function canEdit(role: string) {
    return role === "admin" || role === "supervisor";
}

const CATEGORY_LABEL: Record<string, string> = {
    MANUAL: "Manuale",
    DRAWING: "Disegno",
    CERTIFICATE: "Certificato",
    REPORT: "Report",
    OTHER: "Altro",
};

export function DocumentManager({
    organizationId,
    machineId,
    plantId,
    userRole,
}: {
    organizationId: string | null;
    machineId: string;
    plantId: string | null;
    userRole: string;
}) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [docs, setDocs] = useState < any[] > ([]);
    const [query, setQuery] = useState("");

    // upload
    const [newFile, setNewFile] = useState < File | null > (null);
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState < DocumentCategory > ("MANUAL"); // ✅ enum safe
    const [newDescription, setNewDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    // preview
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState < string | null > (null);
    const [previewTitle, setPreviewTitle] = useState < string > ("");

    // versioning
    const [versionDialogOpen, setVersionDialogOpen] = useState(false);
    const [versionFile, setVersionFile] = useState < File | null > (null);
    const [versionSummary, setVersionSummary] = useState("");
    const [targetDoc, setTargetDoc] = useState < any | null > (null);
    const [versionUploading, setVersionUploading] = useState(false);

    // signing
    const [signDialogOpen, setSignDialogOpen] = useState(false);
    const [signing, setSigning] = useState(false);
    const [targetVersion, setTargetVersion] = useState < DocumentVersionRow | null > (null);

    const editable = useMemo(() => canEdit(userRole), [userRole]);

    const load = async () => {
        if (!machineId) return;
        setLoading(true);
        try {
            const data = await listMachineDocuments(machineId);
            setDocs(data as any);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e.message ?? "Errore caricamento documenti",
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

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return docs;
        return docs.filter((d: any) => {
            const hay = `${d.title ?? ""} ${(d.description ?? "")} ${(d.category ?? "")}`.toLowerCase();
            return hay.includes(q);
        });
    }, [docs, query]);

    const openPreview = async (doc: any, version: any) => {
        try {
            const url = await getSignedUrl(version.file_path, 600);
            setPreviewUrl(url);
            setPreviewTitle(`${doc.title} — v${version.version_number}`);
            setPreviewOpen(true);
        } catch (e: any) {
            toast({ title: "Errore", description: e.message ?? "Errore preview", variant: "destructive" });
        }
    };

    const onDropFile = (file: File) => {
        setNewFile(file);
        if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onDropFile(file);
    };

    const handleCreateDoc = async () => {
        if (!editable) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono caricare.",
                variant: "destructive",
            });
            return;
        }
        if (!organizationId) {
            toast({ title: "Errore", description: "organizationId mancante", variant: "destructive" });
            return;
        }
        if (!newFile || !newTitle.trim()) {
            toast({ title: "Errore", description: "File e titolo obbligatori", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            await createDocumentAndUploadV1({
                organizationId,
                machineId,
                plantId,
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                category: newCategory, // ✅ enum safe
                file: newFile,
                changeSummary: "Prima versione",
            });

            toast({ title: "OK", description: "Documento caricato" });
            setNewFile(null);
            setNewTitle("");
            setNewDescription("");
            setNewCategory("MANUAL");
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore upload", description: e.message ?? "Errore", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const openNewVersion = (doc: any) => {
        setTargetDoc(doc);
        setVersionFile(null);
        setVersionSummary("");
        setVersionDialogOpen(true);
    };

    const handleUploadVersion = async () => {
        if (!editable) return;
        if (!organizationId) return;
        if (!targetDoc) return;
        if (!versionFile) {
            toast({ title: "Errore", description: "Seleziona un file", variant: "destructive" });
            return;
        }

        setVersionUploading(true);
        try {
            await uploadNewVersion({
                documentId: targetDoc.id,
                organizationId,
                file: versionFile,
                changeSummary: versionSummary.trim() || null,
            });

            toast({ title: "OK", description: "Nuova versione caricata" });
            setVersionDialogOpen(false);
            await load();
        } catch (e: any) {
            toast({ title: "Errore", description: e.message ?? "Errore versione", variant: "destructive" });
        } finally {
            setVersionUploading(false);
        }
    };

    const openSign = (v: any) => {
        setTargetVersion(v);
        setSignDialogOpen(true);
    };

    const handleConfirmSign = async (dataUrl: string) => {
        if (!targetVersion) return;
        setSigning(true);
        try {
            await signDocumentVersion({
                versionId: targetVersion.id,
                signatureData: { dataUrl, signedAtClient: new Date().toISOString() },
            });

            toast({ title: "OK", description: "Firma salvata" });
            setSignDialogOpen(false);
            await load();
        } catch (e: any) {
            toast({ title: "Errore firma", description: e.message ?? "Errore", variant: "destructive" });
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className="text-sm text-muted-foreground">Caricamento...</div>;

    return (
        <div className="space-y-5">
            {/* Top bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="relative max-w-md w-full">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca documenti (titolo, descrizione, categoria)..."
                        className="pl-9"
                    />
                </div>

                <Badge variant="outline" className="w-fit">
                    {filtered.length} documenti
                </Badge>
            </div>

            {/* Upload panel */}
            <Card className="rounded-2xl p-4 border border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="font-semibold text-foreground">Upload (drag & drop)</div>
                        <div className="text-sm text-muted-foreground">
                            Carica PDF / immagini / documentazione tecnica. Bucket privato con signed URL.
                        </div>
                    </div>
                    {!editable && (
                        <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30">
                            Sola lettura (servono Admin/Supervisor)
                        </Badge>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div
                        className="rounded-xl border border-dashed border-border p-5 bg-muted/20 hover:bg-muted/30 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="flex items-center gap-3">
                            <UploadCloud className="w-5 h-5 text-muted-foreground" />
                            <div className="text-sm">
                                <div className="font-medium text-foreground">Trascina qui un file</div>
                                <div className="text-muted-foreground">oppure seleziona manualmente</div>
                            </div>
                        </div>

                        <div className="mt-3">
                            <Input
                                type="file"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    if (f) onDropFile(f);
                                }}
                                disabled={!editable}
                            />
                            {newFile && (
                                <div className="text-xs text-muted-foreground mt-2">
                                    Selezionato: <span className="font-mono">{newFile.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Input
                            placeholder="Titolo documento"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            disabled={!editable}
                        />
                        <Input
                            placeholder="Descrizione (opzionale)"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            disabled={!editable}
                        />

                        {/* ✅ enum-safe values */}
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                            className="w-full border border-border bg-background rounded-md px-3 py-2 disabled:opacity-60"
                            disabled={!editable}
                        >
                            <option value="MANUAL">Manuale</option>
                            <option value="DRAWING">Disegno</option>
                            <option value="CERTIFICATE">Certificato</option>
                            <option value="REPORT">Report</option>
                            <option value="OTHER">Altro</option>
                        </select>
                    </div>

                    <div className="flex items-end justify-end">
                        <Button
                            onClick={handleCreateDoc}
                            disabled={!editable || uploading}
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                        >
                            <FileUp className="w-4 h-4 mr-2" />
                            {uploading ? "Upload..." : "Carica documento"}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Documents list */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filtered.map((doc: any) => {
                    const versions = doc.document_versions ?? [];
                    const current = versions[0];

                    return (
                        <Card key={doc.id} className="rounded-2xl border border-border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-semibold text-foreground truncate">{doc.title}</div>
                                    {doc.description && (
                                        <div className="text-sm text-muted-foreground line-clamp-2">{doc.description}</div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <Badge variant="outline">
                                            {CATEGORY_LABEL[String(doc.category).toUpperCase()] ?? doc.category}
                                        </Badge>
                                        <Badge variant="outline">v{doc.version_count ?? versions.length ?? 0}</Badge>

                                        {current?.signed_at ? (
                                            <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30">
                                                Firmato
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30">
                                                Non firmato
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    {current && (
                                        <Button variant="outline" size="sm" onClick={() => openPreview(doc, current)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Preview
                                        </Button>
                                    )}

                                    {editable && (
                                        <Button variant="outline" size="sm" onClick={() => openNewVersion(doc)}>
                                            <History className="w-4 h-4 mr-2" />
                                            Nuova versione
                                        </Button>
                                    )}

                                    {editable && current && (
                                        <Button variant="outline" size="sm" onClick={() => openSign(current)}>
                                            <PenTool className="w-4 h-4 mr-2" />
                                            Firma
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* versions (resto invariato nel tuo file originale) */}
                            {versions.length > 0 && (
                                <div className="mt-4 border-t border-border pt-3 space-y-2">
                                    {versions.map((v: any) => (
                                        <div key={v.id} className="flex items-center justify-between text-sm">
                                            <div className="text-muted-foreground">
                                                v{v.version_number} — {v.file_name}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => openPreview(doc, v)}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                Apri
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Preview dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{previewTitle}</DialogTitle>
                    </DialogHeader>
                    {previewUrl ? (
                        <iframe src={previewUrl} className="w-full h-[75vh] rounded-md border border-border" />
                    ) : (
                        <div className="text-sm text-muted-foreground">Caricamento preview...</div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Upload new version dialog */}
            <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuova versione</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <Input
                            type="file"
                            onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
                            disabled={!editable}
                        />
                        <Input
                            placeholder="Descrizione modifiche (opzionale)"
                            value={versionSummary}
                            onChange={(e) => setVersionSummary(e.target.value)}
                            disabled={!editable}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
                                Annulla
                            </Button>
                            <Button
                                onClick={handleUploadVersion}
                                disabled={!editable || versionUploading || !versionFile}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                {versionUploading ? "Upload..." : "Carica"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sign dialog */}
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