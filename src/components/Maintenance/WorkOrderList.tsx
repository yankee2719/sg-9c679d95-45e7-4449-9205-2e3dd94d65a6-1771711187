// ============================================================================
// WORK ORDER LIST COMPONENT
// ============================================================================
// File: src/components/Maintenance/WorkOrderList.tsx
// Lista work orders con filtri e ricerca
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderStatus, MaintenancePriority } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Search, Filter, Calendar, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface WorkOrderListProps {
    equipmentId?: string;
    myOrders?: boolean;
    onViewWorkOrder?: (workOrder: WorkOrder) => void;
    onRefresh?: () => void;
}

// ============================================================================
// HELPER: Status Badge
// ============================================================================

const getStatusConfig = (status: WorkOrderStatus) => {
    const configs = {
        draft: { label: 'Draft', color: 'bg-gray-500', icon: Clock },
        scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: Calendar },
        assigned: { label: 'Assigned', color: 'bg-cyan-500', icon: Clock },
        in_progress: { label: 'In Progress', color: 'bg-yellow-500', icon: AlertCircle },
        paused: { label: 'Paused', color: 'bg-orange-500', icon: AlertCircle },
        completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle2 },
        approved: { label: 'Approved', color: 'bg-emerald-600', icon: CheckCircle2 },
        cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle },
    };
    return configs[status] || configs.draft;
};

const getPriorityConfig = (priority: MaintenancePriority) => {
    const configs = {
        critical: { label: 'Critical', color: 'text-red-600 bg-red-100' },
        high: { label: 'High', color: 'text-orange-600 bg-orange-100' },
        medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
        low: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
    };
    return configs[priority] || configs.medium;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkOrderList({
    equipmentId,
    myOrders = false,
    onViewWorkOrder,
    onRefresh,
}: WorkOrderListProps) {
    const [workOrders, setWorkOrders] = useState < WorkOrder[] > ([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState < string > ('all');
    const [priorityFilter, setPriorityFilter] = useState < string > ('all');

    // --------------------------------------------------------------------------
    // LOAD WORK ORDERS
    // --------------------------------------------------------------------------

    const loadWorkOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (equipmentId) {
                params.append('machine_id', equipmentId);
            }

            if (myOrders) {
                params.append('my_orders', 'true');
            }

            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(`/api/work-orders?${params.toString()}`, {
                credentials: 'include',
                headers: session?.access_token
                    ? { Authorization: `Bearer ${session.access_token}` }
                    : undefined,
            });

            if (!res.ok) throw new Error('Failed to load work orders');

            const { workOrders: data } = await res.json();
            setWorkOrders(data);
        } catch (error) {
            console.error('Failed to load work orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkOrders();
    }, [equipmentId, myOrders, statusFilter]);

    // --------------------------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------------------------

    const filteredWorkOrders = workOrders.filter((wo) => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                wo.title.toLowerCase().includes(query) ||
                (wo.wo_number || '').toLowerCase().includes(query) ||
                wo.description?.toLowerCase().includes(query);

            if (!matchesSearch) return false;
        }

        // Priority filter
        if (priorityFilter !== 'all' && wo.priority !== priorityFilter) {
            return false;
        }

        return true;
    });

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
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-center">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by WO number, title, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>

                {/* Refresh */}
                {onRefresh && (
                    <Button variant="outline" onClick={() => { loadWorkOrders(); onRefresh(); }}>
                        Refresh
                    </Button>
                )}
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
                Showing {filteredWorkOrders.length} of {workOrders.length} work orders
            </div>

            {/* Table */}
            {filteredWorkOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">No work orders found</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>WO Number</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Scheduled</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWorkOrders.map((wo) => {
                                const statusConfig = getStatusConfig(wo.status);
                                const priorityConfig = getPriorityConfig(wo.priority);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <TableRow key={wo.id} className="cursor-pointer hover:bg-gray-50">
                                        {/* WO Number */}
                                        <TableCell className="font-mono text-sm font-medium">
                                            {wo.wo_number || `WO-${wo.id.slice(0, 8).toUpperCase()}`}
                                        </TableCell>

                                        {/* Title */}
                                        <TableCell>
                                            <div className="max-w-xs">
                                                <div className="font-medium truncate">{wo.title}</div>
                                                {wo.description && (
                                                    <div className="text-sm text-gray-500 truncate">
                                                        {wo.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <Badge className={`${statusConfig.color} text-white gap-1`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusConfig.label}
                                            </Badge>
                                        </TableCell>

                                        {/* Priority */}
                                        <TableCell>
                                            <Badge variant="outline" className={priorityConfig.color}>
                                                {priorityConfig.label}
                                            </Badge>
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell className="text-sm capitalize">
                                            {(wo.wo_type || wo.work_type).replace('_', ' ')}
                                        </TableCell>

                                        {/* Scheduled */}
                                        <TableCell className="text-sm text-gray-500">
                                            {wo.scheduled_start ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(wo.scheduled_start).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Not scheduled</span>
                                            )}
                                        </TableCell>

                                        {/* Created */}
                                        <TableCell className="text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onViewWorkOrder?.(wo)}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
