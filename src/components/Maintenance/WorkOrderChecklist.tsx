// ============================================================================
// WORK ORDER CHECKLIST COMPONENT
// ============================================================================
// File: src/components/Maintenance/WorkOrderChecklist.tsx
// Checklist interattiva con progress tracking
// ============================================================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// TYPES (definiti localmente)
// ============================================================================

export interface ChecklistItem {
    id: string;
    task: string;
    completed: boolean;
    completed_at?: string;
    notes?: string;
}

interface WorkOrderChecklistProps {
    workOrderId: string;
    checklist: ChecklistItem[];
    readonly?: boolean;
    onUpdate: (updates: { checklist: ChecklistItem[] }) => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkOrderChecklist({
    workOrderId,
    checklist: initialChecklist,
    readonly = false,
    onUpdate,
}: WorkOrderChecklistProps) {
    const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
    const [editingNotes, setEditingNotes] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Calculate progress
    const completedCount = checklist.filter(item => item.completed).length;
    const totalCount = checklist.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // --------------------------------------------------------------------------
    // HANDLERS
    // --------------------------------------------------------------------------

    const handleToggle = async (itemId: string) => {
        if (readonly) return;

        const updated = checklist.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    completed: !item.completed,
                    completed_at: !item.completed ? new Date().toISOString() : undefined,
                };
            }
            return item;
        });

        setChecklist(updated);

        // Auto-save
        setSaving(true);
        try {
            await onUpdate({ checklist: updated });
        } catch (error) {
            console.error('Failed to save checklist:', error);
            // Revert on error
            setChecklist(checklist);
        } finally {
            setSaving(false);
        }
    };

    const handleNotesChange = (itemId: string, notes: string) => {
        const updated = checklist.map(item => {
            if (item.id === itemId) {
                return { ...item, notes };
            }
            return item;
        });
        setChecklist(updated);
    };

    const handleSaveNotes = async (itemId: string) => {
        setSaving(true);
        try {
            await onUpdate({ checklist });
            setEditingNotes(null);
        } catch (error) {
            console.error('Failed to save notes:', error);
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Checklist Progress</span>
                            <span className="text-gray-500">
                                {completedCount} of {totalCount} completed
                            </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="text-right text-sm text-gray-500">{percentage}%</div>
                    </div>
                </CardContent>
            </Card>

            {/* Checklist Items */}
            <div className="space-y-2">
                {checklist.map((item) => (
                    <Card key={item.id} className={item.completed ? 'bg-gray-50' : ''}>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                {/* Task with checkbox */}
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        checked={item.completed}
                                        onCheckedChange={() => handleToggle(item.id)}
                                        disabled={readonly || saving}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                                            {item.task}
                                        </div>

                                        {/* Completion info */}
                                        {item.completed && item.completed_at && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span>
                                                    Completed {format(new Date(item.completed_at), 'PPp')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status icon */}
                                    {item.completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                </div>

                                {/* Notes */}
                                {!readonly && (
                                    <div className="ml-8">
                                        {editingNotes === item.id ? (
                                            <div className="space-y-2">
                                                <Textarea
                                                    value={item.notes || ''}
                                                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                                    placeholder="Add notes..."
                                                    rows={3}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveNotes(item.id)}
                                                        disabled={saving}
                                                    >
                                                        {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                                        <Save className="h-3 w-3 mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingNotes(null);
                                                            // Revert changes
                                                            setChecklist(initialChecklist);
                                                        }}
                                                        disabled={saving}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {item.notes ? (
                                                    <div
                                                        className="text-sm text-gray-600 bg-gray-100 rounded p-2 cursor-pointer hover:bg-gray-200"
                                                        onClick={() => setEditingNotes(item.id)}
                                                    >
                                                        {item.notes}
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditingNotes(item.id)}
                                                        className="text-xs text-gray-500"
                                                    >
                                                        Add notes...
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Read-only notes */}
                                {readonly && item.notes && (
                                    <div className="ml-8 text-sm text-gray-600 bg-gray-100 rounded p-2">
                                        {item.notes}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty state */}
            {checklist.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No checklist items defined
                    </CardContent>
                </Card>
            )}
        </div>
    );
}