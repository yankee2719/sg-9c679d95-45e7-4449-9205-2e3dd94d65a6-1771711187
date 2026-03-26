'use client';

import { History } from 'lucide-react';

interface VersionHistoryProps {
    documentId: string;
    currentVersionNumber?: number;
}

export function VersionHistory({ documentId, currentVersionNumber }: VersionHistoryProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="rounded-lg border border-border bg-muted/40 p-2">
                    <History className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold">Version history</h3>
                    <p className="text-sm text-muted-foreground">
                        Componente legacy temporaneamente semplificato per sbloccare la build.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>Documento: <span className="font-mono">{documentId}</span></p>
                        <p>Versione corrente: {typeof currentVersionNumber === 'number' ? currentVersionNumber : 'n/d'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
