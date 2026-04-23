// ============================================================================
// WORK ORDER DETAIL COMPONENT
// ============================================================================
// File: src/components/Maintenance/WorkOrderDetail.tsx
// Vista dettagliata work order con tabs e azioni
// ============================================================================

'use client';

import { useState } from 'react';
import { WorkOrder, WorkOrderStatus } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkOrderChecklist } from './WorkOrderChecklist';
import {
    Play,
    Pause,
    CheckCircle2,
    CheckCheck,
    XCircle,
    Clock,
    User,
    Calendar,
    AlertCircle,
    FileText,
    Wrench,
    Camera,
    History,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface WorkOrderDetailProps {
    workOrder: WorkOrder;
    onStatusChange: (newStatus: WorkOrderStatus, reason?: string) => Promise<void>;
    onUpdate: (updates: any) => Promise<void>;
    onRefresh: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getStatusConfig = (status: WorkOrderStatus) => {
    const configs = {
        draft: { label: 'Draft', color: 'bg-gray-500', icon: Clock },
        scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: Calendar },
        assigned: { label: 'Assigned', color: 'bg-cyan-500', icon: User },
        in_progress: { label: 'In Progress', color: 'bg-yellow-500', icon: AlertCircle },
        paused: { label: 'Paused', color: 'bg-orange-500', icon: Pause },
        completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle2 },
        approved: { label: 'Approved', color: 'bg-emerald-600', icon: CheckCheck },
        cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle },
    };
    return configs[status] || configs.draft;
};

