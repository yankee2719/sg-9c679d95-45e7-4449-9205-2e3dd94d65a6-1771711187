'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, FileText, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
    getDocumentDetail,
    getDocumentSignedUrl,
    getDocumentVersions,
    type DocumentWorkspaceDetail,
} from '@/lib/documentWorkspaceApi';
import VersionHistory from './VersionHistory';

interface DocumentDetailModalProps {
    documentId: string;
    onClose: () => void;
}

export function DocumentDetailModal({ documentId, onClose }: DocumentDetailModalProps) {
    const [detail, setDetail] = useState < DocumentWorkspaceDetail | null > (null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [currentVersionNumber, setCurrentVersionNumber] = useState < number | undefined > (undefined);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        Promise.all([getDocumentDetail(documentId), getDocumentVersions(documentId)])
            .then(([documentDetail, versions]) => {
                if (!mounted) return;
                setDetail(documentDetail);
                setCurrentVersionNumber(versions[0]?.version_number);
            })
            .catch((error) => {
                console.error('Error loading document workspace:', error);
                if (mounted) setDetail(null);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [documentId]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.document.addEventListener('keydown', handleEscape);
        const previousOverflow = window.document.body.style.overflow;
        window.document.body.style.overflow = 'hidden';

        return () => {
            window.document.removeEventListener('keydown', handleEscape);
            window.document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    const createdAtLabel = useMemo(() => {
        if (!detail?.created_at) return '—';
        return format(new Date(detail.created_at), 'PPP', { locale: it });
    }, [detail?.created_at]);

    const updatedAtLabel = useMemo(() => {
        if (!detail?.updated_at) return '—';
        return format(new Date(detail.updated_at), 'PPP p', { locale: it });
    }, [detail?.updated_at]);

    const handleDownload = async () => {
        if (!detail?.id) return;
        setDownloading(true);
        try {
            const signedUrl = await getDocumentSignedUrl(detail.id);
            if (!signedUrl) throw new Error('Signed URL non disponibile');
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Document download failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-950 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold">Dettagli documento</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label="Chiudi">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
                    ) : !detail ? (
                        <p className="text-center text-gray-500 py-12">Documento non trovato</p>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">{detail.title}</h3>
                                    {detail.description && <p className="text-muted-foreground">{detail.description}</p>}
                                </div>
                                <Button onClick={handleDownload} disabled={downloading}>
                                    <Download className="w-4 h-4 mr-2" />
                                    {downloading ? 'Apertura...' : 'Apri documento'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <MetaItem icon={<Tag className="w-4 h-4" />} label="Categoria" value={detail.category || '—'} />
                                <MetaItem icon={<FileText className="w-4 h-4" />} label="Lingua" value={detail.language || '—'} />
                                <MetaItem icon={<Calendar className="w-4 h-4" />} label="Creato il" value={createdAtLabel} />
                                <MetaItem icon={<Calendar className="w-4 h-4" />} label="Ultimo aggiornamento" value={updatedAtLabel} />
                                <MetaItem icon={<Tag className="w-4 h-4" />} label="Riferimento normativo" value={detail.regulatory_reference || '—'} />
                                <MetaItem icon={<FileText className="w-4 h-4" />} label="Macchina" value={detail.machine_label || 'Documento organizzativo'} />
                            </div>

                            <VersionHistory documentId={detail.id} currentVersionNumber={currentVersionNumber} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border p-3">
            <div className="text-muted-foreground mt-0.5">{icon}</div>
            <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="font-medium">{value}</div>
            </div>
        </div>
    );
}

export default DocumentDetailModal;
