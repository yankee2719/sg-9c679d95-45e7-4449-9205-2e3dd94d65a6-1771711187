'use client';

import { FileText, Download, History, Eye, Trash2, Filter } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { downloadAndSave } from '@/lib/documentApi';
import { formatFileSize } from '@/lib/documentUtils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';

interface DocumentListProps {
    organizationId: string;
    onDocumentClick?: (documentId: string) => void;
    onVersionHistory?: (documentId: string) => void;
    className?: string;
}

export function DocumentList({
    organizationId,
    onDocumentClick,
    onVersionHistory,
    className = ''
}: DocumentListProps) {
    const [filter, setFilter] = useState < 'all' | 'ce_only' | 'active' > ('all');
    const [downloading, setDownloading] = useState < string | null > (null);

    const { documents, loading, error, refresh } = useDocuments({
        organizationId,
        mandatoryOnly: filter === 'ce_only',
        status: filter === 'active' ? 'active' : undefined
    });

    async function handleDownload(versionId: string, filename: string) {
        setDownloading(versionId);
        try {
            await downloadAndSave(versionId, filename);
        } catch (err) {
            console.error('Download error:', err);
            alert('Errore durante il download del documento');
        } finally {
            setDownloading(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Errore nel caricamento dei documenti: {error.message}</p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header con filtri */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Documenti
                    </h3>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {documents.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Tutti
                    </button>
                    <button
                        onClick={() => setFilter('ce_only')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'ce_only'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Solo CE
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'active'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Attivi
                    </button>
                </div>
            </div>

            {/* Lista documenti */}
            {documents.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium mb-1">Nessun documento trovato</p>
                    <p className="text-sm text-gray-500">
                        {filter === 'ce_only'
                            ? 'Non ci sono documenti CE obbligatori'
                            : 'Carica il primo documento per iniziare'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.document_id}
                            className="group p-4 bg-white border border-gray-200 rounded-lg 
                hover:border-blue-300 hover:shadow-md transition-all duration-150"
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Title & Badges */}
                                    <div className="flex items-start gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {doc.document_title}
                                        </h4>
                                        {doc.mandatory_for_ce && (
                                            <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                                CE
                                            </span>
                                        )}
                                        {doc.document_code && (
                                            <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                                                {doc.document_code}
                                            </span>
                                        )}
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                        <span className="font-medium">
                                            {doc.category_name?.it || doc.category_code}
                                        </span>
                                        {doc.version_number && (
                                            <>
                                                <span className="text-gray-400">•</span>
                                                <span>v{doc.version_number}</span>
                                            </>
                                        )}
                                        {doc.file_size_bytes && (
                                            <>
                                                <span className="text-gray-400">•</span>
                                                <span>{formatFileSize(doc.file_size_bytes)}</span>
                                            </>
                                        )}
                                        {doc.uploaded_at && (
                                            <>
                                                <span className="text-gray-400">•</span>
                                                <span className="text-xs">
                                                    {formatDistanceToNow(new Date(doc.uploaded_at), {
                                                        addSuffix: true,
                                                        locale: it
                                                    })}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Filename */}
                                    {doc.filename && (
                                        <p className="text-xs text-gray-500 font-mono truncate">
                                            {doc.filename}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0 flex items-center gap-1">
                                    {doc.version_id && (
                                        <button
                                            onClick={() => handleDownload(doc.version_id!, doc.filename!)}
                                            disabled={downloading === doc.version_id}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg 
                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Download"
                                        >
                                            {downloading === doc.version_id ? (
                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}

                                    {onVersionHistory && (
                                        <button
                                            onClick={() => onVersionHistory(doc.document_id)}
                                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                            title="Storico versioni"
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                    )}

                                    {onDocumentClick && (
                                        <button
                                            onClick={() => onDocumentClick(doc.document_id)}
                                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                            title="Vedi dettagli"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}