'use client';

import { Shield } from 'lucide-react';

interface AuditLogViewerProps {
    documentId: string;
    limit?: number;
}

export function AuditLogViewer({ documentId }: AuditLogViewerProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="rounded-lg border border-border bg-muted/40 p-2">
                    <Shield className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold">Audit log</h3>
                    <p className="text-sm text-muted-foreground">
                        Modulo temporaneamente disattivato per rimuovere la dipendenza legacy da <code>getDocumentService()</code> lato client.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Documento: <span className="font-mono">{documentId}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
