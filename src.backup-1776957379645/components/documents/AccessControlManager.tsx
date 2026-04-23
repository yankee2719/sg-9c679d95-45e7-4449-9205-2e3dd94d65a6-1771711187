'use client';

import { ShieldOff, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccessControlManagerProps {
    documentId: string;
    currentUserId: string;
}

export function AccessControlManager({ documentId }: AccessControlManagerProps) {
    return (
        <Card className="rounded-2xl border border-border">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldOff className="h-5 w-5 text-amber-500" />
                            Access control unavailable
                        </CardTitle>
                        <CardDescription>
                            Granular document grants are disabled in the current MACHINA repository state.
                        </CardDescription>
                    </div>
                    <Badge className="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                        Disabled
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-2">
                            <p>
                                The current Supabase schema for this repo does not expose the legacy
                                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">document_access_grants</code>
                                table or the related grant/revoke RPCs.
                            </p>
                            <p>
                                Until the database is extended, document visibility should stay governed by
                                organization context, machine assignment, and document ownership rules.
                            </p>
                            <p className="text-xs">
                                Document ID: <span className="font-mono">{documentId}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled>
                        Grant access
                    </Button>
                    <Button type="button" variant="outline" disabled>
                        Revoke access
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
