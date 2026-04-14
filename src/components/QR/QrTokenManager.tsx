'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle, Copy } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import {
    QrToken,
    QrScanHistoryItem,
    generateQrToken,
    listQrTokensForEquipment,
    revokeQrToken,
} from '@/lib/qrApi';

interface QrTokenManagerProps {
    equipmentId: string;
    equipmentName: string;
}

export function QrTokenManager({ equipmentId, equipmentName }: QrTokenManagerProps) {
    const { toast } = useToast();
    const [tokens, setTokens] = useState < QrToken[] > ([]);
    const [recentScans, setRecentScans] = useState < QrScanHistoryItem[] > ([]);
    const [loading, setLoading] = useState(true);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [newToken, setNewToken] = useState < { tokenCleartext: string; qrUrl: string; qrImage: string } | null > (null);
    const [generating, setGenerating] = useState(false);

    const loadTokens = async () => {
        setLoading(true);
        try {
            const payload = await listQrTokensForEquipment(equipmentId);
            setTokens(Array.isArray(payload.tokens) ? payload.tokens : []);
            setRecentScans(Array.isArray(payload.recent_scans) ? payload.recent_scans : []);
        } catch (error: any) {
            toast({
                title: 'Errore QR',
                description: error?.message || 'Impossibile caricare il QR macchina',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTokens();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentId]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const payload = await generateQrToken({
                equipment_id: equipmentId,
                token_type: 'permanent',
            });

            const qrImage = await QRCode.toDataURL(payload.qr_url, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            });

            setNewToken({
                tokenCleartext: payload.token_cleartext,
                qrUrl: payload.qr_url,
                qrImage,
            });
            setShowQrDialog(true);
            await loadTokens();
            toast({
                title: 'QR macchina aggiornato',
                description: 'Salva o stampa subito il nuovo QR: il token non verrà mostrato di nuovo.',
            });
        } catch (error: any) {
            toast({
                title: 'Generazione fallita',
                description: error?.message || 'Impossibile generare il QR macchina',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (tokenId: string) => {
        if (!window.confirm('Revocare il QR macchina attuale? Operazione non reversibile.')) return;

        try {
            await revokeQrToken(equipmentId, tokenId, 'Manually revoked');
            toast({ title: 'QR revocato', description: 'Il QR macchina è stato disattivato correttamente.' });
            await loadTokens();
        } catch (error: any) {
            toast({
                title: 'Revoca fallita',
                description: error?.message || 'Impossibile revocare il QR macchina',
                variant: 'destructive',
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiato', description: 'Link QR copiato negli appunti.' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }

    const activeTokens = tokens.filter((token) => token.is_active);
    const totalScans = tokens.reduce((sum, token) => sum + Number(token.scan_count || 0), 0);
    const activeToken = activeTokens[0] ?? null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <QrCode className="h-6 w-6 text-gray-600" />
                    <div>
                        <h3 className="text-lg font-semibold">Machine QR</h3>
                        <p className="text-sm text-gray-500">{equipmentName}</p>
                    </div>
                </div>
                <Button onClick={() => void handleGenerate()} className="gap-2" disabled={generating}>
                    <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                    {activeToken ? 'Rigenera QR' : 'Genera QR'}
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <div className="text-2xl font-bold">{activeTokens.length}</div>
                            <div className="text-sm text-gray-500">QR attivi</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{totalScans}</div>
                            <div className="text-sm text-gray-500">Scansioni rilevate</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{recentScans.length}</div>
                            <div className="text-sm text-gray-500">Scansioni recenti</div>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Il modello QR attuale supporta <strong>un solo QR attivo per macchina</strong>. Generare un nuovo QR sostituisce quello precedente.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">QR attuale</CardTitle>
                </CardHeader>
                <CardContent>
                    {tokens.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">Nessun QR generato per questa macchina</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Prefisso</TableHead>
                                    <TableHead>Stato</TableHead>
                                    <TableHead>Scansioni</TableHead>
                                    <TableHead>Creato</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tokens.map((token) => (
                                    <TableRow key={token.id}>
                                        <TableCell>
                                            <Badge className="bg-blue-100 text-blue-700">permanent</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{token.token_prefix}</TableCell>
                                        <TableCell>
                                            {token.is_active ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="text-sm">Attivo</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="text-sm">Revocato</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{token.scan_count}</TableCell>
                                        <TableCell className="text-sm text-gray-500">{format(new Date(token.created_at), 'PP')}</TableCell>
                                        <TableCell>
                                            {token.is_active && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void handleRevoke(token.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {recentScans.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Scansioni recenti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentScans.slice(0, 5).map((scan) => (
                                <div key={scan.id} className="flex items-center justify-between border-b py-2 last:border-0">
                                    <div className="flex items-center gap-3">
                                        {scan.access_granted ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <div>
                                            <div className="text-sm font-medium">
                                                {scan.access_granted ? 'Accesso consentito' : `Negato: ${scan.denial_reason || 'unknown'}`}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                    {scan.was_offline && <Badge variant="outline" className="text-xs">Offline</Badge>}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {newToken && (
                <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                QR macchina generato
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2 text-center">
                            <div className="flex justify-center">
                                <img src={newToken.qrImage} alt="QR Code" className="rounded-lg border" />
                            </div>
                            <p className="text-sm text-gray-500">
                                Salva o stampa questo QR. Il token completo non verrà mostrato di nuovo.
                            </p>
                            <div className="rounded-lg bg-gray-50 p-3 text-left">
                                <div className="mb-1 text-xs text-gray-500">QR URL:</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 truncate text-xs">{newToken.qrUrl}</code>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(newToken.qrUrl)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
