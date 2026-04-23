'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Download, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    getDocumentSignedUrl,
    getDocumentVersions,
    type DocumentWorkspaceVersion,
} from '@/lib/documentWorkspaceApi';

interface VersionHistoryProps {
    documentId: string;
    currentVersionNumber?: number;
}

interface VersionWithDiff extends DocumentWorkspaceVersion {
    sizeDelta?: number;
}

export function VersionHistory({ documentId, currentVersionNumber }: VersionHistoryProps) {
    const { toast } = useToast();
    const [versions, setVersions] = useState<VersionWithDiff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        getDocumentVersions(documentId)
            .then((rows) => {
                if (!mounted) return;
                const withDiffs = rows.map((version, index) => {
                    const previous = rows[index + 1];
                    return {
                        ...version,
                        sizeDelta:
                            previous?.file_size_bytes != null && version.file_size_bytes != null
                                ? version.file_size_bytes - previous.file_size_bytes
                                : undefined,
                    };
                });
                setVersions(withDiffs);
            })
            .catch((error) => {
                console.error('Failed to load versions:', error);
                toast({
                    title: 'Errore caricamento versioni',
                    description: 'Impossibile recuperare lo storico versioni.',
                    variant: 'destructive',
                });
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [documentId, toast]);

    const effectiveCurrentVersion = useMemo(() => {
        if (currentVersionNumber != null) return currentVersionNumber;
        return versions[0]?.version_number ?? null;
    }, [currentVersionNumber, versions]);

    const formatFileSize = (bytes?: number | null) => {
        if (!bytes || bytes <= 0) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const formatSizeDelta = (delta?: number) => {
        if (delta == null || delta === 0) {
            return { text: 'Nessuna variazione', icon: <Minus className="h-4 w-4" />, color: 'text-gray-500' };
        }
        if (delta > 0) {
            return { text: `+${formatFileSize(delta)}`, icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-600' };
        }
        return { text: formatFileSize(Math.abs(delta)), icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-600' };
    };

    const handleDownload = async (version: DocumentWorkspaceVersion) => {
        try {
            const signedUrl = await getDocumentSignedUrl(documentId, version.id);
            if (!signedUrl) throw new Error('Signed URL non disponibile');
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Version download failed:', error);
            toast({
                title: 'Download fallito',
                description: 'Impossibile scaricare la versione selezionata.',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    }

    if (versions.length === 0) {
        return <div className="text-center py-12 text-gray-500">Nessuna versione disponibile</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Storico versioni</h3>
                <p className="text-sm text-gray-500">{versions.length} versioni disponibili</p>
            </div>

            <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-6">
                    {versions.map((version) => {
                        const isCurrent = version.version_number === effectiveCurrentVersion;
                        const delta = formatSizeDelta(version.sizeDelta);
                        return (
                            <div key={version.id} className="relative pl-14">
                                <div className={`absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full border-2 ${isCurrent ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`} />
                                <div className="border rounded-lg p-4 bg-background">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={isCurrent ? 'default' : 'secondary'}>v{version.version_number}</Badge>
                                                {isCurrent && <Badge>Corrente</Badge>}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{version.original_filename || 'Versione senza nome file'}</div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span>{formatFileSize(version.file_size_bytes)}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(version.uploaded_at).toLocaleString('it-IT')}</span>
                                                <span className={`flex items-center gap-1 ${delta.color}`}>{delta.icon}{delta.text}</span>
                                            </div>
                                            {version.change_description && <div className="text-sm text-muted-foreground">{version.change_description}</div>}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleDownload(version)}>
                                            <Download className="mr-2 h-4 w-4" />Scarica
                                        </Button>
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
