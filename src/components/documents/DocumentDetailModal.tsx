'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, User, Tag, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { downloadAndSave } from '@/lib/documentApi';
import { formatFileSize } from '@/lib/documentUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { VersionHistory } from './VersionHistory';

interface DocumentDetail {
    document_id: string;
    document_code: string | null;
    document_title: string;
    description: string | null;
    status: string;
    language_code: string;
    category_code: string;
    category_name: any;
    mandatory_for_ce: boolean;
    regulatory_reference: string | null;
    validity_start: string | null;
    validity_end: string | null;
    version_number: number | null;
    filename: string | null;
    file_size_bytes: number | null;
    uploaded_at: string | null;
    uploaded_by_email: string | null;
    checksum_sha256: string | null;
    created_at: string;
    version_id: string | null;
}

interface DocumentDetailModalProps {
    documentId: string;
    onClose: () => void;
}

export function DocumentDetailModal({ documentId, onClose }: DocumentDetailModalProps) {
    const [document, setDocument] = useState < DocumentDetail | null > (null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        loadDocument();
    }, [documentId]);

    async function loadDocument() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('current_document_versions')
                .select('*')
                .eq('document_id', documentId)
                .single();

            if (error) throw error;
            setDocument(data);
        } catch (err) {
            console.error('Error loading document:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDownload() {
        if (!document?.version_id || !document.filename) return;

        setDownloading(true);
        try {
            await downloadAndSave(document.version_id, document.filename);
        } catch (err) {
            alert('Errore durante il download');
        } finally {
            setDownloading(false);
        }
    }

    // Close on ESC key
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Dettagli Documento</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        aria-label="Chiudi"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                        </div>
                    ) : !document ? (
                        <p className="text-center text-gray-500 py-12">Documento non trovato</p>
                    ) : (
                        <div className="space-y-6">
                            {/* Title & Status */}
                            <div>
                                <div className="flex items-start gap-3 mb-2">
                                    <h3 className="text-2xl font-bold text-gray-900 flex-1">
                                        {document.document_title}
                                    </h3>
                                    {document.mandatory_for_ce && (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full">
                                            CE Obbligatorio
                                        </span>
                                    )}
                                </div>
                                {document.description && (
                                    <p className="text-gray-700">{document.description}</p>
                                )}
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {document.document_code && (
                                    <div className="flex items-start gap-3">
                                        <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-gray-500">Codice Documento</p>
                                            <p className="font-mono font-semibold text-gray-900">{document.document_code}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Categoria</p>
                                        <p className="font-semibold text-gray-900">
                                            {document.category_name?.it || document.category_code}
                                        </p>
                                    </div>
                                </div>

                                {document.regulatory_reference && (
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-gray-500">Riferimento Normativo</p>
                                            <p className="font-semibold text-gray-900">{document.regulatory_reference}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Data Creazione</p>
                                        <p className="font-semibold text-gray-900">
                                            {format(new Date(document.created_at), 'PPP', { locale: it })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Stato</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${document.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : document.status === 'draft'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {document.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-gray-500">Lingua</p>
                                        <p className="font-semibold text-gray-900">
                                            {document.language_code.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Version Info */}
                            {document.version_id && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-semibold text-blue-900 mb-3">Versione Corrente</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">Versione:</span>
                                            <span className="font-semibold text-gray-900">v{document.version_number}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">File:</span>
                                            <span className="font-mono text-gray-900">{document.filename}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">Dimensione:</span>
                                            <span className="font-semibold text-gray-900">
                                                {formatFileSize(document.file_size_bytes!)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">Caricato da:</span>
                                            <span className="font-semibold text-gray-900">{document.uploaded_by_email}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">Data Upload:</span>
                                            <span className="font-semibold text-gray-900">
                                                {format(new Date(document.uploaded_at!), 'PPp', { locale: it })}
                                            </span>
                                        </div>
                                        {document.checksum_sha256 && (
                                            <div className="mt-2 pt-2 border-t border-blue-300">
                                                <p className="text-xs text-gray-600 mb-1">Checksum SHA-256:</p>
                                                <p className="text-xs font-mono text-gray-800 break-all">
                                                    {document.checksum_sha256}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Version History */}
                            <VersionHistory documentId={documentId} />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {document?.version_id && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            Chiudi
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2 font-medium transition-colors"
                        >
                            {downloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Download...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Download
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}