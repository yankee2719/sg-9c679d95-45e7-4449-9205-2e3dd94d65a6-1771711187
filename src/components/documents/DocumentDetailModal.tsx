'use client';

import { useEffect, useState } from 'react';
import { X, Download, FileText, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { documentWorkspaceApi } from '@/lib/documentWorkspaceApi';
import { formatFileSize } from '@/lib/documentUtils';
import { VersionHistory } from './VersionHistory';

interface DocumentDetailModalProps {
    documentId: string;
    onClose: () => void;
}

interface DetailState {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    updated_at: string | null;
    created_at: string | null;
    version_count: number | null;
    file_size: number | null;
    can_manage?: boolean;
}

function mapCategory(value: string | null | undefined) {
    return value || 'other';
}

function mapLanguage(value: string | null | undefined) {
    return (value || 'it').toUpperCase();
}

function formatDateSafe(value: string | null | undefined) {
    if (!value) return '—';
    try {
        return format(new Date(value), 'PPp', { locale: it });
    } catch {
        return value;
    }
}

export function DocumentDetailModal({ documentId, onClose }: DocumentDetailModalProps) {
    const [document, setDocument] = useState < DetailState | null > (null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [currentVersionId, setCurrentVersionId] = useState < string | null > (null);
    const [currentVersionNumber, setCurrentVersionNumber] = useState < number | undefined > (undefined);

    useEffect(() => {
        let mounted = true;
        async function loadDocument() {
            setLoading(true);
            try {
                const [detailPayload, versionsPayload] = await Promise.all([
                    documentWorkspaceApi.getDocumentDetail(documentId),
                    documentWorkspaceApi.getDocumentVersions(documentId),
                ]);
                if (!mounted) return;
                const detail = detailPayload.document;
                const versions = versionsPayload.data ?? [];
                setDocument({
                    id: detail.id,
                    title: detail.title,
                    description: detail.description,
                    category: detail.category,
                    language: detail.language,
                    regulatory_reference: detail.regulatory_reference,
                    updated_at: detail.updated_at,
                    created_at: detail.created_at,
                    version_count: detail.version_count,
                    file_size: detail.file_size,
                    can_manage: detail.can_manage,
                });
                setCurrentVersionId(versions[0]?.id ?? null);
                setCurrentVersionNumber(typeof versions[0]?.version_number === 'number' ? versions[0].version_number : undefined);
            } catch (err) {
                console.error('Error loading document:', err);
                if (!mounted) return;
                setDocument(null);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        void loadDocument();
        return () => { mounted = false; };
    }, [documentId]);

    async function handleDownload() {
        if (!currentVersionId) return;
        setDownloading(true);
        try {
            await documentWorkspaceApi.openDocument(documentId, currentVersionId);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dettaglio documento</h2>
                        <p className="text-sm text-gray-500">Metadati e storico versioni</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
                </div>

                <div className="max-h-[calc(90vh-144px)] overflow-y-auto px-6 py-6">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500">Caricamento...</div>
                    ) : !document ? (
                        <div className="py-12 text-center text-gray-500">Documento non trovato</div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{document.title || 'Documento'}</h3>
                                {document.description && <p className="text-gray-600 dark:text-gray-300">{document.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Categoria</p><p className="font-semibold text-gray-900 dark:text-gray-100">{mapCategory(document.category)}</p></div></div>
                                <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Lingua</p><p className="font-semibold text-gray-900 dark:text-gray-100">{mapLanguage(document.language)}</p></div></div>
                                <div className="flex items-start gap-3"><Calendar className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Creato il</p><p className="font-semibold text-gray-900 dark:text-gray-100">{formatDateSafe(document.created_at)}</p></div></div>
                                <div className="flex items-start gap-3"><Calendar className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Aggiornato il</p><p className="font-semibold text-gray-900 dark:text-gray-100">{formatDateSafe(document.updated_at)}</p></div></div>
                                <div className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Versioni</p><p className="font-semibold text-gray-900 dark:text-gray-100">{document.version_count ?? '—'}</p></div></div>
                                <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Dimensione</p><p className="font-semibold text-gray-900 dark:text-gray-100">{document.file_size ? formatFileSize(document.file_size) : '—'}</p></div></div>
                                {document.regulatory_reference && <div className="col-span-2 flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="text-sm text-gray-500">Riferimento normativo</p><p className="font-semibold text-gray-900 dark:text-gray-100">{document.regulatory_reference}</p></div></div>}
                            </div>

                            <VersionHistory documentId={documentId} currentVersionNumber={currentVersionNumber} />
                        </div>
                    )}
                </div>

                {document && currentVersionId && (
                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
                        <button
                            onClick={() => void handleDownload()}
                            disabled={downloading}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            {downloading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Download className="h-4 w-4" />}Download
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentDetailModal;
