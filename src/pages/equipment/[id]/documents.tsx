// ============================================================================
// EQUIPMENT DOCUMENTS PAGE - WITH AUTH
// ============================================================================
// File: pages/equipment/[id]/documents.tsx
// Versione con auth reale integrato
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DocumentUpload } from '@/components/Documents/DocumentUpload';
import { DocumentList } from '@/components/Documents/DocumentList';
import { VersionHistory } from '@/components/Documents/VersionHistory';
import { AuditLogViewer } from '@/components/Documents/AuditLogViewer';
import { AccessControlManager } from '@/components/Documents/AccessControlManager';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Plus, FileText, ArrowLeft, Loader2 } from 'lucide-react';

interface Document {
    id: string;
    title: string;
    description?: string;
    category: string;
    version_number: number;
    file_size_bytes: number;
    compliance_tags?: string[];
    created_at: string;
}

export default function EquipmentDocumentsPage() {
    const router = useRouter();
    const { id: equipmentId } = router.query;

    // Auth
    const { user, loading: authLoading } = useCurrentUser();

    // State
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState < Document | null > (null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Loading state
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        router.push('/login');
        return null;
    }

    // No equipment ID
    if (!equipmentId || typeof equipmentId !== 'string') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/equipment/${equipmentId}`)}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FileText className="h-8 w-8" />
                            Equipment Documents
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Manage technical documentation, manuals, and certifications
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowUploadDialog(true)}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Upload Document
                </Button>
            </div>

            {/* Document List */}
            <DocumentList
                equipmentId={equipmentId}
                key={refreshTrigger}
                onViewDocument={(doc) => {
                    setSelectedDocument(doc);
                    setShowDetailsDialog(true);
                }}
                onViewVersions={(doc) => {
                    setSelectedDocument(doc);
                    setShowDetailsDialog(true);
                }}
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            />

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Upload New Document</DialogTitle>
                    </DialogHeader>
                    <DocumentUpload
                        equipmentId={equipmentId}
                        onUploadComplete={(documentId) => {
                            console.log('Document uploaded:', documentId);
                            setShowUploadDialog(false);
                            setRefreshTrigger(prev => prev + 1);
                        }}
                        onCancel={() => setShowUploadDialog(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Document Details Dialog */}
            {selectedDocument && (
                <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                {selectedDocument.title}
                            </DialogTitle>
                            <p className="text-sm text-gray-500">
                                Version {selectedDocument.version_number} • {selectedDocument.category}
                            </p>
                        </DialogHeader>

                        <Tabs defaultValue="versions" className="mt-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="versions">Version History</TabsTrigger>
                                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                                <TabsTrigger value="access">Access Control</TabsTrigger>
                            </TabsList>

                            <TabsContent value="versions" className="mt-6">
                                <VersionHistory
                                    documentId={selectedDocument.id}
                                    currentVersionNumber={selectedDocument.version_number}
                                />
                            </TabsContent>

                            <TabsContent value="audit" className="mt-6">
                                <AuditLogViewer
                                    documentId={selectedDocument.id}
                                    limit={100}
                                />
                            </TabsContent>

                            <TabsContent value="access" className="mt-6">
                                <AccessControlManager
                                    documentId={selectedDocument.id}
                                    currentUserId={user.id}
                                />
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

