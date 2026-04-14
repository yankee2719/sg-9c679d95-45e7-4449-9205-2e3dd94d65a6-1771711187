'use client';

import { ShieldOff, Info, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccessControlManagerProps {
    documentId: string;
    currentUserId: string;
}

const DISABLED_REASON =
    'Il controllo accessi granulare per documento è stato disattivato in questo stato del repository perché lo schema Supabase reale non espone document_access_grants né le RPC di grant/revoke.';

export function AccessControlManager({ documentId }: AccessControlManagerProps) {
    return (
        <Card className="rounded-2xl border border-amber-200/60 bg-amber-50/70 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
            <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldOff className="h-5 w-5 text-amber-600" />
                            Access control documento
                        </CardTitle>
                        <CardDescription>
                            Funzione legacy messa in sicurezza per evitare errori runtime su tabelle e RPC non presenti.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-amber-300 bg-background/80 text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                        Disabled
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="rounded-2xl border border-amber-200/70 bg-background/80 p-4 dark:border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 text-amber-600" />
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>{DISABLED_REASON}</p>
                            <p>
                                Documento interessato: <span className="font-medium text-foreground">{documentId}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border bg-background/80 p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Grant attivi</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">0</div>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Grant per ruolo</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">0</div>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Grant per utente</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">0</div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed bg-background/70 p-4">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-sm text-muted-foreground">
                        Prima di riattivare questa sezione serve riallineare backend e schema reale.
                    </div>
                    <Button type="button" variant="outline" disabled>
                        Grant access
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default AccessControlManager;
