import { useState, useEffect } from "react";
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
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    UserPlus, Shield, Users, Loader2, Edit, Trash2, AlertCircle,
    CheckCircle, XCircle, Search, Building2,
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

export default function AdminUsersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();

    const [currentUserRole, setCurrentUserRole] = useState < string | null > (null);
    const [currentUserId, setCurrentUserId] = useState < string | null > (null);
    const [currentOrgId, setCurrentOrgId] = useState < string | null > (null);
    const [currentOrgName, setCurrentOrgName] = useState < string > ("");
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState < MemberUser[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredMembers, setFilteredMembers] = useState < MemberUser[] > ([]);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: "", password: "", full_name: "",
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

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push("/login"); return; }
                const profileData = await getProfileData(user.id);
                if (!profileData || profileData.role !== "admin") { router.push("/dashboard"); return; }
                setCurrentUserRole(profileData.role);
                setCurrentUserId(user.id);
                setCurrentOrgId(profileData.organizationId);
                if (profileData.organizationId) {
                    const { data: org } = await supabase.from("organizations").select("name").eq("id", profileData.organizationId).single();
                    if (org) setCurrentOrgName(org.name);
                }
                await loadMembers(profileData.organizationId);
            } catch (error) {
                console.error("Error checking access:", error);
                router.push("/login");
            } finally { setLoading(false); }
        };
        checkAccess();
    }, [router]);

    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredMembers(members); }
        else {
            const q = searchQuery.toLowerCase();
            setFilteredMembers(members.filter(m =>
                m.email?.toLowerCase().includes(q) ||
                m.display_name?.toLowerCase().includes(q) ||
                m.role?.toLowerCase().includes(q)
            ));
        }
    }, [searchQuery, members]);

    const loadMembers = async (orgId: string | null) => {
        if (!orgId) return;
        try {
            const { data, error } = await supabase
                .from("organization_memberships")
                .select("id, user_id, role, is_active, accepted_at, profiles!inner(display_name, email)")
                .eq("organization_id", orgId)
                .order("accepted_at", { ascending: false });
            if (error) throw error;
            setMembers((data || []).map((m: any) => ({
                id: m.id, user_id: m.user_id, email: m.profiles?.email || "",
                display_name: m.profiles?.display_name || null, role: m.role,
                is_active: m.is_active, accepted_at: m.accepted_at,
            })));
        } catch (error) {
            console.error("Error loading members:", error);
            toast({ variant: "destructive", title: t("common.error"), description: t("users.loadError") });
        }
    };

    const getAvailableRoles = (): ("admin" | "supervisor" | "technician")[] => ["admin", "supervisor", "technician"];

    const handleCreateUser = async () => {
        if (!newUserData.email || !newUserData.password) {
            toast({ variant: "destructive", title: t("common.error"), description: t("users.emailPasswordRequired") });
            return;
        }
        if (!currentOrgId) return;
        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("Sessione scaduta, effettua di nuovo il login");
            const res = await fetch("/api/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
                body: JSON.stringify({ email: newUserData.email, password: newUserData.password, full_name: newUserData.full_name || undefined, role: newUserData.role, organization_id: currentOrgId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Creation failed");
            toast({ title: "✅ " + t("users.created"), description: `${newUserData.email}` });
            setCreateDialogOpen(false);
            setNewUserData({ email: "", password: "", full_name: "", role: "technician" });
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error creating user:", error);
            toast({ variant: "destructive", title: "❌ " + t("common.error"), description: error instanceof Error ? error.message : t("users.createError") });
        } finally { setCreating(false); }
    };

    const handleEditMember = async () => {
        if (!selectedMember || !currentOrgId) return;
        setEditing(true);
        try {
            const { error: memError } = await supabase.from("organization_memberships").update({
                role: editData.role, is_active: editData.is_active,
                ...(editData.is_active ? {} : { deactivated_at: new Date().toISOString(), deactivated_by: currentUserId }),
            }).eq("id", selectedMember.id);
            if (memError) throw memError;
            if (editData.display_name !== selectedMember.display_name) {
                await supabase.from("profiles").update({ display_name: editData.display_name }).eq("id", selectedMember.user_id);
            }
            toast({ title: "✅ " + t("users.updated"), description: t("users.updatedSuccess") });
            setEditDialogOpen(false);
            setSelectedMember(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error updating member:", error);
            toast({ variant: "destructive", title: "❌ " + t("common.error"), description: error instanceof Error ? error.message : t("users.updateError") });
        } finally { setEditing(false); }
    };

    const handleDeactivateMember = async () => {
        if (!memberToDelete || !currentOrgId) return;
        if (memberToDelete.user_id === currentUserId) {
            toast({ variant: "destructive", title: t("common.error"), description: t("users.cannotDeleteSelf") });
            return;
        }
        setDeleting(true);
        try {
            const { error } = await supabase.from("organization_memberships").update({
                is_active: false, deactivated_at: new Date().toISOString(), deactivated_by: currentUserId,
            }).eq("id", memberToDelete.id);
            if (error) throw error;
            toast({ title: "✅ " + t("users.deactivated"), description: `${memberToDelete.email}` });
            setDeleteDialogOpen(false);
            setMemberToDelete(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error deactivating member:", error);
            toast({ variant: "destructive", title: "❌ " + t("common.error"), description: error instanceof Error ? error.message : t("users.deleteError") });
        } finally { setDeleting(false); }
    };

    const openEditDialog = (member: MemberUser) => {
        setSelectedMember(member);
        setEditData({ display_name: member.display_name || "", role: member.role, is_active: member.is_active });
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (member: MemberUser) => {
        if (member.user_id === currentUserId) {
            toast({ variant: "destructive", title: t("common.error"), description: t("users.cannotDeleteSelf") });
            return;
        }
        setMemberToDelete(member);
        setDeleteDialogOpen(true);
    };

    const getRoleBadge = (role: string) => {
        const config: Record<string, { label: string; color: string }> = {
            admin: { label: t("users.admin"), color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30" },
            supervisor: { label: t("users.supervisor"), color: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30" },
            technician: { label: t("users.technician"), color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
        };
        const c = config[role] || { label: role, color: "" };
        return <Badge className={c.color}>{c.label}</Badge>;
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = { admin: t("users.admin"), supervisor: t("users.supervisor"), technician: t("users.technician") };
        return labels[role] || role;
    };

    if (loading) {
        return (<MainLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>);
    }

    return (
        <MainLayout>
            <SEO title={`${t("users.title")} - MACHINA`} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Shield className="h-8 w-8 text-primary" />
                            {t("users.title")}
                        </h1>
                        <p className="text-muted-foreground mt-2 flex items-center gap-2">
                            {currentOrgName && (<><Building2 className="h-4 w-4" /><span className="font-medium">{currentOrgName}</span><span>•</span></>)}
                            Gestione membri organizzazione
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                        <UserPlus className="h-5 w-5 mr-2" />{t("users.newUser")}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.totalUsers")}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{members.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.admin")}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{members.filter(m => m.role === "admin").length}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.supervisor")}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{members.filter(m => m.role === "supervisor").length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t("users.activeUsers")}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{members.filter(m => m.is_active).length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder={t("users.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Membri ({filteredMembers.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("users.email")}</TableHead>
                                        <TableHead>{t("users.name")}</TableHead>
                                        <TableHead>{t("users.role")}</TableHead>
                                        <TableHead>{t("users.status")}</TableHead>
                                        <TableHead className="text-right">{t("users.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                <p>{t("users.noUsers")}</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMembers.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell className="text-foreground font-medium">{member.email}</TableCell>
                                                <TableCell className="text-muted-foreground">{member.display_name || "—"}</TableCell>
                                                <TableCell>{getRoleBadge(member.role)}</TableCell>
                                                <TableCell>
                                                    {member.is_active ? (
                                                        <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30">
                                                            <CheckCircle className="h-3 w-3 mr-1" /> Attivo
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30">
                                                            <XCircle className="h-3 w-3 mr-1" /> Disattivato
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(member)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(member)}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                            disabled={member.user_id === currentUserId}>
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

            {/* Create User Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.createNew")}</DialogTitle>
                        <DialogDescription>Crea un nuovo utente per {currentOrgName}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("users.email")} *</Label>
                            <Input id="email" type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} placeholder="utente@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input id="password" type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome completo</Label>
                            <Input id="full_name" value={newUserData.full_name} onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })} placeholder="Mario Rossi" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Ruolo *</Label>
                            <Select value={newUserData.role} onValueChange={(v: "admin" | "supervisor" | "technician") => setNewUserData({ ...newUserData, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{getAvailableRoles().map(r => (<SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>{t("common.cancel")}</Button>
                        <Button onClick={handleCreateUser} disabled={creating}>
                            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creazione...</> : "Crea utente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifica membro</DialogTitle>
                        <DialogDescription>{selectedMember?.email}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={editData.display_name} onChange={(e) => setEditData({ ...editData, display_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Ruolo</Label>
                            <Select value={editData.role} onValueChange={(v: "admin" | "supervisor" | "technician") => setEditData({ ...editData, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{getAvailableRoles().map(r => (<SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Stato</Label>
                            <Select value={editData.is_active ? "active" : "inactive"} onValueChange={(v) => setEditData({ ...editData, is_active: v === "active" })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Attivo</SelectItem>
                                    <SelectItem value="inactive">Disattivato</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editing}>{t("common.cancel")}</Button>
                        <Button onClick={handleEditMember} disabled={editing}>
                            {editing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</> : "Salva"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Disattiva membro</DialogTitle>
                        <DialogDescription>Vuoi disattivare <strong>{memberToDelete?.email}</strong>? L'utente non potrà più accedere.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>{t("common.cancel")}</Button>
                        <Button onClick={handleDeactivateMember} disabled={deleting} variant="destructive">
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Disattivazione...</> : "Disattiva"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
