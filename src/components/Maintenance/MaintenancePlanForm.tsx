// ============================================================================
// MAINTENANCE PLAN FORM COMPONENT
// ============================================================================
// File: src/components/Maintenance/MaintenancePlanForm.tsx
// Form per creare/editare maintenance plans
// ============================================================================

'use client';

import { useState } from 'react';
import { MaintenancePlan, MaintenancePlanType, MaintenancePriority } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface MaintenancePlanFormProps {
    equipmentId: string;
    plantId?: string;
    initialData?: Partial<MaintenancePlan>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaintenancePlanForm({
    equipmentId,
    plantId,
    initialData,
    onSubmit,
    onCancel,
}: MaintenancePlanFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        plan_type: (initialData?.plan_type || 'time_based') as MaintenancePlanType,
        priority: (initialData?.priority || 'medium') as MaintenancePriority,
        frequency_days: initialData?.frequency_days || 30,
        frequency_hours: initialData?.frequency_hours || undefined,
        usage_threshold: initialData?.usage_threshold || undefined,
        usage_unit: initialData?.usage_unit || 'hours',
        estimated_duration_minutes: initialData?.estimated_duration_minutes || 120,
        required_skills: initialData?.required_skills || [],
        required_tools: initialData?.required_tools || [],
        safety_notes: initialData?.safety_notes || '',
        requires_shutdown: initialData?.requires_shutdown || false,
        compliance_tags: initialData?.compliance_tags || [],
    });

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
                ...formData,
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
                    placeholder="Detailed description of maintenance activities..."
                    rows={3}
                />
            </div>

            {/* Row: Plan Type + Priority */}
            <div className="grid grid-cols-2 gap-4">
                {/* Plan Type */}
                <div className="space-y-2">
                    <Label>
                        Plan Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.plan_type}
                        onValueChange={(value) => handleChange('plan_type', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="time_based">Time Based</SelectItem>
                            <SelectItem value="usage_based">Usage Based</SelectItem>
                            <SelectItem value="condition_based">Condition Based</SelectItem>
                            <SelectItem value="predictive">Predictive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

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
            </div>

            {/* Frequency Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium">Frequency Configuration</h3>

                {formData.plan_type === 'time_based' && (
                    <div className="space-y-2">
                        <Label htmlFor="frequency_days">Frequency (days)</Label>
                        <Input
                            id="frequency_days"
                            type="number"
                            min="1"
                            value={formData.frequency_days}
                            onChange={(e) => handleChange('frequency_days', parseInt(e.target.value))}
                        />
                        <p className="text-sm text-gray-500">
                            Maintenance will be scheduled every {formData.frequency_days} days
                        </p>
                    </div>
                )}

                {formData.plan_type === 'usage_based' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="usage_threshold">Usage Threshold</Label>
                            <Input
                                id="usage_threshold"
                                type="number"
                                min="1"
                                value={formData.usage_threshold || ''}
                                onChange={(e) => handleChange('usage_threshold', parseInt(e.target.value))}
                                placeholder="e.g., 1000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="usage_unit">Usage Unit</Label>
                            <Select
                                value={formData.usage_unit}
                                onValueChange={(value) => handleChange('usage_unit', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Operating Hours</SelectItem>
                                    <SelectItem value="cycles">Cycles</SelectItem>
                                    <SelectItem value="km">Kilometers</SelectItem>
                                    <SelectItem value="pieces">Pieces Produced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {(formData.plan_type === 'condition_based' || formData.plan_type === 'predictive') && (
                    <p className="text-sm text-gray-500">
                        This plan type requires sensor integration or manual triggering.
                    </p>
                )}
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

            {/* Safety Notes */}
            <div className="space-y-2">
                <Label htmlFor="safety_notes">Safety Notes</Label>
                <Textarea
                    id="safety_notes"
                    value={formData.safety_notes}
                    onChange={(e) => handleChange('safety_notes', e.target.value)}
                    placeholder="Important safety considerations..."
                    rows={3}
                />
            </div>

            {/* Requires Shutdown */}
            <div className="flex items-center gap-2">
                <Switch
                    checked={formData.requires_shutdown}
                    onCheckedChange={(checked) => handleChange('requires_shutdown', checked)}
                    id="requires_shutdown"
                />
                <Label htmlFor="requires_shutdown" className="cursor-pointer">
                    Requires machine shutdown
                </Label>
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
                    {initialData ? 'Update' : 'Create'} Plan
                </Button>
            </div>
        </form>
    );
}
