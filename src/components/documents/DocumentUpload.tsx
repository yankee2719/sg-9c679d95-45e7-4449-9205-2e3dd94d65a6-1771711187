"use client";

import { useState } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";
import {
    createDocumentAndUploadV1,
    DocumentCategory,
} from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
    organizationId: string;
    machineId?: string;
    plantId?: string;
    onUploadComplete?: (documentId: string) => void;
    onCancel?: () => void;
}

interface UploadState {
    status: "idle" | "uploading" | "success" | "error";
    progress: number;
    error?: string;
    documentId?: string;
}

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
    { value: "MANUAL", label: "Manual" },
    { value: "DRAWING", label: "Drawing" },
    { value: "CERTIFICATE", label: "Certificate" },
    { value: "REPORT", label: "Report" },
    { value: "OTHER", label: "Other" },
];

const COMPLIANCE_TAGS = [
    "CE",
    "UKCA",
    "ISO9001",
    "ISO14001",
    "ISO45001",
    "ATEX",
    "REACH",
    "RoHS",
];

export function DocumentUpload({
    organizationId,
    machineId,
    plantId,
    onUploadComplete,
    onCancel,
}: DocumentUploadProps) {
    const { toast } = useToast();

    const [uploadState, setUploadState] = useState < UploadState > ({
        status: "idle",
        progress: 0,
    });

    const [selectedFile, setSelectedFile] = useState < File | null > (null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState < DocumentCategory > ("MANUAL");
    const [complianceTags, setComplianceTags] = useState < string[] > ([]);
    const [tags, setTags] = useState("");
    const [isMandatory, setIsMandatory] = useState(false);
    const [changeSummary, setChangeSummary] = useState("");
    const [language, setLanguage] = useState("it");
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const toggleComplianceTag = (tag: string) => {
        setComplianceTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast({
                title: "No file selected",
                description: "Please select a file to upload",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Title required",
                description: "Please enter a document title",
                variant: "destructive",
            });
            return;
        }

        if (!organizationId) {
            toast({
                title: "Missing organization",
                description: "Organization context is required",
                variant: "destructive",
            });
            return;
        }

        setUploadState({ status: "uploading", progress: 0 });

        try {
            const tagArray = tags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);

            const mergedTags = [...tagArray, ...complianceTags].filter(
                (value, index, arr) => arr.indexOf(value) === index
            );

            const result = await createDocumentAndUploadV1({
                organizationId,
                machineId: machineId ?? null,
                plantId: plantId ?? null,
                title: title.trim(),
                description: description.trim() || null,
                category,
                file: selectedFile,
                changeSummary: changeSummary.trim() || null,
                language,
                isMandatory,
                tags: mergedTags,
            });

            setUploadState({
                status: "success",
                progress: 100,
                documentId: result.document.id,
            });

            toast({
                title: "Upload successful",
                description: `${title} has been uploaded successfully`,
            });

            setTimeout(() => {
                setSelectedFile(null);
                setTitle("");
                setDescription("");
                setCategory("MANUAL");
                setComplianceTags([]);
                setTags("");
                setIsMandatory(false);
                setChangeSummary("");
                setLanguage("it");
                setUploadState({ status: "idle", progress: 0 });

                if (onUploadComplete) {
                    onUploadComplete(result.document.id);
                }
            }, 1200);
        } catch (error) {
            console.error("Upload failed:", error);

            setUploadState({
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed",
            });

            toast({
                title: "Upload failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-700"
                    } ${selectedFile ? "bg-green-50 dark:bg-green-900/20 border-green-500" : ""}`}
            >
                {selectedFile ? (
                    <div className="flex items-center justify-center gap-4">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div className="text-left">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFile(null)}
                            disabled={uploadState.status === "uploading"}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div>
                        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                        <p className="mb-2 text-lg font-medium">Drop file here or click to browse</p>
                        <p className="mb-4 text-sm text-gray-500">
                            PDF, Images, Office documents (Max 50MB)
                        </p>
                        <Input
                            type="file"
                            onChange={handleFileInput}
                            className="hidden"
                            id="file-input"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                        />
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById("file-input")?.click()}
                        >
                            Browse Files
                        </Button>
                    </div>
                )}
            </div>

            {uploadState.status !== "idle" && (
                <div
                    className={`rounded-lg p-4 ${uploadState.status === "uploading"
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : uploadState.status === "success"
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        {uploadState.status === "uploading" && (
                            <>
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
                                <span>Uploading...</span>
                            </>
                        )}
                        {uploadState.status === "success" && (
                            <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-green-600">Upload successful!</span>
                            </>
                        )}
                        {uploadState.status === "error" && (
                            <>
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="text-red-600">{uploadState.error}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {selectedFile && (
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document title"
                            disabled={uploadState.status === "uploading"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                            disabled={uploadState.status === "uploading"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select
                            value={category}
                            onValueChange={(value) => setCategory(value as DocumentCategory)}
                            disabled={uploadState.status === "uploading"}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                            value={language}
                            onValueChange={setLanguage}
                            disabled={uploadState.status === "uploading"}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="it">Italiano</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="es">Español</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Compliance Tags</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {COMPLIANCE_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleComplianceTag(tag)}
                                    disabled={uploadState.status === "uploading"}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${complianceTags.includes(tag)
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="changeSummary">Change summary</Label>
                        <Input
                            id="changeSummary"
                            value={changeSummary}
                            onChange={(e) => setChangeSummary(e.target.value)}
                            placeholder="Optional summary for version 1"
                            disabled={uploadState.status === "uploading"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. manual, safety, maintenance"
                            disabled={uploadState.status === "uploading"}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={isMandatory}
                            onChange={(e) => setIsMandatory(e.target.checked)}
                            disabled={uploadState.status === "uploading"}
                        />
                        Mandatory document
                    </label>

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleUpload}
                            disabled={uploadState.status === "uploading" || !title.trim()}
                            className="flex-1"
                        >
                            {uploadState.status === "uploading" ? "Uploading..." : "Upload Document"}
                        </Button>

                        {onCancel && (
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={uploadState.status === "uploading"}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}