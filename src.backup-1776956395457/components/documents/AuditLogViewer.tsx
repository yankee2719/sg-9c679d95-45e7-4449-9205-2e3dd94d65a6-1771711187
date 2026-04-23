'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Download, Edit, Trash2, FileSignature, Shield, ShieldOff, Clock, User, Filter } from 'lucide-react';
import { apiFetch } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AuditLogEntry {
    id: string;
    action: string;
    performed_at: string;
    performed_by: string;
    ip_address: string | null;
    user_agent: string | null;
    details: string | null;
    metadata?: Record<string, any> | null;
    success: boolean;
}

interface AuditLogViewerProps {
    documentId: string;
    limit?: number;
}

type ActionType = 'created' | 'viewed' | 'downloaded' | 'updated' | 'deleted' | 'signed' | 'access_granted' | 'access_revoked' | 'version_created' | 'all';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string; }> = {
    created: { icon: FileSignature, label: 'Created', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    viewed: { icon: Eye, label: 'Viewed', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    downloaded: { icon: Download, label: 'Downloaded', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
    updated: { icon: Edit, label: 'Updated', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
    deleted: { icon: Trash2, label: 'Deleted', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    signed: { icon: FileSignature, label: 'Signed', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    access_granted: { icon: Shield, label: 'Access Granted', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
    access_revoked: { icon: ShieldOff, label: 'Access Revoked', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    version_created: { icon: FileSignature, label: 'New Version', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
};

export function AuditLogViewer({ documentId, limit = 100 }: AuditLogViewerProps) {
    const { toast } = useToast();
    const [auditLog, setAuditLog] = useState < AuditLogEntry[] > ([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState < ActionType > ('all');

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        apiFetch < any > (`/api/documents/${documentId}/audit-log?limit=${limit}`)
            .then((payload) => {
                if (!mounted) return;
                setAuditLog(payload.data ?? payload.auditLog ?? []);
            })
            .catch((error) => {
                console.error('Failed to load audit log:', error);
                toast({ title: 'Load failed', description: 'Failed to load audit log', variant: 'destructive' });
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [documentId, limit, toast]);

    const filteredLog = useMemo(() => auditLog.filter((entry) => actionFilter === 'all' ? true : entry.action === actionFilter), [auditLog, actionFilter]);
    const uniqueActions = Array.from(new Set(auditLog.map((e) => e.action))).sort();

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('it-IT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

    if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Audit Trail</h3>
                    <p className="text-sm text-gray-500">{filteredLog.length} of {auditLog.length} entries</p>
                </div>
                <div className="flex gap-2">
                    <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as ActionType)}>
                        <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActions.map((action) => (<SelectItem key={action} value={action}>{ACTION_CONFIG[action]?.label || action}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {filteredLog.length === 0 ? <div className="text-center py-12 text-gray-500">No audit entries found</div> : (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4">
                        {filteredLog.map((entry) => {
                            const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.viewed;
                            const Icon = config.icon;
                            return (
                                <div key={entry.id} className="relative pl-14">
                                    <div className={`absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center ${config.bgColor}`}><Icon className={`h-3 w-3 ${config.color}`} /></div>
                                    <div className={`border rounded-lg p-4 ${entry.success ? 'border-gray-200 dark:border-gray-700' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3"><Badge variant="outline" className={config.color}>{config.label}</Badge></div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{getRelativeTime(entry.performed_at)}</div>
                                        </div>
                                        {entry.details && <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">{entry.details}</div>}
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1"><User className="h-3 w-3" /><span>User: {entry.performed_by.substring(0, 8)}...</span></div>
                                            <div className="ml-auto text-gray-400">{formatDate(entry.performed_at)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
