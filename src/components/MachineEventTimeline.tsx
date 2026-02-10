// src/components/MachineEventTimeline.tsx
// Compatible with Next.js Pages Router

import { useEffect, useState } from 'react';
import {
    MachineEventService,
    type MachineEvent,
    EVENT_TYPES,
} from '@/services/machineEventsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MachineEventTimelineProps {
    machineId: string;
    organizationId: string;
    limit?: number;
    showIntegrityCheck?: boolean;
}

// Configurazione per i diversi tipi di eventi
const EVENT_CONFIG: Record<
    string,
    { label: string; color: string; icon: string; bgColor: string }
> = {
    'machine.created': {
        label: 'Creata',
        color: 'text-green-700',
        bgColor: 'bg-green-500',
        icon: '🏭',
    },
    'machine.updated': {
        label: 'Aggiornata',
        color: 'text-blue-700',
        bgColor: 'bg-blue-500',
        icon: '✏️',
    },
    'machine.relocated': {
        label: 'Spostata',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-500',
        icon: '📦',
    },
    'machine.status_changed': {
        label: 'Stato Cambiato',
        color: 'text-purple-700',
        bgColor: 'bg-purple-500',
        icon: '🔄',
    },
    'machine.decommissioned': {
        label: 'Dismessa',
        color: 'text-gray-700',
        bgColor: 'bg-gray-500',
        icon: '🚫',
    },
    'maintenance.scheduled': {
        label: 'Manutenzione Programmata',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-500',
        icon: '📅',
    },
    'maintenance.started': {
        label: 'Manutenzione Iniziata',
        color: 'text-orange-700',
        bgColor: 'bg-orange-500',
        icon: '🔧',
    },
    'maintenance.completed': {
        label: 'Manutenzione Completata',
        color: 'text-green-700',
        bgColor: 'bg-green-600',
        icon: '✅',
    },
    'maintenance.cancelled': {
        label: 'Manutenzione Annullata',
        color: 'text-red-700',
        bgColor: 'bg-red-500',
        icon: '❌',
    },
    'document.uploaded': {
        label: 'Documento Caricato',
        color: 'text-blue-700',
        bgColor: 'bg-blue-400',
        icon: '📄',
    },
    'document.updated': {
        label: 'Documento Aggiornato',
        color: 'text-blue-700',
        bgColor: 'bg-blue-500',
        icon: '📝',
    },
    'document.deleted': {
        label: 'Documento Eliminato',
        color: 'text-red-700',
        bgColor: 'bg-red-400',
        icon: '🗑️',
    },
    'safety.incident_reported': {
        label: 'Incidente Segnalato',
        color: 'text-red-700',
        bgColor: 'bg-red-600',
        icon: '⚠️',
    },
    'safety.risk_assessed': {
        label: 'Valutazione Rischi',
        color: 'text-orange-700',
        bgColor: 'bg-orange-500',
        icon: '🛡️',
    },
    'safety.inspection_completed': {
        label: 'Ispezione Completata',
        color: 'text-green-700',
        bgColor: 'bg-green-500',
        icon: '🔍',
    },
    'compliance.audit_passed': {
        label: 'Audit Superato',
        color: 'text-green-700',
        bgColor: 'bg-green-600',
        icon: '✓',
    },
    'compliance.audit_failed': {
        label: 'Audit Fallito',
        color: 'text-red-700',
        bgColor: 'bg-red-600',
        icon: '✗',
    },
    'compliance.certificate_issued': {
        label: 'Certificato Emesso',
        color: 'text-blue-700',
        bgColor: 'bg-blue-600',
        icon: '🏆',
    },
};

// Fallback per eventi non configurati
const DEFAULT_CONFIG = {
    label: 'Evento',
    color: 'text-gray-700',
    bgColor: 'bg-gray-500',
    icon: '📌',
};

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Proprio ora';
    if (diffMins < 60) return `${diffMins} minuti fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return formatDate(dateString);
}

export function MachineEventTimeline({
    machineId,
    organizationId,
    limit = 50,
    showIntegrityCheck = true,
}: MachineEventTimelineProps) {
    const [events, setEvents] = useState < MachineEvent[] > ([]);
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(true);
    const [integrityChecked, setIntegrityChecked] = useState(false);

    useEffect(() => {
        loadData();
    }, [machineId, organizationId, limit]);

    async function loadData() {
        setLoading(true);
        try {
            // Load events
            const eventsData = await MachineEventService.getTimeline(
                machineId,
                organizationId,
                limit
            );
            setEvents(eventsData);

            // Check integrity if enabled
            if (showIntegrityCheck) {
                const integrity = await MachineEventService.verifyIntegrity(
                    machineId,
                    organizationId
                );
                setIsValid(integrity.isValid);
                setIntegrityChecked(true);
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Timeline Eventi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        Timeline Eventi
                        {events.length > 0 && (
                            <Badge variant="secondary">{events.length}</Badge>
                        )}
                    </CardTitle>

                    {/* Integrity Badge */}
                    {showIntegrityCheck && integrityChecked && (
                        <div className="flex items-center gap-2">
                            {isValid ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Chain Valida
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                    <ShieldAlert className="h-3 w-3 mr-1" />
                                    Errore Integrità
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {!isValid && (
                    <Alert variant="destructive" className="mb-4">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription>
                            La catena di hash presenta anomalie. Alcuni eventi potrebbero essere
                            stati manomessi.
                        </AlertDescription>
                    </Alert>
                )}

                {events.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-lg">Nessun evento registrato</p>
                        <p className="text-sm mt-2">
                            Gli eventi verranno visualizzati qui non appena registrati
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-6">
                            {events.map((event, index) => {
                                const config = EVENT_CONFIG[event.event_type] || DEFAULT_CONFIG;

                                return (
                                    <div key={event.event_id} className="relative pl-8">
                                        {/* Timeline line */}
                                        {index < events.length - 1 && (
                                            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                                        )}

                                        {/* Timeline dot */}
                                        <div
                                            className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center text-white text-xs font-bold shadow-md`}
                                        >
                                            <span className="text-sm">{config.icon}</span>
                                        </div>

                                        {/* Event card */}
                                        <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <Badge variant="outline" className={config.color}>
                                                        {config.label}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground text-right">
                                                    <div>{formatRelativeTime(event.created_at)}</div>
                                                    <div className="opacity-70">
                                                        {formatDate(event.created_at)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payload details */}
                                            {Object.keys(event.payload).length > 0 && (
                                                <div className="mt-3 space-y-1.5">
                                                    {Object.entries(event.payload).map(([key, value]) => {
                                                        // Skip internal fields
                                                        if (key.startsWith('_')) return null;

                                                        return (
                                                            <div
                                                                key={key}
                                                                className="flex gap-3 text-sm items-start"
                                                            >
                                                                <span className="font-medium text-muted-foreground min-w-[120px] capitalize">
                                                                    {key.replace(/_/g, ' ')}:
                                                                </span>
                                                                <span className="flex-1 break-words">
                                                                    {Array.isArray(value)
                                                                        ? value.join(', ')
                                                                        : typeof value === 'object'
                                                                            ? JSON.stringify(value, null, 2)
                                                                            : String(value)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Actor info */}
                                            {event.actor_type && (
                                                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                                    Registrato da: {event.actor_type}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}