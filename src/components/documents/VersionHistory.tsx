'use client';

import { useEffect, useState } from 'react';
import { Clock, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiFetch } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    storage_path: string;
    original_filename: string;
    file_size_bytes: number;
    mime_type: string;
    checksum_sha256: string;
    change_description: string | null;
    uploaded_at: string;
    uploaded_by: string | null;
}

interface VersionHistoryProps {
    documentId: string;
    currentVersionNumber?: number;
}

interface VersionWithDiff extends DocumentVersion {
    sizeDelta?: number;
}

export function VersionHistory({ documentId, currentVersionNumber }: VersionHistoryProps) {
    const { toast } = useToast();
    const [versions, setVersions] = useState < VersionWithDiff[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        apiFetch < any > (`/api/documents/${documentId}/versions`)
            .then((payload) => {
                if (!mounted) return;
                const versionHistory = (payload.data ?? payload.versions ?? []) as DocumentVersion[];
                const withDiffs = versionHistory.map((version, index) => {
                    const previousVersion = versionHistory[index + 1];
                    return {
                        ...version,
                        sizeDelta: previousVersion ? version.file_size_bytes - previousVersion.file_size_bytes : undefined,
                    };
                });
                setVersions(withDiffs);
            })
            .catch((error) => {
                console.error('Failed to load versions:', error);
                toast({ title: 'Load failed', description: 'Failed to load version history', variant: 'destructive' });
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [documentId, toast]);

    const handleDownloadVersion = async (version: DocumentVersion) => {
        try {
            const payload = await apiFetch < any > (`/api/documents/${documentId}/download?versionId=${version.id}&redirect=0`);
            const signedUrl = payload.signedUrl || payload.data?.signedUrl;
            if (signedUrl) {
                window.open(signedUrl, '_blank', 'noopener,noreferrer');
            }
            toast({ title: 'Download started', description: `Downloading version ${version.version_number}` });
        } catch (error) {
            console.error('Download failed:', error);
            toast({ title: 'Download failed', description: 'Failed to download this version', variant: 'destructive' });
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };
    const formatSizeDelta = (delta: number) => {
        if (delta === 0) return { text: 'No change', icon: <Minus className="h-4 w-4" />, color: 'text-gray-500' };
        if (delta > 0) return { text: `+${formatFileSize(delta)}`, icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-600' };
        return { text: formatFileSize(delta), icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-600' };
    };
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" /></div>;
    if (versions.length === 0) return <div className="py-12 text-center text-gray-500">No version history available</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold">Version History</h3><p className="text-sm text-gray-500">{versions.length} versions available</p></div></div>
            <div className="relative">
                <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-6">
                    {versions.map((version) => {
                        const isCurrent = version.version_number === currentVersionNumber;
                        const sizeDelta = version.sizeDelta !== undefined ? formatSizeDelta(version.sizeDelta) : null;
                        return (
                            <div key={version.id} className="relative pl-14">
                                <div className={`absolute left-3.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 ${isCurrent ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`} />
                                <div className="rounded-lg border p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2"><Badge variant={isCurrent ? 'default' : 'secondary'}>v{version.version_number}</Badge>{isCurrent && <Badge>Current</Badge>}</div>
                                            <div className="text-sm text-muted-foreground">{version.original_filename}</div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span>{formatFileSize(version.file_size_bytes)}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(version.uploaded_at)}</span>
                                                {sizeDelta && <span className={`flex items-center gap-1 ${sizeDelta.color}`}>{sizeDelta.icon}{sizeDelta.text}</span>}
                                            </div>
                                            {version.change_description && <div className="text-sm text-muted-foreground">{version.change_description}</div>}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => void handleDownloadVersion(version)}><Download className="mr-2 h-4 w-4" />Download</Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VersionHistory;
