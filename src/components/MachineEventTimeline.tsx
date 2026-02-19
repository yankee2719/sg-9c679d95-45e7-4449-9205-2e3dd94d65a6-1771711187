// src/components/MachineEventTimeline.tsx
import { useEffect, useState } from 'react';
import {
    machineEventsService,
    type MachineEvent,
} from '@/services/machineEventsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldAlert, CheckCircle2, History, ChevronDown } from 'lucide-react';

interface MachineEventTimelineProps {
    machineId: string;
    limit?: number;
    showIntegrityCheck?: boolean;
    compact?: boolean;
}

// Event display config
const EVENT_CONFIG: Record<string, { label: string; bgColor: string; icon: string }> = {
    'lifecycle.changed': { label: 'Stato Cambiato', bgColor: 'bg-purple-500', icon: '🔄' },
    'lifecycle.commissioned': { label: 'Commissionata', bgColor: 'bg-green-500', icon: '🏭' },
    'lifecycle.decommissioned': { label: 'Dismessa', bgColor: 'bg-gray-500', icon: '🚫' },
    'lifecycle.transferred': { label: 'Trasferita', bgColor: 'bg-yellow-500', icon: '📦' },
    'maintenance.completed': { label: 'Manutenzione Completata', bgColor: 'bg-green-600', icon: '✅' },
    'maintenance.started': { label: 'Manutenzione Iniziata', bgColor: 'bg-orange-500', icon: '🔧' },
    'inspection.completed': { label: 'Ispezione Completata', bgColor: 'bg-green-500', icon: '🔍' },
    'document.uploaded': { label: 'Documento Caricato', bgColor: 'bg-blue-400', icon: '📄' },
    'document.version_added': { label: 'Nuova Versione Doc', bgColor: 'bg-blue-500', icon: '📝' },
    'document.signed': { label: 'Documento Firmato', bgColor: 'bg-blue-600', icon: '✍️' },
    'checklist.executed': { label: 'Checklist Eseguita', bgColor: 'bg-indigo-500', icon: '📋' },
    'anomaly.reported': { label: 'Anomalia Segnalata', bgColor: 'bg-red-500', icon: '⚠️' },
    'note.added': { label: 'Nota Aggiunta', bgColor: 'bg-gray-400', icon: '📌' },
    'photo.added': { label: 'Foto Aggiunta', bgColor: 'bg-pink-500', icon: '📷' },
    'machine.created': { label: 'Creata', bgColor: 'bg-green-500', icon: '🏭' },
    'machine.updated': { label: 'Aggiornata', bgColor: 'bg-blue-500', icon: '✏️' },
};

const DEFAULT_CONFIG = { label: 'Evento', bgColor: 'bg-gray-500', icon: '📌' };

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateString));
}

function formatRelativeTime(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Ora';
    if (mins < 60) return `${mins}m fa`;
    if (hrs < 24) return `${hrs}h fa`;
    if (days < 7) return `${days}g fa`;
    return formatDate(dateString);
}

export function MachineEventTimeline({
    machineId,
    limit = 50,
    showIntegrityCheck = false,
    compact = false,
}: MachineEventTimelineProps) {
    const [events, setEvents] = useState < MachineEvent[] > ([]);
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(true);
    const [integrityChecked, setIntegrityChecked] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [error, setError] = useState < string | null > (null);

    useEffect(() => {
        if (!machineId || machineId === 'null') {
            setLoading(false);
            setError('ID macchina non valido');
            return;
        }
        loadData();
    }, [machineId, limit]);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const data = await machineEventsService.getTimeline(machineId, { limit });
            setEvents(data);

            if (showIntegrityCheck && data.length > 0) {
                const result = await machineEventsService.verifyChain(machineId);
                setIsValid(result.isValid);
                setIntegrityChecked(true);
            }
        } catch (err) {
            console.error('Failed to load timeline:', err);
            setError(err instanceof Error ? err.message : 'Errore caricamento');
        } finally {
            setLoading(false);
        }
    }

    const displayEvents = compact && !showAll ? events.slice(0, 5) : events;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nessun evento registrato</p>
                <p className="text-sm mt-1">Gli eventi appariranno qui automaticamente</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header with integrity badge */}
            {showIntegrityCheck && integrityChecked && (
                <div className="flex justify-end">
                    {isValid ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Chain integra
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-red-600 border-red-300 dark:border-red-500/30">
                            <ShieldAlert className="h-3 w-3 mr-1" /> Errore integrità
                        </Badge>
                    )}
                </div>
            )}

            {/* Timeline */}
            <div className="relative">
                {displayEvents.map((event, index) => {
                    const config = EVENT_CONFIG[event.event_type] || DEFAULT_CONFIG;
                    const isLast = index === displayEvents.length - 1;

                    return (
                        <div key={event.id} className="relative pl-8 pb-4 last:pb-0">
                            {/* Vertical line */}
                            {!isLast && (
                                <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-border" />
                            )}

                            {/* Dot */}
                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center text-white text-xs shadow-sm`}>
                                <span className="text-sm leading-none">{config.icon}</span>
                            </div>

                            {/* Event card */}
                            <div className="bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <Badge variant="outline" className="text-xs font-semibold mb-1">{config.label}</Badge>
                                        {/* Payload summary */}
                                        {event.payload && Object.keys(event.payload).length > 0 && (
                                            <div className="mt-1.5 space-y-0.5">
                                                {Object.entries(event.payload)
                                                    .filter(([key]) => !key.startsWith('_'))
                                                    .slice(0, compact ? 2 : 6)
                                                    .map(([key, value]) => (
                                                        <p key={key} className="text-xs text-muted-foreground">
                                                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </p>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right shrink-0">
                                        <div className="font-medium">{formatRelativeTime(event.created_at)}</div>
                                        <div className="opacity-60">{formatDate(event.created_at)}</div>
                                    </div>
                                </div>
                                {event.actor_type && event.actor_type !== 'system' && (
                                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                                        Da: {event.actor_type}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Show more */}
            {compact && events.length > 5 && !showAll && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
                    <ChevronDown className="w-4 h-4 mr-1" /> Mostra tutti ({events.length})
                </Button>
            )}
        </div>
    );
}
