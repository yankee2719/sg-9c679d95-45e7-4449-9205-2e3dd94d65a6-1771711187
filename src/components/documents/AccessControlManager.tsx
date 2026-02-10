// ============================================================================
// STEP 8E: ACCESS CONTROL MANAGER COMPONENT
// ============================================================================
// Gestione permessi granulari con:
// - Lista grant attivi
// - Concedi accesso a role/user
// - Revoca accesso
// - Permission levels (view/download/sign/manage)
// - Expiration date support
// - Grant reason tracking
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Trash2, UserPlus, Users, User, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface AccessControlManagerProps {
    documentId: string;
    currentUserId: string; // User managing permissions
}

interface AccessGrant {
    id: string;
    document_id: string;
    granted_to_role: string | null;
    granted_to_user_id: string | null;
    permission_level: 'view' | 'download' | 'sign' | 'manage';
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
    is_active: boolean;
    grant_reason: string | null;
}

type PermissionLevel = 'view' | 'download' | 'sign' | 'manage';

// ============================================================================
// PERMISSION LEVELS CONFIG
// ============================================================================

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; description: string }[] = [
    {
        value: 'view',
        label: 'View Only',
        description: 'Can only view document metadata'
    },
    {
        value: 'download',
        label: 'Download',
        description: 'Can view and download document'
    },
    {
        value: 'sign',
        label: 'Sign',
        description: 'Can view, download, and digitally sign'
    },
    {
        value: 'manage',
        label: 'Manage',
        description: 'Full control including permissions'
    },
];

