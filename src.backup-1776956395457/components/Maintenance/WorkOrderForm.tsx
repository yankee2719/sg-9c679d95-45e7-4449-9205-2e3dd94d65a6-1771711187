// ============================================================================
// WORK ORDER FORM COMPONENT
// ============================================================================
// File: src/components/Maintenance/WorkOrderForm.tsx
// Form per creare/editare work orders
// ============================================================================

'use client';

import { useState } from 'react';
import { WorkOrder, MaintenancePriority, CreateWorkOrderInput } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface WorkOrderFormProps {
    equipmentId: string;
    plantId: string;
    initialData?: Partial<WorkOrder>;
    onSubmit: (data: CreateWorkOrderInput) => Promise<void>;
    onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkOrderForm({
    equipmentId,
    plantId,
    initialData,
    onSubmit,
    onCancel,
}: WorkOrderFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        priority: (initialData?.priority || 'medium') as MaintenancePriority,
        wo_type: initialData?.wo_type || 'preventive',
        scheduled_start: initialData?.scheduled_start || '',
        scheduled_end: initialData?.scheduled_end || '',
        estimated_duration_minutes: initialData?.estimated_duration_minutes || 60,
    });

    const [scheduledStartDate, setScheduledStartDate] = useState < Date | undefined > (
        initialData?.scheduled_start ? new Date(initialData.scheduled_start) : undefined
    );
    const [scheduledEndDate, setScheduledEndDate] = useState < Date | undefined > (
        initialData?.scheduled_end ? new Date(initialData.scheduled_end) : undefined
    );

    // --------------------------------------------------------------------------
    // HANDLERS
    // --------------------------------------------------------------------------

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await onSubmit({
                equipment_id: equipmentId,
                plant_id: plantId,
                title: formData.title,
                description: formData.description || undefined,
                priority: formData.priority,
                wo_type: formData.wo_type,
                scheduled_start: scheduledStartDate?.toISOString(),
                scheduled_end: scheduledEndDate?.toISOString(),
                estimated_duration_minutes: formData.estimated_duration_minutes,
            });
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Monthly preventive maintenance"
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detailed description of work to be performed..."
                    rows={4}
                />
            </div>

            {/* Row: Priority + Type */}
            <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-2">
                    <Label>
                        Priority <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.priority}
                        onValueChange={(value) => handleChange('priority', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* WO Type */}
                <div className="space-y-2">
                    <Label>
                        Work Order Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.wo_type}
                        onValueChange={(value) => handleChange('wo_type', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="corrective">Corrective</SelectItem>
                            <SelectItem value="predictive">Predictive</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Row: Scheduled Start + End */}
            <div className="grid grid-cols-2 gap-4">
                {/* Scheduled Start */}
                <div className="space-y-2">
                    <Label>Scheduled Start</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledStartDate ? (
                                    format(scheduledStartDate, 'PPP')
                                ) : (
                                    <span className="text-gray-500">Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={scheduledStartDate}
                                onSelect={setScheduledStartDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Scheduled End */}
                <div className="space-y-2">
                    <Label>Scheduled End</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledEndDate ? (
                                    format(scheduledEndDate, 'PPP')
                                ) : (
                                    <span className="text-gray-500">Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={scheduledEndDate}
                                onSelect={setScheduledEndDate}
                                initialFocus
                                disabled={(date) =>
                                    scheduledStartDate ? date < scheduledStartDate : false
                                }
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Estimated Duration */}
            <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => handleChange('estimated_duration_minutes', parseInt(e.target.value))}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Update' : 'Create'} Work Order
                </Button>
            </div>
        </form>
    );
}
