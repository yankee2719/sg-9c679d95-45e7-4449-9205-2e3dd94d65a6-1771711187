// ============================================================================
// STEP 8C: VERSION HISTORY COMPONENT
// ============================================================================
// Timeline di tutte le versioni di un documento con:
// - Visual timeline
// - Diff indicators (size changes)
// - Download per ogni versione
// - Change reason & summary
// - User tracking
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Clock, Download, FileText, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getDocumentService, DocumentVersion } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface VersionHistoryProps {
  documentId: string;
  currentVersionNumber?: number;
}

interface VersionWithDiff extends DocumentVersion {
  sizeDelta?: number;
  timeFromPrevious?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VersionHistory({ documentId, currentVersionNumber }: VersionHistoryProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<VersionWithDiff[]>([]);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------------------------------
  // LOAD VERSIONS
  // --------------------------------------------------------------------------

  const loadVersions = async () => {
    setLoading(true);
    try {
      const docService = getDocumentService();
      const versionHistory = await docService.getVersionHistory(documentId);

      // Calculate deltas
      const withDiffs: VersionWithDiff[] = versionHistory.map((version, index) => {
        const previousVersion = versionHistory[index + 1];
        
        return {
          ...version,
          sizeDelta: previousVersion 
            ? version.file_size_bytes - previousVersion.file_size_bytes
            : undefined,
        };
      });

      setVersions(withDiffs);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast({
        title: 'Load failed',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  // --------------------------------------------------------------------------
  // DOWNLOAD VERSION
  // --------------------------------------------------------------------------

  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      const docService = getDocumentService();
      const blob = await docService.storage.downloadDocument(version.storage_path);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `Downloading version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download this version',
        variant: 'destructive',
      });
    }
  };

  // --------------------------------------------------------------------------
  // FORMAT HELPERS
  // --------------------------------------------------------------------------

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatSizeDelta = (delta: number): { text: string; icon: JSX.Element; color: string } => {
    if (delta === 0) {
      return {
        text: 'No change',
        icon: <Minus className="h-4 w-4" />,
        color: 'text-gray-500',
      };
    }
    if (delta > 0) {
      return {
        text: `+${formatFileSize(delta)}`,
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-green-600',
      };
    }
    return {
      text: formatFileSize(delta),
      icon: <TrendingDown className="h-4 w-4" />,
      color: 'text-red-600',
    };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No version history available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Version History</h3>
          <p className="text-sm text-gray-500">
            {versions.length} version{versions.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Versions */}
        <div className="space-y-6">
          {versions.map((version, index) => {
            const isCurrent = version.version_number === currentVersionNumber;
            const sizeDelta = version.sizeDelta !== undefined 
              ? formatSizeDelta(version.sizeDelta)
              : null;

            return (
              <div key={version.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className={`
                  absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full border-2
                  ${isCurrent 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {isCurrent && (
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
                  )}
                </div>

                {/* Version card */}
                <div className={`
                  border rounded-lg p-4 transition-all
                  ${isCurrent 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }
                `}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Version {version.version_number}</span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {index === 0 && !isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.created_at)}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadVersion(version)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <div className="font-medium">{version.title}</div>
                    {version.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {version.description}
                      </div>
                    )}
                  </div>

                  {/* Change reason & summary */}
                  {(version.change_reason || version.change_summary) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {version.change_reason && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Reason:
                          </span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {version.change_reason}
                          </span>
                        </div>
                      )}
                      {version.change_summary && (
                        <div className="text-sm mt-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Changes:
                          </span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {version.change_summary}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        {/* File size */}
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {formatFileSize(version.file_size_bytes)}
                        </div>

                        {/* Size delta */}
                        {sizeDelta && (
                          <div className={`flex items-center gap-1 ${sizeDelta.color}`}>
                            {sizeDelta.icon}
                            {sizeDelta.text}
                          </div>
                        )}

                        {/* Checksum (truncated) */}
                        <div className="font-mono text-xs">
                          {version.file_checksum.substring(0, 8)}...
                        </div>
                      </div>

                      {/* Uploaded by - TODO: Replace with actual user name */}
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>User ID: {version.changed_by.substring(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="border-t pt-4 mt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{versions.length}</div>
            <div className="text-sm text-gray-500">Total Versions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(versions[0].file_size_bytes)}
            </div>
            <div className="text-sm text-gray-500">Latest Size</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {versions[0].version_number}
            </div>
            <div className="text-sm text-gray-500">Current Version</div>
          </div>
        </div>
      </div>
    </div>
  );
}
