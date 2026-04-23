// ============================================================================
// MAINTENANCE PLAN FORM COMPONENT
// ============================================================================
// File: src/components/Maintenance/MaintenancePlanForm.tsx
// Form per creare/editare maintenance plans (allineato al service)
// ============================================================================

'use client';

import { useState } from 'react';
import { MaintenancePlan, WorkOrderPriority } from '@/services/maintenanceService';
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
import { Loader2 } from 'lucide-react';

// Tipo per la frequenza (puoi esportarlo in un file separato se necessario)
type FrequencyType = 'time_based' | 'usage_based' | 'condition_based' | 'predictive';

interface MaintenancePlanFormProps {
    equipmentId: string;        // corrisponde a machine_id
    plantId?: string;            // serve per eventuali relazioni (non usato direttamente nel piano)
    initialData?: Partial<MaintenancePlan>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

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
        frequency_type: (initialData?.frequency_type || 'time_based') as FrequencyType,
        frequency_value: initialData?.frequency_value || 30,
        priority: (initialData?.priority || 'medium') as WorkOrderPriority,
        estimated_duration_minutes: initialData?.estimated_duration_minutes || 120,
        instructions: initialData?.instructions || '',
        safety_notes: initialData?.safety_notes || '',
        required_skills: initialData?.required_skills?.join(', ') || '',   // gestito come stringa CSV
        default_assignee_id: initialData?.default_assignee_id || '',
        // is_active: initialData?.is_active ?? true,  // eventualmente
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

        // Converte i campi nel formato atteso dal service
        const payload = {
            machine_id: equipmentId,          // corrisponde a machine_id
            // plant_id non è nel MaintenancePlan, lo omettiamo (o lo passi se serve altrove)
            title: formData.title,
            description: formData.description || null,
            frequency_type: formData.frequency_type,
            frequency_value: formData.frequency_value,
            priority: formData.priority,
            estimated_duration_minutes: formData.estimated_duration_minutes || null,
            instructions: formData.instructions || null,
            safety_notes: formData.safety_notes || null,
            required_skills: formData.required_skills
                ? formData.required_skills.split(',').map(s => s.trim()).filter(Boolean)
                : null,
            default_assignee_id: formData.default_assignee_id || null,
            // spare_parts: [], // se vuoi gestirli, aggiungi un campo dedicato
        };

        try {
            await onSubmit(payload);
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
                    rows={2}
                />
            </div>

            {/* Row: Frequency Type + Priority */}
            <div className="grid grid-cols-2 gap-4">
                {/* Frequency Type */}
                <div className="space-y-2">
                    <Label>
                        Plan Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.frequency_type}
                        onValueChange={(value: FrequencyType) => handleChange('frequency_type', value)}
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
                        onValueChange={(value: WorkOrderPriority) => handleChange('priority', value)}
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

            {/* Frequency Value */}
            <div className="space-y-2">
                <Label htmlFor="frequency_value">
                    {formData.frequency_type === 'time_based' && 'Frequency (days)'}
                    {formData.frequency_type === 'usage_based' && 'Usage Threshold'}
                    {(formData.frequency_type === 'condition_based' || formData.frequency_type === 'predictive') && 'Trigger Value (optional)'}
                </Label>
                <Input
                    id="frequency_value"
                    type="number"
                    min="1"
                    value={formData.frequency_value}
                    onChange={(e) => handleChange('frequency_value', parseInt(e.target.value) || 0)}
                />
                {formData.frequency_type === 'time_based' && (
                    <p className="text-sm text-gray-500">
                        Maintenance will be scheduled every {formData.frequency_value} days
                    </p>
                )}
                {formData.frequency_type === 'usage_based' && (
                    <p className="text-sm text-gray-500">
                        Trigger after {formData.frequency_value} units of usage
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
                    onChange={(e) => handleChange('estimated_duration_minutes', parseInt(e.target.value) || undefined)}
                />
            </div>

            {/* Instructions (sostituisce required_tools, ecc.) */}
            <div className="space-y-2">
                <Label htmlFor="instructions">Instructions / Tools Needed</Label>
                <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => handleChange('instructions', e.target.value)}
                    placeholder="Step-by-step instructions, tools, parts, etc."
                    rows={3}
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
                    rows={2}
                />
            </div>

            {/* Required Skills (CSV) */}
            <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (comma separated)</Label>
                <Input
                    id="skills"
                    value={formData.required_skills}
                    onChange={(e) => handleChange('required_skills', e.target.value)}
                    placeholder="e.g., Electrical, Mechanical, HVAC"
                />
            </div>

            {/* Default Assignee */}
            <div className="space-y-2">
                <Label htmlFor="assignee">Default Assignee (user ID)</Label>
                <Input
                    id="assignee"
                    value={formData.default_assignee_id}
                    onChange={(e) => handleChange('default_assignee_id', e.target.value)}
                    placeholder="User ID"
                />
                <p className="text-sm text-gray-500">Optional: user to automatically assign work orders</p>
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