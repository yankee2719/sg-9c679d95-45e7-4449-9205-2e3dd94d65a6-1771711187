// ============================================================================
// STEP 8B: DOCUMENT LIST COMPONENT
// ============================================================================
// Lista documenti con:
// - Filtering per category/compliance
// - Search
// - Version badges
// - Quick actions (view/download/versions)
// - Compliance indicators
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, History, Eye, Filter, Search } from 'lucide-react';
import { getDocumentService, Document, DocumentCategory } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

interface DocumentListProps {
    equipmentId: string;
    onViewDocument?: (document: Document) => void;
    onViewVersions?: (document: Document) => void;
    onRefresh?: () => void;
}

// ============================================================================
// CATEGORY LABELS
// ============================================================================

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    technical_manual: 'Technical Manual',
    user_manual: 'User Manual',
    maintenance_manual: 'Maintenance Manual',
    spare_parts_catalog: 'Spare Parts',
    wiring_diagram: 'Wiring',
    pneumatic_diagram: 'Pneumatic',
    hydraulic_diagram: 'Hydraulic',
    ce_declaration: 'CE Declaration',
    ukca_declaration: 'UKCA',
    risk_assessment: 'Risk Assessment',
    safety_datasheet: 'Safety Sheet',
    atex_certificate: 'ATEX',
    iso_certificate: 'ISO',
    contract: 'Contract',
    warranty: 'Warranty',
    insurance_policy: 'Insurance',
    quality_certificate: 'Quality Cert',
    inspection_report: 'Inspection',
    training_certificate: 'Training',
    photo: 'Photo',
    video: 'Video',
    other: 'Other',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentList({
    equipmentId,
    onViewDocument,
    onViewVersions,
    onRefresh,
}: DocumentListProps) {
    const { toast } = useToast();
    const [documents, setDocuments] = useState < Document[] > ([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState < DocumentCategory | 'all' > ('all');
    const [complianceFilter, setComplianceFilter] = useState < string > ('all');

    // --------------------------------------------------------------------------
    // LOAD DOCUMENTS
    // --------------------------------------------------------------------------

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const docService = getDocumentService();
            const docs = await docService.getDocumentsByEquipment(equipmentId, true); // current versions only
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents:', error);
            toast({
                title: 'Load failed',
                description: 'Failed to load documents',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [equipmentId]);

    // --------------------------------------------------------------------------
    // DOWNLOAD HANDLER
    // --------------------------------------------------------------------------

    const handleDownload = async (document: Document) => {
        try {
            const docService = getDocumentService();
            const { blob, filename } = await docService.downloadDocument(
                document.id,
                'current-user-id' // TODO: Get from auth
            );

            // Trigger browser download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: 'Download started',
                description: `Downloading ${filename}`,
            });
        } catch (error) {
            console.error('Download failed:', error);
            toast({
                title: 'Download failed',
                description: error instanceof Error ? error.message : 'Failed to download document',
                variant: 'destructive',
            });
        }
    };

    // --------------------------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------------------------

    const filteredDocuments = documents.filter((doc) => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !doc.title.toLowerCase().includes(query) &&
                !doc.description?.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        // Category filter
        if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
            return false;
        }

        // Compliance filter
        if (complianceFilter !== 'all') {
            if (!doc.compliance_tags?.includes(complianceFilter)) {
                return false;
            }
        }

        return true;
    });

    // Get unique compliance tags for filter
    const allComplianceTags = Array.from(
        new Set(documents.flatMap((d) => d.compliance_tags || []))
    ).sort();

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Category filter */}
                <Select
                    value={categoryFilter}
                    onValueChange={(value) => setCategoryFilter(value as DocumentCategory | 'all')}
                >
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Compliance filter */}
                {allComplianceTags.length > 0 && (
                    <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Compliance" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tags</SelectItem>
                            {allComplianceTags.map((tag) => (
                                <SelectItem key={tag} value={tag}>
                                    {tag}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Refresh button */}
                <Button variant="outline" onClick={loadDocuments}>
                    Refresh
                </Button>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
                Showing {filteredDocuments.length} of {documents.length} documents
            </div>

            {/* Documents table */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your filters'}
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Compliance</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocuments.map((doc) => (
                                <TableRow key={doc.id}>
                                    {/* Title & Description */}
                                    <TableCell>
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                                            <div>
                                                <div className="font-medium">{doc.title}</div>
                                                {doc.description && (
                                                    <div className="text-sm text-gray-500 line-clamp-1">
                                                        {doc.description}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {doc.original_filename} • {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Category */}
                                    <TableCell>
                                        <Badge variant="outline">
                                            {CATEGORY_LABELS[doc.category]}
                                        </Badge>
                                    </TableCell>

                                    {/* Compliance tags */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {doc.compliance_tags?.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>

                                    {/* Version */}
                                    <TableCell>
                                        <Badge variant="default">v{doc.version_number}</Badge>
                                    </TableCell>

                                    {/* Upload date */}
                                    <TableCell className="text-sm text-gray-500">
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {onViewDocument && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onViewDocument(doc)}
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDownload(doc)}
                                                title="Download"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            {onViewVersions && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onViewVersions(doc)}
                                                    title="Version history"
                                                >
                                                    <History className="h-4 w-4" />
                                                </Button>
                                            )}
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