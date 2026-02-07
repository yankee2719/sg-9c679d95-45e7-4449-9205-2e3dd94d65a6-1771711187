// src/pages/platform/dashboard.tsx
/**
 * Platform Dashboard
 * Global view of all tenants for platform administrators
 * 
 * REQUIRES: platform_role in JWT claims
 * ROUTE: /platform/dashboard
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { platformService, type OrganizationWithHealth, type PlatformMetrics } from "@/services/platformService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Building2,
    Users,
    Factory,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    Ban,
    CheckSquare,
    Archive,
    Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlatformDashboard() {
    const router = useRouter();
    const { toast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState < OrganizationWithHealth[] > ([]);
    const [metrics, setMetrics] = useState < PlatformMetrics | null > (null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [healthFilter, setHealthFilter] = useState < string > ("all");

    // Dialog state
    const [actionDialog, setActionDialog] = useState < {
        open: boolean;
        action: "suspend" | "reactivate" | "impersonate" | "archive" | null;
        org: OrganizationWithHealth | null;
        reason?: string;
    } > ({ open: false, action: null, org: null });

    // Check platform access
    useEffect(() => {
        checkAccess();
    }, []);

    // Load data
    useEffect(() => {
        if (loading) {
            loadDashboard();
        }
    }, [loading]);

    const checkAccess = async () => {
        const isPlatform = await platformService.isPlatformUser();
        if (!isPlatform) {
            toast({
                title: "Access Denied",
                description: "You need platform administrator privileges to access this page.",
                variant: "destructive",
            });
            router.push("/dashboard");
            return;
        }
    };

    const loadDashboard = async () => {
        try {
            setLoading(true);

            // Load organizations and metrics
            const [orgs, metricsData] = await Promise.all([
                platformService.getAllOrganizations(),
                platformService.getPlatformMetrics(),
            ]);

            setOrganizations(orgs);
            setMetrics(metricsData);
        } catch (error) {
            console.error("Error loading dashboard:", error);
            toast({
                title: "Error",
                description: "Failed to load platform data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Filter organizations
    const filteredOrganizations = organizations.filter((org) => {
        // Search filter
        const matchesSearch =
            searchQuery === "" ||
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus =
            statusFilter === "all" || org.tenant_status === statusFilter;

        // Health filter
        const matchesHealth =
            healthFilter === "all" || org.health?.health_status === healthFilter;

        return matchesSearch && matchesStatus && matchesHealth;
    });

    // Action handlers
    const handleSuspend = async () => {
        if (!actionDialog.org || !actionDialog.reason) return;

        const { success } = await platformService.suspendTenant(
            actionDialog.org.id,
            actionDialog.reason
        );

        if (success) {
            toast({
                title: "Tenant Suspended",
                description: `${actionDialog.org.name} has been suspended.`,
            });
            loadDashboard();
        } else {
            toast({
                title: "Error",
                description: "Failed to suspend tenant",
                variant: "destructive",
            });
        }

        setActionDialog({ open: false, action: null, org: null });
    };

    const handleReactivate = async () => {
        if (!actionDialog.org) return;

        const { success } = await platformService.reactivateTenant(
            actionDialog.org.id
        );

        if (success) {
            toast({
                title: "Tenant Reactivated",
                description: `${actionDialog.org.name} has been reactivated.`,
            });
            loadDashboard();
        } else {
            toast({
                title: "Error",
                description: "Failed to reactivate tenant",
                variant: "destructive",
            });
        }

        setActionDialog({ open: false, action: null, org: null });
    };

    const handleImpersonate = async () => {
        if (!actionDialog.org || !actionDialog.reason) return;

        const { sessionId, error } = await platformService.startImpersonation(
            actionDialog.org.id,
            actionDialog.reason,
            4
        );

        if (sessionId) {
            toast({
                title: "Impersonation Started",
                description: `You now have access to ${actionDialog.org.name}`,
            });

            // Redirect to tenant dashboard
            setTimeout(() => {
                router.push("/dashboard");
            }, 1000);
        } else {
            toast({
                title: "Error",
                description: error?.message || "Failed to start impersonation",
                variant: "destructive",
            });
        }

        setActionDialog({ open: false, action: null, org: null });
    };

    const handleArchive = async () => {
        if (!actionDialog.org || !actionDialog.reason) return;

        const { success } = await platformService.archiveTenant(
            actionDialog.org.id,
            actionDialog.reason
        );

        if (success) {
            toast({
                title: "Tenant Archived",
                description: `${actionDialog.org.name} has been archived.`,
            });
            loadDashboard();
        } else {
            toast({
                title: "Error",
                description: "Failed to archive tenant",
                variant: "destructive",
            });
        }

        setActionDialog({ open: false, action: null, org: null });
    };

    // Get badge variant for status
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge variant="default" className="bg-green-600">Active</Badge>;
            case "suspended":
                return <Badge variant="destructive">Suspended</Badge>;
            case "read_only":
                return <Badge variant="outline">Read Only</Badge>;
            case "trial":
                return <Badge variant="secondary">Trial</Badge>;
            case "archived":
                return <Badge variant="outline" className="bg-gray-200">Archived</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Get health badge
    const getHealthBadge = (status?: string) => {
        if (!status) return null;

        switch (status) {
            case "healthy":
                return (
                    <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                    </Badge>
                );
            case "warning":
                return (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Warning
                    </Badge>
                );
            case "critical":
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Critical
                    </Badge>
                );
            case "inactive":
                return (
                    <Badge variant="outline" className="bg-gray-200">
                        Inactive
                    </Badge>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Platform Dashboard</h1>
                    <p className="text-muted-foreground">
                        Global tenant management and monitoring
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => loadDashboard()}
                    disabled={loading}
                >
                    <Activity className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Metrics Cards */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tenants</p>
                                <p className="text-3xl font-bold">{metrics.totalTenants}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {metrics.activeTenants}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Suspended</p>
                                <p className="text-3xl font-bold text-red-600">
                                    {metrics.suspendedTenants}
                                </p>
                            </div>
                            <Ban className="w-8 h-8 text-red-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-3xl font-bold">{metrics.totalUsers}</p>
                            </div>
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Machines</p>
                                <p className="text-3xl font-bold">{metrics.totalMachines}</p>
                            </div>
                            <Factory className="w-8 h-8 text-muted-foreground" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Health Distribution */}
            {metrics && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Health Distribution</h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {metrics.healthDistribution.healthy}
                            </div>
                            <div className="text-sm text-muted-foreground">Healthy</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {metrics.healthDistribution.warning}
                            </div>
                            <div className="text-sm text-muted-foreground">Warning</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {metrics.healthDistribution.critical}
                            </div>
                            <div className="text-sm text-muted-foreground">Critical</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">
                                {metrics.healthDistribution.inactive}
                            </div>
                            <div className="text-sm text-muted-foreground">Inactive</div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Filters */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Input
                            placeholder="Search by name or slug..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="read_only">Read Only</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Select value={healthFilter} onValueChange={setHealthFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by health" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Health</SelectItem>
                                <SelectItem value="healthy">Healthy</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Organizations Table */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                    Tenants ({filteredOrganizations.length})
                </h2>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Machines</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrganizations.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{org.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {org.slug}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{org.type}</Badge>
                                </TableCell>
                                <TableCell>{getStatusBadge(org.tenant_status)}</TableCell>
                                <TableCell>{getHealthBadge(org.health?.health_status)}</TableCell>
                                <TableCell>{org.active_users_count || 0}</TableCell>
                                <TableCell>{org.total_machines_count || 0}</TableCell>
                                <TableCell>
                                    {org.support_priority === "critical" && (
                                        <Star className="w-4 h-4 text-red-600 fill-red-600" />
                                    )}
                                    {org.support_priority === "high" && (
                                        <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setActionDialog({
                                                    open: true,
                                                    action: "impersonate",
                                                    org,
                                                })
                                            }
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            Access
                                        </Button>

                                        {org.tenant_status === "active" ? (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    setActionDialog({
                                                        open: true,
                                                        action: "suspend",
                                                        org,
                                                    })
                                                }
                                            >
                                                <Ban className="w-4 h-4 mr-1" />
                                                Suspend
                                            </Button>
                                        ) : org.tenant_status === "suspended" ? (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() =>
                                                    setActionDialog({
                                                        open: true,
                                                        action: "reactivate",
                                                        org,
                                                    })
                                                }
                                            >
                                                <CheckSquare className="w-4 h-4 mr-1" />
                                                Reactivate
                                            </Button>
                                        ) : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Action Dialog */}
            <AlertDialog
                open={actionDialog.open}
                onOpenChange={(open) =>
                    setActionDialog({ open, action: null, org: null })
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionDialog.action === "suspend" && "Suspend Tenant"}
                            {actionDialog.action === "reactivate" && "Reactivate Tenant"}
                            {actionDialog.action === "impersonate" && "Access Tenant Data"}
                            {actionDialog.action === "archive" && "Archive Tenant"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionDialog.action === "suspend" &&
                                `You are about to suspend ${actionDialog.org?.name}. Users will not be able to access their account.`}
                            {actionDialog.action === "reactivate" &&
                                `Reactivate ${actionDialog.org?.name}?`}
                            {actionDialog.action === "impersonate" &&
                                `You are about to access ${actionDialog.org?.name}'s data. This session will be logged and time-limited.`}
                            {actionDialog.action === "archive" &&
                                `Archive ${actionDialog.org?.name}? This action can be reversed.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {(actionDialog.action === "suspend" ||
                        actionDialog.action === "impersonate" ||
                        actionDialog.action === "archive") && (
                            <div className="py-4">
                                <label className="text-sm font-medium">
                                    Reason <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    placeholder={
                                        actionDialog.action === "impersonate"
                                            ? "e.g., Support ticket #1234"
                                            : "e.g., Non-payment"
                                    }
                                    value={actionDialog.reason || ""}
                                    onChange={(e) =>
                                        setActionDialog({ ...actionDialog, reason: e.target.value })
                                    }
                                    className="mt-2"
                                />
                            </div>
                        )}

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (actionDialog.action === "suspend") handleSuspend();
                                if (actionDialog.action === "reactivate") handleReactivate();
                                if (actionDialog.action === "impersonate") handleImpersonate();
                                if (actionDialog.action === "archive") handleArchive();
                            }}
                            disabled={
                                (actionDialog.action === "suspend" ||
                                    actionDialog.action === "impersonate" ||
                                    actionDialog.action === "archive") &&
                                !actionDialog.reason
                            }
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}