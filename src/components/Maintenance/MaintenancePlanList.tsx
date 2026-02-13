// ============================================================================
// MAINTENANCE PLAN LIST COMPONENT
// ============================================================================
// File: src/components/Maintenance/MaintenancePlanList.tsx
// Lista maintenance plans con filtri
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { MaintenancePlan, MaintenancePlanType, MaintenancePriority } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle, Play, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface MaintenancePlanListProps {
    equipmentId: string;
    onEdit?: (plan: MaintenancePlan) => void;
    onDelete?: (planId: string) => void;
    onGenerateWorkOrder?: (planId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getPlanTypeLabel = (type: MaintenancePlanType) => {
    const labels = {
        time_based: 'Time Based',
        usage_based: 'Usage Based',
        condition_based: 'Condition Based',
        predictive: 'Predictive',
    };
    return labels[type];
};

const getPriorityColor = (priority: MaintenancePriority) => {
    const colors = {
        critical: 'bg-red-100 text-red-600',
        high: 'bg-orange-100 text-orange-600',
        medium: 'bg-yellow-100 text-yellow-600',
        low: 'bg-gray-100 text-gray-600',
    };
    return colors[priority];
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MaintenancePlanList({
    equipmentId,
    onEdit,
    onDelete,
    onGenerateWorkOrder,
}: MaintenancePlanListProps) {
    const [plans, setPlans] = useState < MaintenancePlan[] > ([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    // --------------------------------------------------------------------------
    // LOAD PLANS
    // --------------------------------------------------------------------------

    const loadPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/maintenance-plans?equipment_id=${equipmentId}`, {
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed to load plans');

            const { plans: data } = await res.json();
            setPlans(data);
        } catch (error) {
            console.error('Failed to load plans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, [equipmentId]);

    // --------------------------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------------------------

    const filteredPlans = plans.filter(plan =>
        showInactive ? true : plan.is_active
    );

    const activePlans = plans.filter(p => p.is_active);
    const inactivePlans = plans.filter(p => !p.is_active);
    const overduePlans = activePlans.filter(p =>
        p.next_due_date && new Date(p.next_due_date) < new Date()
    );

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
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Active Plans
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activePlans.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Overdue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{overduePlans.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Inactive
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-400">{inactivePlans.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Switch
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                    id="show-inactive"
                />
                <label htmlFor="show-inactive" className="text-sm text-gray-600">
                    Show inactive plans
                </label>
            </div>

            {/* Table */}
            {filteredPlans.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No maintenance plans found
                    </CardContent>
                </Card>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Next Due</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPlans.map((plan) => {
                                const isOverdue = plan.next_due_date && new Date(plan.next_due_date) < new Date();

                                return (
                                    <TableRow key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
                                        {/* Title */}
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{plan.title}</div>
                                                {plan.description && (
                                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                                        {plan.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell>
                                            <Badge variant="outline">{getPlanTypeLabel(plan.plan_type)}</Badge>
                                        </TableCell>

                                        {/* Priority */}
                                        <TableCell>
                                            <Badge className={getPriorityColor(plan.priority)}>
                                                {plan.priority}
                                            </Badge>
                                        </TableCell>

                                        {/* Frequency */}
                                        <TableCell className="text-sm">
                                            {plan.frequency_days && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Every {plan.frequency_days} days
                                                </div>
                                            )}
                                            {plan.frequency_hours && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Every {plan.frequency_hours} hours
                                                </div>
                                            )}
                                            {plan.usage_threshold && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Every {plan.usage_threshold} {plan.usage_unit}
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* Next Due */}
                                        <TableCell>
                                            {plan.next_due_date ? (
                                                <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                                    <div className="flex items-center gap-1">
                                                        {isOverdue && <AlertCircle className="h-3 w-3" />}
                                                        {format(new Date(plan.next_due_date), 'PP')}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(plan.next_due_date), { addSuffix: true })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Not scheduled</span>
                                            )}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                                {plan.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                {plan.is_active && onGenerateWorkOrder && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onGenerateWorkOrder(plan.id)}
                                                        title="Generate Work Order"
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {onEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onEdit(plan)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {onDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onDelete(plan.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
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
