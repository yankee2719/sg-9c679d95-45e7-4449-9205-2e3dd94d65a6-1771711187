'use client';

import { useState, useEffect } from 'react';
import { History, Download, FileText, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { downloadAndSave } from '@/lib/documentApi';
import { formatFileSize } from '@/lib/documentUtils';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Version {
  version_id: string;
  version_number: number;
  version_label: string | null;
  filename: string;
  file_size_bytes: number;
  uploaded_by_email: string;
  uploaded_at: string;
  change_description: string | null;
  is_current: boolean;
}

interface VersionHistoryProps {
  documentId: string;
  className?: string;
}

export function VersionHistory({ documentId, className = '' }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [documentId]);

  async function loadHistory() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .rpc('get_document_history', { p_document_id: documentId });

      if (queryError) throw queryError;
      setVersions(data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(versionId: string, filename: string) {
    setDownloading(versionId);
    try {
      await downloadAndSave(versionId, filename);
    } catch (err) {
      console.error('Download error:', err);
      alert('Errore durante il download');
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">Errore: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Storico Versioni
          </h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
            {versions.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Timeline */}
      {expanded && (
        <div className="px-6 pb-6">
          {versions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nessuna versione disponibile</p>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

              {/* Versions */}
              <div className="space-y-6">
                {versions.map((version, index) => (
                  <div key={version.version_id} className="relative pl-12">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      version.is_current
                        ? 'bg-blue-600 ring-4 ring-blue-100'
                        : 'bg-white border-2 border-gray-300'
                    }`}>
                      <span className={`text-sm font-bold ${
                        version.is_current ? 'text-white' : 'text-gray-600'
                      }`}>
                        v{version.version_number}
                      </span>
                    </div>

                    {/* Version Card */}
                    <div className={`p-4 rounded-lg border transition-all ${
                      version.is_current
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              Versione {version.version_number}
                              {version.version_label && (
                                <span className="text-gray-500 font-normal"> ({version.version_label})</span>
                              )}
                            </h4>
                            {version.is_current && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                                CORRENTE
                              </span>
                            )}
                          </div>
                          
                          {/* Change Description */}
                          {version.change_description && (
                            <p className="text-sm text-gray-700 mb-2">
                              {version.change_description}
                            </p>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-mono">{version.filename}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{formatFileSize(version.file_size_bytes)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{version.uploaded_by_email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span title={format(new Date(version.uploaded_at), 'PPpp', { locale: it })}>
                                {formatDistanceToNow(new Date(version.uploaded_at), {
                                  addSuffix: true,
                                  locale: it
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Download Button */}
                        <button
                          onClick={() => handleDownload(version.version_id, version.filename)}
                          disabled={downloading === version.version_id}
                          className="ml-4 p-2 text-blue-600 hover:bg-blue-100 rounded-lg 
                            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Download questa versione"
                        >
                          {downloading === version.version_id ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}