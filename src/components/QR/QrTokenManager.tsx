'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Copy } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import {
    QrToken,
    QrTokenType,
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
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [newToken, setNewToken] = useState < { tokenCleartext: string; qrUrl: string; qrImage: string } | null > (null);
    const [generating, setGenerating] = useState(false);

    const [tokenType, setTokenType] = useState < QrTokenType > ('permanent');
    const [expiresIn, setExpiresIn] = useState < string > ('never');
    const [maxScans, setMaxScans] = useState < string > ('');

    const loadTokens = async () => {
        setLoading(true);
        try {
            const payload = await listQrTokensForEquipment(equipmentId);
            setTokens(Array.isArray(payload.tokens) ? payload.tokens : []);
            setRecentScans(Array.isArray(payload.recent_scans) ? payload.recent_scans : []);
        } catch (error: any) {
            toast({
                title: 'Errore QR',
                description: error?.message || 'Impossibile caricare i token QR',
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
            let expiresAt: string | undefined;
            if (expiresIn !== 'never') {
                const days = parseInt(expiresIn, 10);
                expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            }

            const payload = await generateQrToken({
                equipment_id: equipmentId,
                token_type: tokenType,
                expires_at: expiresAt,
                max_scans: maxScans ? parseInt(maxScans, 10) : undefined,
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
            setShowGenerateDialog(false);
            setShowQrDialog(true);
            await loadTokens();
            toast({
                title: 'QR generato',
                description: 'Salva o stampa subito il QR: il token non verrà mostrato di nuovo.',
            });
        } catch (error: any) {
            toast({
                title: 'Generazione fallita',
                description: error?.message || 'Impossibile generare il token QR',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (tokenId: string) => {
        if (!window.confirm('Revocare questo QR token? Operazione non reversibile.')) return;

        try {
            await revokeQrToken(equipmentId, tokenId, 'Manually revoked');
            toast({ title: 'QR revocato', description: 'Token disattivato correttamente.' });
            await loadTokens();
        } catch (error: any) {
            toast({
                title: 'Revoca fallita',
                description: error?.message || 'Impossibile revocare il token QR',
                variant: 'destructive',
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiato', description: 'Link QR copiato negli appunti.' });
    };

    const getTokenTypeColor = (type: QrTokenType) => {
        const colors: Record<QrTokenType, string> = {
            permanent: 'bg-blue-100 text-blue-700',
            temporary: 'bg-yellow-100 text-yellow-700',
            inspector: 'bg-purple-100 text-purple-700',
            maintenance: 'bg-green-100 text-green-700',
        };
        return colors[type];
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <QrCode className="h-6 w-6 text-gray-600" />
                    <div>
                        <h3 className="text-lg font-semibold">QR Access Tokens</h3>
                        <p className="text-sm text-gray-500">{equipmentName}</p>
                    </div>
                </div>
                <Button onClick={() => setShowGenerateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate QR
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{activeTokens.length}</div>
                        <div className="text-sm text-gray-500">Active Tokens</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{totalScans}</div>
                        <div className="text-sm text-gray-500">Total Scans</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{recentScans.length}</div>
                        <div className="text-sm text-gray-500">Recent Scans</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                    {tokens.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No QR tokens generated yet</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scans</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tokens.map((token) => (
                                    <TableRow key={token.id}>
                                        <TableCell>
                                            <Badge className={getTokenTypeColor(token.token_type)}>{token.token_type}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{token.token_prefix}</TableCell>
                                        <TableCell>
                                            {token.is_active ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="text-sm">Active</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="text-sm">Revoked</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{token.scan_count}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {token.expires_at ? formatDistanceToNow(new Date(token.expires_at), { addSuffix: true }) : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">{format(new Date(token.created_at), 'PP')}</TableCell>
                                        <TableCell>
                                            {token.is_active && (
                                                <Button size="sm" variant="ghost" onClick={() => void handleRevoke(token.id)} className="text-red-600 hover:text-red-700">
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
                        <CardTitle className="text-base">Recent Scans</CardTitle>
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
                                                {scan.access_granted ? 'Access granted' : `Denied: ${scan.denial_reason || 'unknown'}`}
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

            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate QR Token</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Token Type</Label>
                            <Select value={tokenType} onValueChange={(value) => setTokenType(value as QrTokenType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="permanent">Permanent (fixed to machine)</SelectItem>
                                    <SelectItem value="temporary">Temporary (time-limited)</SelectItem>
                                    <SelectItem value="inspector">Inspector (external auditor)</SelectItem>
                                    <SelectItem value="maintenance">Maintenance (technician)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Expiration</Label>
                            <Select value={expiresIn} onValueChange={setExpiresIn}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="never">Never expires</SelectItem>
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                    <SelectItem value="90">90 days</SelectItem>
                                    <SelectItem value="365">1 year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_scans">Max Scans (optional)</Label>
                            <Input
                                id="max_scans"
                                type="number"
                                min="1"
                                value={maxScans}
                                onChange={(event) => setMaxScans(event.target.value)}
                                placeholder="Unlimited"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                            <Button onClick={() => void handleGenerate()} disabled={generating}>
                                {generating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {newToken && (
                <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                QR Token Generated
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2 text-center">
                            <div className="flex justify-center">
                                <img src={newToken.qrImage} alt="QR Code" className="rounded-lg border" />
                            </div>
                            <p className="text-sm text-gray-500">Print or save this QR code. The token will not be shown again.</p>
                            <div className="rounded-lg bg-gray-50 p-3 text-left">
                                <div className="mb-1 text-xs text-gray-500">QR URL:</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 truncate text-xs">{newToken.qrUrl}</code>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(newToken.qrUrl)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => setShowQrDialog(false)}>Done</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
