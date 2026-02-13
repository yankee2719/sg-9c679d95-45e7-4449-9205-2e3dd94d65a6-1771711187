// ============================================================================
// QR TOKEN MANAGER COMPONENT
// ============================================================================
// File: src/components/QR/QrTokenManager.tsx
// Gestione token QR per equipment: genera, lista, revoca
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { QrToken, QrTokenType } from '@/services/offlineAndQrService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    QrCode, Plus, Trash2, Eye, CheckCircle2, XCircle, AlertCircle, Copy,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';

// ============================================================================
// TYPES
// ============================================================================

interface QrTokenManagerProps {
    equipmentId: string;
    equipmentName: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QrTokenManager({ equipmentId, equipmentName }: QrTokenManagerProps) {
    const [tokens, setTokens] = useState < QrToken[] > ([]);
    const [recentScans, setRecentScans] = useState < any[] > ([]);
    const [loading, setLoading] = useState(true);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [newToken, setNewToken] = useState < { tokenCleartext: string; qrUrl: string; qrImage: string } | null > (null);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [tokenType, setTokenType] = useState < QrTokenType > ('permanent');
    const [expiresIn, setExpiresIn] = useState < string > ('never');
    const [maxScans, setMaxScans] = useState < string > ('');

    // -----------------------------------------------------------------------
    // LOAD TOKENS
    // -----------------------------------------------------------------------

    const loadTokens = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/qr/equipment/${equipmentId}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to load');
            const { tokens: data, recent_scans } = await res.json();
            setTokens(data);
            setRecentScans(recent_scans);
        } catch (error) {
            console.error('Failed to load QR tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTokens();
    }, [equipmentId]);

    // -----------------------------------------------------------------------
    // GENERATE TOKEN
    // -----------------------------------------------------------------------

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            let expires_at: string | undefined;
            if (expiresIn !== 'never') {
                const days = parseInt(expiresIn);
                expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            }

            const res = await fetch('/api/qr/generate', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipment_id: equipmentId,
                    token_type: tokenType,
                    expires_at,
                    max_scans: maxScans ? parseInt(maxScans) : undefined,
                }),
            });

            if (!res.ok) throw new Error('Generation failed');

            const { token_cleartext, qr_url } = await res.json();

            // Generate QR code image
            const qrImage = await QRCode.toDataURL(qr_url, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            });

            setNewToken({ tokenCleartext: token_cleartext, qrUrl: qr_url, qrImage });
            setShowGenerateDialog(false);
            setShowQrDialog(true);
            await loadTokens();

        } catch (error) {
            console.error('Failed to generate token:', error);
        } finally {
            setGenerating(false);
        }
    };

    // -----------------------------------------------------------------------
    // REVOKE TOKEN
    // -----------------------------------------------------------------------

    const handleRevoke = async (tokenId: string) => {
        if (!confirm('Revoke this QR token? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/qr/equipment/${equipmentId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token_id: tokenId, reason: 'Manually revoked' }),
            });

            if (res.ok) await loadTokens();
        } catch (error) {
            console.error('Failed to revoke token:', error);
        }
    };

    // -----------------------------------------------------------------------
    // HELPERS
    // -----------------------------------------------------------------------

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getTokenTypeColor = (type: QrTokenType) => {
        const colors = {
            permanent: 'bg-blue-100 text-blue-700',
            temporary: 'bg-yellow-100 text-yellow-700',
            inspector: 'bg-purple-100 text-purple-700',
            maintenance: 'bg-green-100 text-green-700',
        };
        return colors[type];
    };

    // -----------------------------------------------------------------------
    // RENDER
    // -----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    const activeTokens = tokens.filter(t => t.is_active);
    const totalScans = tokens.reduce((sum, t) => sum + t.scan_count, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <QrCode className="h-6 w-6 text-gray-600" />
                    <div>
                        <h3 className="font-semibold text-lg">QR Access Tokens</h3>
                        <p className="text-sm text-gray-500">{equipmentName}</p>
                    </div>
                </div>
                <Button onClick={() => setShowGenerateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate QR
                </Button>
            </div>

            {/* Stats */}
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

            {/* Token List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                    {tokens.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No QR tokens generated yet
                        </div>
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
                                            <Badge className={getTokenTypeColor(token.token_type)}>
                                                {token.token_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {token.token_prefix}...
                                            </code>
                                        </TableCell>
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
                                            {token.expires_at
                                                ? formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })
                                                : 'Never'
                                            }
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {format(new Date(token.created_at), 'PP')}
                                        </TableCell>
                                        <TableCell>
                                            {token.is_active && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRevoke(token.id)}
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

            {/* Recent Scans */}
            {recentScans.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Scans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentScans.slice(0, 5).map((scan) => (
                                <div key={scan.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        {scan.access_granted ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <div>
                                            <div className="text-sm font-medium">
                                                {scan.access_granted ? 'Access granted' : `Denied: ${scan.denial_reason}`}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                    {scan.was_offline && (
                                        <Badge variant="outline" className="text-xs">Offline</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Generate Dialog */}
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate QR Token</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Token Type</Label>
                            <Select value={tokenType} onValueChange={(v) => setTokenType(v as QrTokenType)}>
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
                                onChange={(e) => setMaxScans(e.target.value)}
                                placeholder="Unlimited"
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={generating}>
                                {generating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* QR Code Dialog */}
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
                            {/* QR Image */}
                            <div className="flex justify-center">
                                <img src={newToken.qrImage} alt="QR Code" className="rounded-lg border" />
                            </div>

                            <p className="text-sm text-gray-500">
                                Print or save this QR code. The token will not be shown again.
                            </p>

                            {/* Token URL */}
                            <div className="bg-gray-50 rounded-lg p-3 text-left">
                                <div className="text-xs text-gray-500 mb-1">QR URL:</div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs flex-1 truncate">{newToken.qrUrl}</code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(newToken.qrUrl)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <Button className="w-full" onClick={() => setShowQrDialog(false)}>
                                Done
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

