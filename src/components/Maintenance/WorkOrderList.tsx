'use client';

import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
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

interface WorkOrderListProps {
    equipmentId?: string;
    myOrders?: boolean;
    onViewWorkOrder?: (workOrder: WorkOrder) => void;
    onRefresh?: () => void;
}

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

    const loadWorkOrders = async () => {
        setLoading(true);
        try {
            const session = await authService.getCurrentSession();
            if (!session?.access_token) throw new Error('Not authenticated');

            const params = new URLSearchParams();
            if (equipmentId) params.append('machine_id', equipmentId);
            if (myOrders) params.append('my_orders', 'true');
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await fetch(`/api/work-orders?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error || 'Failed to load work orders');

            const data = (payload?.workOrders || payload?.data || []) as WorkOrder[];
            setWorkOrders(data);
        } catch (error) {
            console.error('Failed to load work orders:', error);
            setWorkOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentId, myOrders, statusFilter]);

    const filteredWorkOrders = useMemo(() => {
        return workOrders.filter((wo) => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    wo.title?.toLowerCase().includes(query) ||
                    (wo.wo_number ?? '').toLowerCase().includes(query) ||
                    wo.description?.toLowerCase().includes(query);

                if (!matchesSearch) return false;
            }

            if (priorityFilter !== 'all' && wo.priority !== priorityFilter) {
                return false;
            }

            return true;
        });
    }, [priorityFilter, searchQuery, workOrders]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by WO number, title, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

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

                {onRefresh && (
                    <Button variant="outline" onClick={() => { loadWorkOrders(); onRefresh(); }}>
                        Refresh
                    </Button>
                )}
            </div>

            <div className="text-sm text-gray-600">
                {filteredWorkOrders.length} work order{filteredWorkOrders.length !== 1 ? 's' : ''} found
            </div>

            {filteredWorkOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No work orders found
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>WO #</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Scheduled</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWorkOrders.map((wo) => {
                            const statusConfig = getStatusConfig((wo.status ?? 'draft') as WorkOrderStatus);
                            const priorityConfig = getPriorityConfig((wo.priority ?? 'medium') as MaintenancePriority);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <TableRow key={wo.id}>
                                    <TableCell className="font-mono text-sm">
                                        {wo.wo_number || wo.id.slice(0, 8).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{wo.title}</div>
                                            {wo.description && (
                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                    {wo.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${statusConfig.color} text-white`}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {statusConfig.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={priorityConfig.color}>
                                            {priorityConfig.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {wo.scheduled_start
                                            ? formatDistanceToNow(new Date(wo.scheduled_start), { addSuffix: true })
                                            : wo.scheduled_date
                                                ? formatDistanceToNow(new Date(wo.scheduled_date), { addSuffix: true })
                                                : 'Not scheduled'}
                                    </TableCell>
                                    <TableCell>
                                        {wo.assigned_to || 'Unassigned'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {onViewWorkOrder && (
                                            <Button variant="outline" size="sm" onClick={() => onViewWorkOrder(wo)}>
                                                View
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
