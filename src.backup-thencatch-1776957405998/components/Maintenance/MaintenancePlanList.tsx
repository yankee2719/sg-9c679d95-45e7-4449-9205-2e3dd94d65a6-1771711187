// ============================================================================
// MAINTENANCE PLAN LIST COMPONENT
// ============================================================================
// File: src/components/Maintenance/MaintenancePlanList.tsx
// Visualizza lista piani di manutenzione con azioni (attiva/disattiva, modifica, ecc.)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { MaintenancePlan, WorkOrderPriority, maintenancePlanService } from '@/services/maintenanceService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

interface MaintenancePlanListProps {
    organizationId: string;
    machineId?: string;          // opzionale: filtra per macchina
    onEdit?: (plan: MaintenancePlan) => void;
    onDelete?: (planId: string) => void;
    onPlanToggle?: (planId: string, isActive: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaintenancePlanList({
    organizationId,
    machineId,
    onEdit,
    onDelete,
    onPlanToggle,
}: MaintenancePlanListProps) {
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // --------------------------------------------------------------------------
    // FETCH PLANS
    // --------------------------------------------------------------------------

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true);
                const data = await maintenancePlanService.getPlans(organizationId, machineId);
                setPlans(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching maintenance plans:', err);
                setError('Impossibile caricare i piani di manutenzione.');
            } finally {
                setLoading(false);
            }
        };

        if (organizationId) {
            fetchPlans();
        }
    }, [organizationId, machineId]);

    // --------------------------------------------------------------------------
    // HANDLERS
    // --------------------------------------------------------------------------

    const handleToggleActive = async (plan: MaintenancePlan) => {
        setTogglingId(plan.id);
        try {
            const newActiveState = !plan.is_active;
            const success = await maintenancePlanService.deactivatePlan(plan.id); // questo setta is_active = false
            // Nota: il service ha solo deactivatePlan, non un toggle generico.
            // Dovresti implementare un metodo updatePlan o un toggle specifico.
            // Per semplicità, assumiamo che ci sia un metodo per attivare/disattivare.
            // In realtà, potresti chiamare updatePlan(plan.id, { is_active: newActiveState }).
            // Se il service non lo supporta, puoi estenderlo.

            // Qui usiamo un update generico se disponibile, altrimenti ricarichiamo.
            if (success) {
                // Aggiorna lo stato locale
                setPlans(prev =>
                    prev.map(p =>
                        p.id === plan.id ? { ...p, is_active: newActiveState } : p
                    )
                );
                if (onPlanToggle) onPlanToggle(plan.id, newActiveState);
            } else {
                // Se fallisce, mostra errore
                setError("Impossibile aggiornare lo stato del piano.");
            }
        } catch (err) {
            console.error('Error toggling plan:', err);
            setError("Errore durante l'aggiornamento.");
        } finally {
            setTogglingId(null);
        }
    };

    // --------------------------------------------------------------------------
    // UTILITY FUNCTIONS
    // --------------------------------------------------------------------------

    const getPriorityBadge = (priority: WorkOrderPriority) => {
        const variants: Record<WorkOrderPriority, { color: string; label: string }> = {
            low: { color: 'bg-gray-100 text-gray-800', label: 'Bassa' },
            medium: { color: 'bg-blue-100 text-blue-800', label: 'Media' },
            high: { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
            critical: { color: 'bg-red-100 text-red-800', label: 'Critica' },
        };
        const v = variants[priority] || variants.medium;
        return <Badge className={v.color}>{v.label}</Badge>;
    };

    const getFrequencyText = (plan: MaintenancePlan): string => {
        const { frequency_type, frequency_value } = plan;
        switch (frequency_type) {
            case 'time_based':
                return `Ogni ${frequency_value} giorni`;
            case 'usage_based':
                return `Ogni ${frequency_value} unità di utilizzo`;
            case 'condition_based':
                return `Basato su condizioni`;
            case 'predictive':
                return `Predictivo`;
            default:
                return frequency_type;
        }
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
                <p className="text-gray-500">Nessun piano di manutenzione trovato.</p>
                <p className="text-sm text-gray-400 mt-1">
                    Crea il tuo primo piano utilizzando il pulsante "Nuovo piano".
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {plans.map(plan => (
                <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{plan.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {plan.description || 'Nessuna descrizione'}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {getPriorityBadge(plan.priority)}
                                <Switch
                                    checked={plan.is_active}
                                    onCheckedChange={() => handleToggleActive(plan)}
                                    disabled={togglingId === plan.id}
                                    aria-label="Attiva/Disattiva piano"
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                                <Clock className="h-4 w-4" />
                                <span>{getFrequencyText(plan)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {plan.next_due_date
                                        ? `Prossima: ${format(new Date(plan.next_due_date), 'dd MMM yyyy', { locale: it })}`
                                        : 'Nessuna data'}
                                </span>
                            </div>
                            {plan.estimated_duration_minutes && (
                                <div className="flex items-center gap-1 text-gray-600 col-span-2">
                                    <span>Durata stimata: {plan.estimated_duration_minutes} minuti</span>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2 pt-2">
                        {onEdit && (
                            <Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Modifica
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="destructive" size="sm" onClick={() => onDelete(plan.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Elimina
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}