import { useState, useCallback } from "react";
import { Upload, Link2, Loader2, X, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentUploadProps {
  equipmentId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ equipmentId, onUploadComplete }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormData, setFileFormData] = useState({
    title: "",
    description: "",
    version: ""
  });

  const [linkFormData, setLinkFormData] = useState({
    title: "",
    description: "",
    external_url: ""
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setFileFormData(prev => ({
        ...prev,
        title: e.dataTransfer.files[0].name
      }));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileFormData(prev => ({
        ...prev,
        title: e.target.files![0].name
      }));
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Seleziona un file");
      return;
    }

    if (!fileFormData.title.trim()) {
      alert("Inserisci un titolo");
      return;
    }

    try {
      setUploading(true);

      const { documentService } = await import("@/services/documentService");
      const { supabase } = await import("@/integrations/supabase/client");

      const { path: filePath } = await documentService.uploadFile(selectedFile, equipmentId);
      const { data: { user } } = await supabase.auth.getUser();

      await documentService.create({
        equipment_id: equipmentId,
        title: fileFormData.title,
        description: fileFormData.description || null,
        file_url: filePath,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        version: fileFormData.version || null,
        uploaded_by: user?.id || null
      });

      setSelectedFile(null);
      setFileFormData({
        title: "",
        description: "",
        version: ""
      });

      setOpen(false);
      onUploadComplete();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Errore durante l'upload del file");
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkFormData.title.trim()) {
      alert("Inserisci un titolo");
      return;
    }

    if (!linkFormData.external_url.trim()) {
      alert("Inserisci un URL");
      return;
    }

    try {
      setUploading(true);

      const { documentService } = await import("@/services/documentService");
      const { supabase } = await import("@/integrations/supabase/client");

      const { data: { user } } = await supabase.auth.getUser();

      await documentService.create({
        equipment_id: equipmentId,
        title: linkFormData.title,
        description: linkFormData.description || null,
        file_url: linkFormData.external_url,
        file_type: "application/x-url",
        file_size: 0,
        uploaded_by: user?.id || null
      });

      setLinkFormData({
        title: "",
        description: "",
        external_url: ""
      });

      setOpen(false);
      onUploadComplete();
    } catch (error) {
      console.error("Error creating link:", error);
      alert("Errore durante la creazione del link");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (ext === "pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Aggiungi Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Documentazione</DialogTitle>
          <DialogDescription>
            Carica file locali o aggiungi link a documenti cloud
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Link Cloud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-4">
                  {getFileIcon(selectedFile.name)}
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    Drag file here or click to select
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    PDF, Images, DWG, DXF (max 50MB)
                  </p>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select File
                    </label>
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-title">Title *</Label>
                <Input
                  id="file-title"
                  value={fileFormData.title}
                  onChange={(e) => setFileFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., User Manual CNC Lathe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-version">Version</Label>
                <Input
                  id="file-version"
                  value={fileFormData.version}
                  onChange={(e) => setFileFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="e.g., v2.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-description">Description</Label>
                <Textarea
                  id="file-description"
                  value={fileFormData.description}
                  onChange={(e) => setFileFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <Button
              onClick={handleFileUpload}
              disabled={uploading || !selectedFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">Cloud Document URL *</Label>
                <Input
                  id="link-url"
                  type="url"
                  value={linkFormData.external_url}
                  onChange={(e) => setLinkFormData(prev => ({ ...prev, external_url: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-title">Title *</Label>
                <Input
                  id="link-title"
                  value={linkFormData.title}
                  onChange={(e) => setLinkFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Electrical Schematics on Google Drive"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-description">Description</Label>
                <Textarea
                  id="link-description"
                  value={linkFormData.description}
                  onChange={(e) => setLinkFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <Button
              onClick={handleLinkSubmit}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Add Link
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}