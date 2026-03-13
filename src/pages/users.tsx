import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMfaGuard } from "@/hooks/useMfaGuard";
import {
    UserPlus,
    Users,
    Loader2,
    Edit,
    Trash2,
    Search,
    Building2,
    Shield,
    ShieldAlert,
    CheckCircle,
    XCircle,
} from "lucide-react";

interface MemberUser {
    id: string;
    user_id: string;
    email: string;
    display_name: string | null;
    role: "admin" | "supervisor" | "technician";
    is_active: boolean;
    accepted_at: string | null;
}

export default function UsersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const { loading: mfaLoading, isAal2, needsMfa } = useMfaGuard();

    const [currentUserRole, setCurrentUserRole] = useState < string | null > (null);
    const [currentUserId, setCurrentUserId] = useState < string | null > (null);
    const [currentOrgId, setCurrentOrgId] = useState < string | null > (null);
    const [currentOrgName, setCurrentOrgName] = useState < string > ("");
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState < MemberUser[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "technician" as "admin" | "supervisor" | "technician",
    });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState < MemberUser | null > (null);
    const [editData, setEditData] = useState({
        display_name: "",
        role: "technician" as "admin" | "supervisor" | "technician",
        is_active: true,
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState < MemberUser | null > (null);

    const isAdmin = currentUserRole === "admin";
    const canManageUsers = currentUserRole === "admin" || currentUserRole === "supervisor";

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/login");
                    return;
                }

                const profileData = await getProfileData(user.id);
                if (!profileData || !["admin", "supervisor"].includes(profileData.role)) {
                    router.push("/dashboard");
                    return;
                }

                setCurrentUserRole(profileData.role);
                setCurrentUserId(user.id);
                setCurrentOrgId(profileData.organizationId);

                if (profileData.organizationId) {
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("name")
                        .eq("id", profileData.organizationId)
                        .single();

                    if (org) setCurrentOrgName(org.name);
                }

                await loadMembers(profileData.organizationId);
            } catch (error) {
                console.error("Error checking users page access:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [router]);

    const loadMembers = async (orgId: string | null) => {
        if (!orgId) return;

        try {
            const { data, error } = await supabase
                .from("organization_memberships")
                .select("id, user_id, role, is_active, accepted_at, profiles!inner(display_name, email)")
                .eq("organization_id", orgId)
                .order("accepted_at", { ascending: false });

            if (error) throw error;

            setMembers(
                (data || []).map((m: any) => ({
                    id: m.id,
                    user_id: m.user_id,
                    email: m.profiles?.email || "",
                    display_name: m.profiles?.display_name || null,
                    role: m.role,
                    is_active: m.is_active,
                    accepted_at: m.accepted_at,
                }))
            );
        } catch (error) {
            console.error("Error loading members:", error);
            toast({
                variant: "destructive",
                title: t("users.toast.error"),
                description: t("users.toast.loadError"),
            });
        }
    };

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase();
        return members.filter(
            (m) =>
                m.email?.toLowerCase().includes(q) ||
                m.display_name?.toLowerCase().includes(q) ||
                m.role?.toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    const handleCreateUser = async () => {
        if (!isAdmin) {
            toast({
                variant: "destructive",
                title: t("users.toast.permissionDenied"),
                description: t("users.toast.adminOnlyCreate"),
            });
            return;
        }

        if (!newUserData.email || !newUserData.password || !currentOrgId) {
            toast({
                variant: "destructive",
                title: t("users.toast.missingData"),
                description: t("users.toast.emailPasswordRequired"),
            });
            return;
        }

        setCreating(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) throw new Error(t("users.toast.sessionExpired"));

            const res = await fetch("/api/users/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    email: newUserData.email,
                    password: newUserData.password,
                    full_name: newUserData.full_name || undefined,
                    role: newUserData.role,
                    organization_id: currentOrgId,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || t("users.toast.createFailed"));

            toast({
                title: t("users.toast.userCreated"),
                description: newUserData.email,
            });

            setCreateDialogOpen(false);
            setNewUserData({ email: "", password: "", full_name: "", role: "technician" });
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error creating user:", error);
            toast({
                variant: "destructive",
                title: t("users.toast.error"),
                description: error instanceof Error ? error.message : t("users.toast.createError"),
            });
        } finally {
            setCreating(false);
        }
    };

    const handleEditMember = async () => {
        if (!isAdmin || !selectedMember || !currentOrgId) {
            toast({
                variant: "destructive",
                title: t("users.toast.permissionDenied"),
                description: t("users.toast.adminOnlyEdit"),
            });
            return;
        }

        setEditing(true);
        try {
            const { error: memError } = await supabase
                .from("organization_memberships")
                .update({
                    role: editData.role,
                    is_active: editData.is_active,
                    ...(editData.is_active
                        ? {}
                        : {
                            deactivated_at: new Date().toISOString(),
                            deactivated_by: currentUserId,
                        }),
                })
                .eq("id", selectedMember.id);

            if (memError) throw memError;

            if (editData.display_name !== selectedMember.display_name) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({ display_name: editData.display_name })
                    .eq("id", selectedMember.user_id);

                if (profileError) throw profileError;
            }

            toast({
                title: t("users.toast.userUpdated"),
                description: selectedMember.email,
            });

            setEditDialogOpen(false);
            setSelectedMember(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error updating member:", error);
            toast({
                variant: "destructive",
                title: t("users.toast.error"),
                description: error instanceof Error ? error.message : t("users.toast.updateError"),
            });
        } finally {
            setEditing(false);
        }
    };

    const handleDeactivateMember = async () => {
        if (!isAdmin || !memberToDelete || !currentOrgId) {
            toast({
                variant: "destructive",
                title: t("users.toast.permissionDenied"),
                description: t("users.toast.adminOnlyDeactivate"),
            });
            return;
        }

        if (memberToDelete.user_id === currentUserId) {
            toast({
                variant: "destructive",
                title: t("users.toast.operationNotAllowed"),
                description: t("users.toast.cannotDeactivateSelf"),
            });
            return;
        }

        setDeleting(true);
        try {
            const { error } = await supabase
                .from("organization_memberships")
                .update({
                    is_active: false,
                    deactivated_at: new Date().toISOString(),
                    deactivated_by: currentUserId,
                })
                .eq("id", memberToDelete.id);

            if (error) throw error;

            toast({
                title: t("users.toast.userDeactivated"),
                description: memberToDelete.email,
            });

            setDeleteDialogOpen(false);
            setMemberToDelete(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error deactivating member:", error);
            toast({
                variant: "destructive",
                title: t("users.toast.error"),
                description: error instanceof Error ? error.message : t("users.toast.deactivateError"),
            });
        } finally {
            setDeleting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const config: Record<string, { label: string; className: string }> = {
            admin: {
                label: t("users.role.admin"),
                className:
                    "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
            },
            supervisor: {
                label: t("users.role.supervisor"),
                className:
                    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
            },
            technician: {
                label: t("users.role.technician"),
                className:
                    "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
            },
        };

        const entry = config[role] || { label: role, className: "" };
        return <Badge className={entry.className}>{entry.label}</Badge>;
    };

    if (loading || mfaLoading) {
        return (
            <MainLayout userRole={currentUserRole ?? "technician"}>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (needsMfa && !isAal2) {
        return (
            <MainLayout userRole={currentUserRole ?? "technician"}>
                <SEO title={`${t("users.title")} - MACHINA`} />
                <div className="container mx-auto max-w-2xl py-10">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                            <div className="space-y-3">
                                <div className="text-lg font-semibold">Verifica 2FA richiesta</div>
                                <div className="text-sm text-muted-foreground">
                                    Per accedere alla gestione utenti devi completare l’autenticazione a due fattori.
                                </div>
                                <Button onClick={() => router.push("/settings/security")}>
                                    Vai a Sicurezza
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={currentUserRole ?? "technician"}>
            <SEO title={`${t("users.title")} - MACHINA`} />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                            <Users className="h-8 w-8 text-primary" />
                            {t("users.title")}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {t("users.subtitle")} {currentOrgName || t("users.activeOrganizationFallback")}.
                        </p>
                    </div>

                    {isAdmin && (
                        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            {t("users.new")}
                        </Button>
                    )}
                </div>

                {!isAdmin && (
                    <Card>
                        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 text-primary" />
                            {t("users.supervisorMode")}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.kpi.total")}</p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">{members.length}</p>
                                </div>
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.kpi.active")}</p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {members.filter((m) => m.is_active).length}
                                    </p>
                                </div>
                                <CheckCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.kpi.inactive")}</p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {members.filter((m) => !m.is_active).length}
                                    </p>
                                </div>
                                <XCircle className="h-6 w-6 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Building2 className="h-5 w-5 text-primary" />
                            {t("users.organizationMembers")}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("users.searchPlaceholder")}
                                className="pl-10"
                            />
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("users.table.user")}</TableHead>
                                        <TableHead>{t("users.table.role")}</TableHead>
                                        <TableHead>{t("users.table.status")}</TableHead>
                                        <TableHead>{t("users.table.acceptance")}</TableHead>
                                        <TableHead className="text-right">{t("users.table.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredMembers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                                {t("users.noResults")}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMembers.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-foreground">
                                                            {member.display_name || t("users.fallbackUnnamed")}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>{getRoleBadge(member.role)}</TableCell>

                                                <TableCell>
                                                    {member.is_active ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                                            {t("users.status.active")}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                                                            {t("users.status.inactive")}
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-muted-foreground">
                                                    {member.accepted_at
                                                        ? new Date(member.accepted_at).toLocaleDateString("it-IT")
                                                        : t("users.status.pending")}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!isAdmin}
                                                            onClick={() => {
                                                                setSelectedMember(member);
                                                                setEditData({
                                                                    display_name: member.display_name || "",
                                                                    role: member.role,
                                                                    is_active: member.is_active,
                                                                });
                                                                setEditDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!isAdmin || member.user_id === currentUserId}
                                                            onClick={() => {
                                                                setMemberToDelete(member);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.dialog.create.title")}</DialogTitle>
                        <DialogDescription>{t("users.dialog.create.description")}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-user-name">{t("users.field.fullName")}</Label>
                            <Input
                                id="new-user-name"
                                value={newUserData.full_name}
                                onChange={(e) => setNewUserData((p) => ({ ...p, full_name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-user-email">{t("users.field.email")}</Label>
                            <Input
                                id="new-user-email"
                                type="email"
                                value={newUserData.email}
                                onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-user-password">{t("users.field.password")}</Label>
                            <Input
                                id="new-user-password"
                                type="password"
                                value={newUserData.password}
                                onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("users.field.role")}</Label>
                            <Select
                                value={newUserData.role}
                                onValueChange={(value: "admin" | "supervisor" | "technician") =>
                                    setNewUserData((p) => ({ ...p, role: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">{t("users.role.admin")}</SelectItem>
                                    <SelectItem value="supervisor">{t("users.role.supervisor")}</SelectItem>
                                    <SelectItem value="technician">{t("users.role.technician")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleCreateUser} disabled={creating}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("users.dialog.create.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.dialog.edit.title")}</DialogTitle>
                        <DialogDescription>{t("users.dialog.edit.description")}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-display-name">{t("users.field.displayName")}</Label>
                            <Input
                                id="edit-display-name"
                                value={editData.display_name}
                                onChange={(e) => setEditData((p) => ({ ...p, display_name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("users.field.role")}</Label>
                            <Select
                                value={editData.role}
                                onValueChange={(value: "admin" | "supervisor" | "technician") =>
                                    setEditData((p) => ({ ...p, role: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">{t("users.role.admin")}</SelectItem>
                                    <SelectItem value="supervisor">{t("users.role.supervisor")}</SelectItem>
                                    <SelectItem value="technician">{t("users.role.technician")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("users.field.status")}</Label>
                            <Select
                                value={editData.is_active ? "active" : "inactive"}
                                onValueChange={(value: "active" | "inactive") =>
                                    setEditData((p) => ({ ...p, is_active: value === "active" }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t("users.status.active")}</SelectItem>
                                    <SelectItem value="inactive">{t("users.status.inactive")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleEditMember} disabled={editing}>
                            {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("users.dialog.edit.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.dialog.deactivate.title")}</DialogTitle>
                        <DialogDescription>
                            {t("users.dialog.deactivate.description")}{" "}
                            {memberToDelete?.display_name || memberToDelete?.email}?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleDeactivateMember} disabled={deleting}>
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("users.dialog.deactivate.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}