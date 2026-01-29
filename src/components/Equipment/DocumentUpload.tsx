import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { documentService } from "@/services/documentService";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Plus } from "lucide-react";
import { DocumentList } from "./DocumentList";

interface DocumentUploadProps {
  equipmentId: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ equipmentId, onUploadComplete }: DocumentUploadProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setLoading(true);
    try {
      await documentService.uploadDocument(file, equipmentId, title);
      toast({ title: "Success", description: "Document uploaded successfully" });
      setOpen(false);
      setTitle("");
      setFile(null);
      if (onUploadComplete) onUploadComplete();
      // Reload page logic or callback to refresh list would be ideal here
      // For now the parent handles it or the list reloads on mount
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Documents</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Document Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. User Manual"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">File</Label>
                <Input 
                  id="file" 
                  type="file" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DocumentList equipmentId={equipmentId} />
    </div>
  );
}