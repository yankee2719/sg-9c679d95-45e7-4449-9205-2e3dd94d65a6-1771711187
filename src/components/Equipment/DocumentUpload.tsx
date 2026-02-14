import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Plus,
    FileText,
    Trash2,
    Download,
    AlertCircle,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DocumentUploadProps {
    equipmentId: string;
    onUploadComplete?: () => void;
}

interface DocumentRecord {
    id: string;
    equipment_id: string;
    title: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
    tenant_id: string | null;
    created_at: string;
}

export function DocumentUpload({
    equipmentId,
    onUploadComplete,
}: DocumentUploadProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState < File | null > (null);
    const [title, setTitle] = useState("");

    // Document list state
    const [documents, setDocuments] = useState < DocumentRecord[] > ([]);
    const [listLoading, setListLoading] = useState(true);

    useEffect(() => {
        loadDocuments();
    }, [equipmentId]);

    const loadDocuments = async () => {
        try {
            setListLoading(true);
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("equipment_id", equipmentId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Error loading documents:", error);
        } finally {
            setListLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setLoading(true);
        try {
            // 1. Get current user's tenant_id
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profile } = await supabase
                .from("profiles")
                .select("tenant_id")
                .eq("id", user.id)
                .single();

            const tenantId = profile?.tenant_id;

            // 2. Generate storage path: tenantId/equipmentId/timestamp_filename
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${tenantId || "no-tenant"}/${equipmentId}/${Date.now()}_${safeName}`;

            // 3. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("equipment-documents")
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // 4. Insert document record in database
            const { error: dbError } = await supabase.from("documents").insert({
                equipment_id: equipmentId,
                tenant_id: tenantId,
                title: title.trim(),
                file_path: filePath,
                file_type: file.type,
                file_size: file.size,
            });

            if (dbError) {
                // Rollback: delete uploaded file
                await supabase.storage
                    .from("equipment-documents")
                    .remove([filePath]);
                throw dbError;
            }

            toast({
                title: "Successo",
                description: "Documento caricato correttamente",
            });

            setOpen(false);
            setTitle("");
            setFile(null);
            await loadDocuments();

            if (onUploadComplete) onUploadComplete();
        } catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Errore",
                description:
                    error instanceof Error
                        ? error.message
                        : "Errore durante il caricamento",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (doc: DocumentRecord) => {
        try {
            const { data, error } = await supabase.storage
                .from("equipment-documents")
                .download(doc.file_path);

            if (error) throw error;
            if (!data) throw new Error("No data");

            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = doc.title || "document";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download error:", error);
            toast({
                title: "Errore",
                description: "Errore durante il download",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (doc: DocumentRecord) => {
        if (!confirm("Sei sicuro di voler eliminare questo documento?")) return;

        try {
            await supabase.storage
                .from("equipment-documents")
                .remove([doc.file_path]);

            const { error } = await supabase
                .from("documents")
                .delete()
                .eq("id", doc.id);

            if (error) throw error;

            toast({
                title: "Eliminato",
                description: "Documento eliminato correttamente",
            });

            await loadDocuments();
        } catch (error) {
            console.error("Delete error:", error);
            toast({
                title: "Errore",
                description: "Errore durante l'eliminazione",
                variant: "destructive",
            });
        }
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Documenti</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Aggiungi Documento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Carica Documento</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Titolo documento</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="es. Manuale Tecnico v2"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="file">File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.mp4"
                                    required
                                />
                                {file && (
                                    <p className="text-xs text-muted-foreground">
                                        {file.name} ({formatFileSize(file.size)})
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={loading}
                                >
                                    Annulla
                                </Button>
                                <Button type="submit" disabled={loading || !file || !title}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Caricamento...
                                        </>
                                    ) : (
                                        "Carica"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Document List */}
            {listLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun documento caricato</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Clicca &quot;Aggiungi Documento&quot; per iniziare
                    </p>
                </div>
            ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titolo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Dimensione</TableHead>
                                <TableHead>Data caricamento</TableHead>
                                <TableHead className="text-right">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            {doc.title}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {doc.file_type?.split("/")[1]?.toUpperCase() || "-"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatFileSize(doc.file_size)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(doc.created_at).toLocaleDateString("it-IT", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDownload(doc)}
                                                title="Download"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc)}
                                                title="Elimina"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
