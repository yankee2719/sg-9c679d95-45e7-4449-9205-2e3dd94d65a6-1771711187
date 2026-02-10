// ============================================================================
// STEP 8D: AUDIT LOG VIEWER COMPONENT
// ============================================================================
// Visualizzazione audit trail completo con:
// - Timeline actions
// - Action type icons
// - User tracking
// - IP address display
// - Filter by action type
// - Export capability
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
    Eye,
    Download,
    Edit,
    Trash2,
    FileSignature,
    Shield,
    ShieldOff,
    Clock,
    User,
    MapPin,
    Monitor,
    Filter,
} from 'lucide-react';
import { getDocumentService, AuditLogEntry } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface AuditLogViewerProps {
    documentId: string;
    limit?: number;
}

type ActionType =
    | 'created'
    | 'viewed'
    | 'downloaded'
    | 'updated'
    | 'deleted'
    | 'signed'
    | 'access_granted'
    | 'access_revoked'
    | 'version_created'
    | 'all';

// ============================================================================
// ACTION CONFIG
// ============================================================================

const ACTION_CONFIG: Record<string, {
    icon: React.ElementType;
    label: string;
    color: string;
    bgColor: string;
}> = {
    created: {
        icon: FileSignature,
        label: 'Created',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    viewed: {
        icon: Eye,
        label: 'Viewed',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    downloaded: {
        icon: Download,
        label: 'Downloaded',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    updated: {
        icon: Edit,
        label: 'Updated',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    deleted: {
        icon: Trash2,
        label: 'Deleted',
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    signed: {
        icon: FileSignature,
        label: 'Signed',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    access_granted: {
        icon: Shield,
        label: 'Access Granted',
        color: 'text-teal-600',
        bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
    access_revoked: {
        icon: ShieldOff,
        label: 'Access Revoked',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    version_created: {
        icon: FileSignature,
        label: 'New Version',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AuditLogViewer({ documentId, limit = 100 }: AuditLogViewerProps) {
    const { toast } = useToast();
    const [auditLog, setAuditLog] = useState < AuditLogEntry[] > ([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState < ActionType > ('all');

    // --------------------------------------------------------------------------
    // LOAD AUDIT LOG
    // --------------------------------------------------------------------------

    const loadAuditLog = async () => {
        setLoading(true);
        try {
            const docService = getDocumentService();
            const log = await docService.getAuditLog(documentId, limit);
            setAuditLog(log);
        } catch (error) {
            console.error('Failed to load audit log:', error);
            toast({
                title: 'Load failed',
                description: 'Failed to load audit log',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLog();
    }, [documentId, limit]);

    // --------------------------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------------------------

    const filteredLog = auditLog.filter((entry) => {
        if (actionFilter === 'all') return true;
        return entry.action === actionFilter;
    });

    // Get unique action types for filter
    const uniqueActions = Array.from(new Set(auditLog.map((e) => e.action))).sort();

    // --------------------------------------------------------------------------
    // EXPORT TO CSV
    // --------------------------------------------------------------------------

    const handleExport = () => {
        const csvContent = [
            // Header
            ['Timestamp', 'Action', 'User ID', 'IP Address', 'Details', 'Success'].join(','),
            // Rows
            ...filteredLog.map((entry) =>
                [
                    entry.performed_at,
                    entry.action,
                    entry.performed_by,
                    entry.ip_address || 'N/A',
                    entry.details?.replace(/,/g, ';') || '',
                    entry.success ? 'Yes' : 'No',
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${documentId}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: 'Export successful',
            description: 'Audit log exported to CSV',
        });
    };

    // --------------------------------------------------------------------------
    // FORMAT HELPERS
    // --------------------------------------------------------------------------

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('it-IT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getRelativeTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Audit Trail</h3>
                    <p className="text-sm text-gray-500">
                        {filteredLog.length} of {auditLog.length} entries
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* Filter */}
                    <Select
                        value={actionFilter}
                        onValueChange={(value) => setActionFilter(value as ActionType)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActions.map((action) => (
                                <SelectItem key={action} value={action}>
                                    {ACTION_CONFIG[action]?.label || action}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Export */}
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Timeline */}
            {filteredLog.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No audit entries found
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                    {/* Entries */}
                    <div className="space-y-4">
                        {filteredLog.map((entry) => {
                            const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.viewed;
                            const Icon = config.icon;

                            return (
                                <div key={entry.id} className="relative pl-14">
                                    {/* Timeline icon */}
                                    <div className={`
                    absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full
                    flex items-center justify-center
                    ${config.bgColor}
                  `}>
                                        <Icon className={`h-3 w-3 ${config.color}`} />
                                    </div>

                                    {/* Entry card */}
                                    <div className={`
                    border rounded-lg p-4
                    ${entry.success
                                            ? 'border-gray-200 dark:border-gray-700'
                                            : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                                        }
                  `}>
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={config.color}>
                                                    {config.label}
                                                </Badge>
                                                {!entry.success && (
                                                    <Badge variant="destructive">Failed</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {getRelativeTime(entry.performed_at)}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        {entry.details && (
                                            <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                                {entry.details}
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                            {/* User */}
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span>User: {entry.performed_by.substring(0, 8)}...</span>
                                            </div>

                                            {/* IP Address */}
                                            {entry.ip_address && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{entry.ip_address}</span>
                                                </div>
                                            )}

                                            {/* User Agent */}
                                            {entry.user_agent && (
                                                <div className="flex items-center gap-1 max-w-xs truncate">
                                                    <Monitor className="h-3 w-3" />
                                                    <span className="truncate">{entry.user_agent}</span>
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <div className="ml-auto text-gray-400">
                                                {formatDate(entry.performed_at)}
                                            </div>
                                        </div>

                                        {/* Additional metadata */}
                                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                            <details className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <summary className="text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                                                    Additional Details
                                                </summary>
                                                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(entry.metadata, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Summary stats */}
            <div className="border-t pt-4 mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-blue-600">{auditLog.length}</div>
                        <div className="text-sm text-gray-500">Total Actions</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-600">
                            {auditLog.filter((e) => e.action === 'downloaded').length}
                        </div>
                        <div className="text-sm text-gray-500">Downloads</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-600">
                            {auditLog.filter((e) => e.action === 'viewed').length}
                        </div>
                        <div className="text-sm text-gray-500">Views</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-red-600">
                            {auditLog.filter((e) => !e.success).length}
                        </div>
                        <div className="text-sm text-gray-500">Failed</div>
                    </div>
                </div>
            </div>
        </div>
    );
}