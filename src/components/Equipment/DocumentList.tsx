import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDocumentsByEquipment, deleteDocument } from "@/services/documentService";
import { FileText, Trash2, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentListProps {
  equipmentId: string;
}

export function DocumentList({ equipmentId }: DocumentListProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [equipmentId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getDocumentsByEquipment(equipmentId);
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await deleteDocument(id);
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No documents uploaded yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  {doc.title}
                </TableCell>
                <TableCell>{doc.file_type}</TableCell>
                <TableCell>{new Date(doc.created_at || new Date()).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}