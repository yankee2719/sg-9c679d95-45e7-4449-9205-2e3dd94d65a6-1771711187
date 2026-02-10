// ============================================================================
// STEP 8A: DOCUMENT UPLOAD COMPONENT
// ============================================================================
// Upload documenti con:
// - Drag & drop
// - File validation
// - Progress tracking
// - Metadata form
// - Compliance tags selector
// ============================================================================

'use client';

import { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { getDocumentService, DocumentCategory } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentUploadProps {
    equipmentId: string;
    onUploadComplete?: (documentId: string) => void;
    onCancel?: () => void;
}

interface UploadState {
    status: 'idle' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
    documentId?: string;
}

// ============================================================================
// CATEGORIES CONFIG
// ============================================================================

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
    { value: 'technical_manual', label: 'Technical Manual' },
    { value: 'user_manual', label: 'User Manual' },
    { value: 'maintenance_manual', label: 'Maintenance Manual' },
    { value: 'spare_parts_catalog', label: 'Spare Parts Catalog' },
    { value: 'wiring_diagram', label: 'Wiring Diagram' },
    { value: 'pneumatic_diagram', label: 'Pneumatic Diagram' },
    { value: 'hydraulic_diagram', label: 'Hydraulic Diagram' },
    { value: 'ce_declaration', label: 'CE Declaration' },
    { value: 'ukca_declaration', label: 'UKCA Declaration' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'safety_datasheet', label: 'Safety Datasheet' },
    { value: 'atex_certificate', label: 'ATEX Certificate' },
    { value: 'iso_certificate', label: 'ISO Certificate' },
    { value: 'other', label: 'Other' },
];

const COMPLIANCE_TAGS = ['CE', 'UKCA', 'ISO9001', 'ISO14001', 'ISO45001', 'ATEX', 'REACH', 'RoHS'];

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentUpload({ equipmentId, onUploadComplete, onCancel }: DocumentUploadProps) {
    const { toast } = useToast();
    const [uploadState, setUploadState] = useState < UploadState > ({ status: 'idle', progress: 0 });

    // Form state
    const [selectedFile, setSelectedFile] = useState < File | null > (null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState < DocumentCategory > ('technical_manual');
    const [complianceTags, setComplianceTags] = useState < string[] > ([]);
    const [documentNumber, setDocumentNumber] = useState('');
    const [tags, setTags] = useState < string > ('');

    // Drag & drop state
    const [isDragging, setIsDragging] = useState(false);

    // --------------------------------------------------------------------------
    // FILE SELECTION HANDLERS
    // --------------------------------------------------------------------------

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        // Auto-populate title if empty
        if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
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

    // --------------------------------------------------------------------------
    // COMPLIANCE TAGS TOGGLE
    // --------------------------------------------------------------------------

    const toggleComplianceTag = (tag: string) => {
        setComplianceTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    // --------------------------------------------------------------------------
    // UPLOAD HANDLER
    // --------------------------------------------------------------------------

    const handleUpload = async () => {
        if (!selectedFile) {
            toast({
                title: 'No file selected',
                description: 'Please select a file to upload',
                variant: 'destructive',
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: 'Title required',
                description: 'Please enter a document title',
                variant: 'destructive',
            });
            return;
        }

        setUploadState({ status: 'uploading', progress: 0 });

        try {
            const docService = getDocumentService();

            // Parse tags
            const tagArray = tags
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);

            const document = await docService.createDocument(
                {
                    equipmentId,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    category,
                    file: selectedFile,
                    complianceTags: complianceTags.length > 0 ? complianceTags : undefined,
                    documentNumber: documentNumber.trim() || undefined,
                    tags: tagArray.length > 0 ? tagArray : undefined,
                },
                'current-user-id' // TODO: Get from auth context
            );

            setUploadState({ status: 'success', progress: 100, documentId: document.id });

            toast({
                title: 'Upload successful',
                description: `${title} has been uploaded successfully`,
            });

            // Reset form
            setTimeout(() => {
                setSelectedFile(null);
                setTitle('');
                setDescription('');
                setComplianceTags([]);
                setDocumentNumber('');
                setTags('');
                setUploadState({ status: 'idle', progress: 0 });

                if (onUploadComplete) {
                    onUploadComplete(document.id);
                }
            }, 1500);

        } catch (error) {
            console.error('Upload failed:', error);
            setUploadState({
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Upload failed',
            });

            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        }
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    return (
        <div className="space-y-6">
            {/* File Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
          ${selectedFile ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : ''}
        `}
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
                            disabled={uploadState.status === 'uploading'}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div>
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium mb-2">
                            Drop file here or click to browse
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
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
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            Browse Files
                        </Button>
                    </div>
                )}
            </div>

            {/* Upload Status */}
            {uploadState.status !== 'idle' && (
                <div className={`p-4 rounded-lg ${uploadState.status === 'uploading' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        uploadState.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                            'bg-red-50 dark:bg-red-900/20'
                    }`}>
                    <div className="flex items-center gap-3">
                        {uploadState.status === 'uploading' && (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                                <span>Uploading... {uploadState.progress}%</span>
                            </>
                        )}
                        {uploadState.status === 'success' && (
                            <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-green-600">Upload successful!</span>
                            </>
                        )}
                        {uploadState.status === 'error' && (
                            <>
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="text-red-600">{uploadState.error}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Metadata Form */}
            {selectedFile && (
                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document title"
                            disabled={uploadState.status === 'uploading'}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                            disabled={uploadState.status === 'uploading'}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select
                            value={category}
                            onValueChange={(value) => setCategory(value as DocumentCategory)}
                            disabled={uploadState.status === 'uploading'}
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

                    {/* Compliance Tags */}
                    <div>
                        <Label>Compliance Tags</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {COMPLIANCE_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleComplianceTag(tag)}
                                    disabled={uploadState.status === 'uploading'}
                                    className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${complianceTags.includes(tag)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }
                  `}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document Number */}
                    <div>
                        <Label htmlFor="docNumber">Document Number</Label>
                        <Input
                            id="docNumber"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            placeholder="e.g., DOC-2024-001"
                            disabled={uploadState.status === 'uploading'}
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g., machinery, safety, maintenance"
                            disabled={uploadState.status === 'uploading'}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleUpload}
                            disabled={uploadState.status === 'uploading' || !title.trim()}
                            className="flex-1"
                        >
                            {uploadState.status === 'uploading' ? 'Uploading...' : 'Upload Document'}
                        </Button>
                        {onCancel && (
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={uploadState.status === 'uploading'}
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
