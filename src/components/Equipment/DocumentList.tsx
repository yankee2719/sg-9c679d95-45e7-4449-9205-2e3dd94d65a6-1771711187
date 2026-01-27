import { useState } from "react";
import {
  FileText,
  Image,
  File,
  Download,
  ExternalLink,
  Trash2,
  Eye,
  Link2,
  Calendar,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  external_url: string | null;
  version: string | null;
  created_at: string;
  uploaded_by: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string, fileUrl?: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const categoryLabels: Record<string, string> = {
    manual: "Manuale d'uso",
    maintenance_manual: "Manuale manutenzione",
    electrical_schema: "Schema elettrico",
    pneumatic_schema: "Schema pneumatico",
    technical_drawing: "Disegno tecnico",
    certificate: "Certificato",
    other: "Altro"
  };

  const categoryColors: Record<string, string> = {
    manual: "bg-blue-100 text-blue-800",
    maintenance_manual: "bg-green-100 text-green-800",
    electrical_schema: "bg-yellow-100 text-yellow-800",
    pneumatic_schema: "bg-purple-100 text-purple-800",
    technical_drawing: "bg-pink-100 text-pink-800",
    certificate: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800"
  };

  const getFileIcon = (doc: Document) => {
    if (doc.external_url) {
      return <Link2 className="h-8 w-8 text-blue-500" />;
    }

    const fileType = doc.file_type || "";
    if (fileType.startsWith("image/")) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (fileType === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleDownload = async (doc: Document) => {
    if (doc.external_url) {
      window.open(doc.external_url, "_blank");
    } else if (doc.file_url) {
      try {
        const { documentService } = await import("@/services/documentService");
        await documentService.downloadFile(doc.file_url, doc.file_name || "document");
      } catch (error) {
        console.error("Error downloading file:", error);
        alert("Errore durante il download");
      }
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedDoc) {
      onDelete(selectedDoc.id, selectedDoc.file_url || undefined);
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Nessun documento caricato
        </h3>
        <p className="text-sm text-gray-500">
          Carica manuali, schemi elettrici/pneumatici o aggiungi link a documenti cloud
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm truncate">
                        {doc.title}
                      </h4>
                      {doc.version && (
                        <span className="text-xs text-gray-500">
                          Versione: {doc.version}
                        </span>
                      )}
                    </div>
                    <Badge className={categoryColors[doc.category] || categoryColors.other}>
                      {categoryLabels[doc.category] || "Altro"}
                    </Badge>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    {doc.file_size && (
                      <span className="flex items-center gap-1">
                        <File className="h-3 w-3" />
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString("it-IT")}
                    </span>
                    {doc.uploaded_by?.full_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.uploaded_by.full_name}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {doc.external_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="flex-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Apri Link
                      </Button>
                    ) : (
                      <>
                        {doc.file_type?.startsWith("image/") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url || "", "_blank")}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Anteprima
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(doc)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina documento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{selectedDoc?.title}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}