const getPriorityColor = (priority: string) => {
    const colors = {
        critical: 'text-red-600 bg-red-100',
        high: 'text-orange-600 bg-orange-100',
        medium: 'text-yellow-600 bg-yellow-100',
        low: 'text-gray-600 bg-gray-100',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkOrderDetail({
    workOrder,
    onStatusChange,
    onUpdate,
    onRefresh,
}: WorkOrderDetailProps) {
    const [loading, setLoading] = useState(false);
    const statusConfig = getStatusConfig(workOrder.status);
    const StatusIcon = statusConfig.icon;

    // --------------------------------------------------------------------------
    // STATUS ACTIONS
    // --------------------------------------------------------------------------

    const handleStatusChange = async (newStatus: WorkOrderStatus) => {
        setLoading(true);
        try {
            await onStatusChange(newStatus);
            onRefresh();
        } catch (error) {
            console.error('Status change failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableActions = () => {
        const actions = [];

        switch (workOrder.status) {
            case 'assigned':
                actions.push({
                    label: 'Start Work',
                    icon: Play,
                    status: 'in_progress' as WorkOrderStatus,
                    variant: 'default' as const,
                });
                break;
            case 'in_progress':
                actions.push(
                    {
                        label: 'Pause',
                        icon: Pause,
                        status: 'paused' as WorkOrderStatus,
                        variant: 'outline' as const,
                    },
                    {
                        label: 'Complete',
                        icon: CheckCircle2,
                        status: 'completed' as WorkOrderStatus,
                        variant: 'default' as const,
                    }
                );
                break;
            case 'paused':
                actions.push({
                    label: 'Resume',
                    icon: Play,
                    status: 'in_progress' as WorkOrderStatus,
                    variant: 'default' as const,
                });
                break;
            case 'completed':
                actions.push({
                    label: 'Approve',
                    icon: CheckCheck,
                    status: 'approved' as WorkOrderStatus,
                    variant: 'default' as const,
                });
                break;
        }

        if (!workOrder.is_closed && workOrder.status !== 'cancelled') {
            actions.push({
                label: 'Cancel',
                icon: XCircle,
                status: 'cancelled' as WorkOrderStatus,
                variant: 'destructive' as const,
            });
        }

        return actions;
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">{workOrder.title}</h2>
                        <Badge className={`${statusConfig.color} text-white gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(workOrder.priority)}>
                            {workOrder.priority}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-mono">{workOrder.wo_number}</span>
                        <span>•</span>
                        <span className="capitalize">{workOrder.wo_type.replace('_', ' ')}</span>
                        {workOrder.scheduled_start && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(workOrder.scheduled_start), 'PPP')}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {getAvailableActions().map((action) => {
                        const ActionIcon = action.icon;
                        return (
                            <Button
                                key={action.status}
                                variant={action.variant}
                                onClick={() => handleStatusChange(action.status)}
                                disabled={loading}
                                className="gap-2"
                            >
                                <ActionIcon className="h-4 w-4" />
                                {action.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Description */}
            {workOrder.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="checklist" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="checklist">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Checklist
                        {workOrder.checklist_completion_percentage > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {workOrder.checklist_completion_percentage}%
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="parts">
                        <Wrench className="h-4 w-4 mr-2" />
                        Parts & Costs
                    </TabsTrigger>
                    <TabsTrigger value="photos">
                        <Camera className="h-4 w-4 mr-2" />
                        Photos
                    </TabsTrigger>
                    <TabsTrigger value="notes">
                        <FileText className="h-4 w-4 mr-2" />
                        Notes & Findings
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="h-4 w-4 mr-2" />
                        History
                    </TabsTrigger>
                </TabsList>

                {/* Checklist Tab */}
                <TabsContent value="checklist">
                    {workOrder.checklist && workOrder.checklist.length > 0 ? (
                        <WorkOrderChecklist
                            workOrderId={workOrder.id}
                            checklist={workOrder.checklist}
                            readonly={workOrder.is_closed}
                            onUpdate={onUpdate}
                        />
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                No checklist items
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Parts Tab */}
                <TabsContent value="parts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Parts Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {workOrder.parts_used && workOrder.parts_used.length > 0 ? (
                                <div className="space-y-2">
                                    {workOrder.parts_used.map((part: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-2 border-b">
                                            <div>
                                                <div className="font-medium">{part.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    Part #: {part.part_number}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div>Qty: {part.quantity}</div>
                                                {part.unit_cost && (
                                                    <div className="text-sm text-gray-500">
                                                        ${part.unit_cost} ea
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">No parts used yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Costs Summary */}
                    {(workOrder.labor_hours || workOrder.external_cost || workOrder.total_cost) && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-base">Cost Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {workOrder.labor_hours && (
                                    <div className="flex justify-between">
                                        <span>Labor Hours:</span>
                                        <span className="font-medium">{workOrder.labor_hours}h</span>
                                    </div>
                                )}
                                {workOrder.external_cost && (
                                    <div className="flex justify-between">
                                        <span>External Costs:</span>
                                        <span className="font-medium">${workOrder.external_cost}</span>
                                    </div>
                                )}
                                {workOrder.total_cost && (
                                    <div className="flex justify-between pt-2 border-t font-bold">
                                        <span>Total Cost:</span>
                                        <span>${workOrder.total_cost}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Photos Tab */}
                <TabsContent value="photos">
                    <Card>
                        <CardContent className="py-8">
                            {workOrder.photo_urls && workOrder.photo_urls.length > 0 ? (
                                <div className="grid grid-cols-3 gap-4">
                                    {workOrder.photo_urls.map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={url}
                                            alt={`Work photo ${idx + 1}`}
                                            className="rounded-lg border"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center">No photos uploaded yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4">
                    {workOrder.work_performed && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Work Performed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{workOrder.work_performed}</p>
                            </CardContent>
                        </Card>
                    )}

                    {workOrder.findings && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Findings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{workOrder.findings}</p>
                            </CardContent>
                        </Card>
                    )}

                    {workOrder.recommendations && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{workOrder.recommendations}</p>
                            </CardContent>
                        </Card>
                    )}

                    {!workOrder.work_performed && !workOrder.findings && !workOrder.recommendations && (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                No notes added yet
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardContent className="py-8 text-center text-gray-500">
                            Status history will be displayed here
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