const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'technician', label: 'Technician' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AccessControlManager({ documentId, currentUserId }: AccessControlManagerProps) {
    const { toast } = useToast();
    const [grants, setGrants] = useState < AccessGrant[] > ([]);
    const [loading, setLoading] = useState(true);
    const [showGrantDialog, setShowGrantDialog] = useState(false);

    // Grant form state
    const [grantType, setGrantType] = useState < 'role' | 'user' > ('role');
    const [selectedRole, setSelectedRole] = useState < string > ('technician');
    const [selectedUserId, setSelectedUserId] = useState < string > ('');
    const [permissionLevel, setPermissionLevel] = useState < PermissionLevel > ('view');
    const [grantReason, setGrantReason] = useState('');
    const [expirationDays, setExpirationDays] = useState < number > (0); // 0 = never expires
    const [submitting, setSubmitting] = useState(false);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // --------------------------------------------------------------------------
    // LOAD GRANTS
    // --------------------------------------------------------------------------

    const loadGrants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('document_access_grants')
                .select('*')
                .eq('document_id', documentId)
                .eq('is_active', true)
                .order('granted_at', { ascending: false });

            if (error) throw error;
            setGrants(data || []);
        } catch (error) {
            console.error('Failed to load grants:', error);
            toast({
                title: 'Load failed',
                description: 'Failed to load access grants',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGrants();
    }, [documentId]);

    // --------------------------------------------------------------------------
    // GRANT ACCESS
    // --------------------------------------------------------------------------

    const handleGrantAccess = async () => {
        if (grantType === 'user' && !selectedUserId.trim()) {
            toast({
                title: 'User ID required',
                description: 'Please enter a valid user ID',
                variant: 'destructive',
            });
            return;
        }

        if (!grantReason.trim()) {
            toast({
                title: 'Reason required',
                description: 'Please provide a reason for this grant',
                variant: 'destructive',
            });
            return;
        }

        setSubmitting(true);
        try {
            const expiresAt = expirationDays > 0
                ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
                : null;

            const { error } = await supabase.rpc('grant_document_access', {
                p_document_id: documentId,
                p_permission_level: permissionLevel,
                p_granted_by: currentUserId,
                p_granted_to_role: grantType === 'role' ? selectedRole : null,
                p_granted_to_user_id: grantType === 'user' ? selectedUserId : null,
                p_expires_at: expiresAt,
                p_grant_reason: grantReason.trim(),
            });

            if (error) throw error;

            toast({
                title: 'Access granted',
                description: `${permissionLevel} permission granted successfully`,
            });

            // Reset form
            setGrantReason('');
            setExpirationDays(0);
            setShowGrantDialog(false);
            loadGrants();
        } catch (error) {
            console.error('Grant failed:', error);
            toast({
                title: 'Grant failed',
                description: error instanceof Error ? error.message : 'Failed to grant access',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // --------------------------------------------------------------------------
    // REVOKE ACCESS
    // --------------------------------------------------------------------------

    const handleRevokeAccess = async (grantId: string) => {
        if (!confirm('Are you sure you want to revoke this access?')) return;

        try {
            const { error } = await supabase.rpc('revoke_document_access', {
                p_grant_id: grantId,
                p_revoked_by: currentUserId,
                p_revoke_reason: 'Revoked by user',
            });

            if (error) throw error;

            toast({
                title: 'Access revoked',
                description: 'Permission has been revoked',
            });

            loadGrants();
        } catch (error) {
            console.error('Revoke failed:', error);
            toast({
                title: 'Revoke failed',
                description: error instanceof Error ? error.message : 'Failed to revoke access',
                variant: 'destructive',
            });
        }
    };

    // --------------------------------------------------------------------------
    // FORMAT HELPERS
    // --------------------------------------------------------------------------

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isExpired = (expiresAt: string | null): boolean => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const getPermissionBadgeColor = (level: PermissionLevel): string => {
        switch (level) {
            case 'view': return 'bg-gray-500';
            case 'download': return 'bg-blue-500';
            case 'sign': return 'bg-purple-500';
            case 'manage': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Access Control</h3>
                    <p className="text-sm text-gray-500">
                        Manage who can access this document
                    </p>
                </div>
                <Button onClick={() => setShowGrantDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Grant Access
                </Button>
            </div>

            {/* Active Grants Table */}
            {grants.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">No access grants configured</p>
                    <p className="text-sm text-gray-400 mb-6">
                        By default, only admins and document owner can access this document
                    </p>
                    <Button onClick={() => setShowGrantDialog(true)}>
                        Grant Access
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Granted To</TableHead>
                                <TableHead>Permission</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Granted</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grants.map((grant) => (
                                <TableRow key={grant.id}>
                                    {/* Granted To */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {grant.granted_to_role ? (
                                                <>
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                    <div>
                                                        <div className="font-medium capitalize">
                                                            {grant.granted_to_role}
                                                        </div>
                                                        <div className="text-xs text-gray-500">Role</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <User className="h-4 w-4 text-green-500" />
                                                    <div>
                                                        <div className="font-medium font-mono text-xs">
                                                            {grant.granted_to_user_id?.substring(0, 8)}...
                                                        </div>
                                                        <div className="text-xs text-gray-500">Specific User</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Permission Level */}
                                    <TableCell>
                                        <Badge className={`${getPermissionBadgeColor(grant.permission_level)} text-white`}>
                                            {grant.permission_level}
                                        </Badge>
                                    </TableCell>

                                    {/* Reason */}
                                    <TableCell className="max-w-xs">
                                        <div className="text-sm truncate" title={grant.grant_reason || ''}>
                                            {grant.grant_reason || '-'}
                                        </div>
                                    </TableCell>

                                    {/* Granted Date */}
                                    <TableCell className="text-sm text-gray-500">
                                        {formatDate(grant.granted_at)}
                                    </TableCell>

                                    {/* Expiration */}
                                    <TableCell>
                                        {grant.expires_at ? (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span className={`text-sm ${isExpired(grant.expires_at) ? 'text-red-600' : ''}`}>
                                                    {formatDate(grant.expires_at)}
                                                    {isExpired(grant.expires_at) && ' (Expired)'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500">Never</span>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRevokeAccess(grant.id)}
                                            className="text-red-600 hover:text-red-700"
                                            title="Revoke access"
                                        >
                                            <ShieldOff className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Grant Access Dialog */}
            <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Grant Document Access</DialogTitle>
                        <DialogDescription>
                            Give permission to access this document to a role or specific user
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Grant Type Selector */}
                        <div className="flex gap-2">
                            <Button
                                variant={grantType === 'role' ? 'default' : 'outline'}
                                onClick={() => setGrantType('role')}
                                className="flex-1 gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Grant to Role
                            </Button>
                            <Button
                                variant={grantType === 'user' ? 'default' : 'outline'}
                                onClick={() => setGrantType('user')}
                                className="flex-1 gap-2"
                            >
                                <User className="h-4 w-4" />
                                Grant to User
                            </Button>
                        </div>

                        {/* Role/User Selector */}
                        {grantType === 'role' ? (
                            <div>
                                <Label>Select Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div>
                                <Label htmlFor="userId">User ID</Label>
                                <Input
                                    id="userId"
                                    placeholder="Enter user UUID"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    You can find user IDs in the user management section
                                </p>
                            </div>
                        )}

                        {/* Permission Level */}
                        <div>
                            <Label>Permission Level</Label>
                            <Select
                                value={permissionLevel}
                                onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERMISSION_LEVELS.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                            <div>
                                                <div className="font-medium">{level.label}</div>
                                                <div className="text-xs text-gray-500">{level.description}</div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Grant Reason */}
                        <div>
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Why are you granting this access?"
                                value={grantReason}
                                onChange={(e) => setGrantReason(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Expiration */}
                        <div>
                            <Label htmlFor="expiration">Expiration (days)</Label>
                            <Input
                                id="expiration"
                                type="number"
                                min="0"
                                placeholder="0 = Never expires"
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Leave as 0 for permanent access. Enter number of days for temporary access.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleGrantAccess} disabled={submitting}>
                            {submitting ? 'Granting...' : 'Grant Access'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Summary */}
            <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-blue-600">{grants.length}</div>
                        <div className="text-sm text-gray-500">Active Grants</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-orange-600">
                            {grants.filter((g) => g.expires_at && isExpired(g.expires_at)).length}
                        </div>
                        <div className="text-sm text-gray-500">Expired</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
