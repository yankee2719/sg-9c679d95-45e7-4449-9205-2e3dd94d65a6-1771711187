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
import {
    UserPlus, Users, Loader2, Edit, Trash2, Search, Building2, Shield,
    CheckCircle, XCircle,
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
                const { data: { user } } = await supabase.auth.getUser();
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

            setMembers((data || []).map((m: any) => ({
                id: m.id,
                user_id: m.user_id,
                email: m.profiles?.email || "",
                display_name: m.profiles?.display_name || null,
                role: m.role,
                is_active: m.is_active,
                accepted_at: m.accepted_at,
            })));
        } catch (error) {
            console.error("Error loading members:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare gli utenti dell'organizzazione.",
            });
        }
    };

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase();
        return members.filter((m) =>
            m.email?.toLowerCase().includes(q) ||
            m.display_name?.toLowerCase().includes(q) ||
            m.role?.toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    const handleCreateUser = async () => {
        if (!isAdmin) {
            toast({ variant: "destructive", title: "Permesso negato", description: "Solo gli admin possono creare utenti." });
            return;
        }
        if (!newUserData.email || !newUserData.password || !currentOrgId) {
            toast({ variant: "destructive", title: "Dati mancanti", description: "Email e password sono obbligatorie." });
            return;
        }

        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("Sessione scaduta, effettua di nuovo il login");

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
            if (!res.ok) throw new Error(result.error || "Creazione utente fallita");

            toast({ title: "Utente creato", description: newUserData.email });
            setCreateDialogOpen(false);
            setNewUserData({ email: "", password: "", full_name: "", role: "technician" });
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error creating user:", error);
            toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore creazione utente" });
        } finally {
            setCreating(false);
        }
    };

    const handleEditMember = async () => {
        if (!isAdmin || !selectedMember || !currentOrgId) {
            toast({ variant: "destructive", title: "Permesso negato", description: "Solo gli admin possono modificare utenti." });
            return;
        }

        setEditing(true);
        try {
            const { error: memError } = await supabase
                .from("organization_memberships")
                .update({
                    role: editData.role,
                    is_active: editData.is_active,
                    ...(editData.is_active ? {} : { deactivated_at: new Date().toISOString(), deactivated_by: currentUserId }),
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

            toast({ title: "Utente aggiornato", description: selectedMember.email });
            setEditDialogOpen(false);
            setSelectedMember(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error updating member:", error);
            toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore aggiornamento utente" });
        } finally {
            setEditing(false);
        }
    };

    const handleDeactivateMember = async () => {
        if (!isAdmin || !memberToDelete || !currentOrgId) {
            toast({ variant: "destructive", title: "Permesso negato", description: "Solo gli admin possono disattivare utenti." });
            return;
        }
        if (memberToDelete.user_id === currentUserId) {
            toast({ variant: "destructive", title: "Operazione non consentita", description: "Non puoi disattivare te stesso." });
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

            toast({ title: "Utente disattivato", description: memberToDelete.email });
            setDeleteDialogOpen(false);
            setMemberToDelete(null);
            await loadMembers(currentOrgId);
        } catch (error: unknown) {
            console.error("Error deactivating member:", error);
            toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore disattivazione utente" });
        } finally {
            setDeleting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const config: Record<string, { label: string; className: string }> = {
            admin: { label: "Admin", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" },
            supervisor: { label: "Supervisor", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30" },
            technician: { label: "Tecnico", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" },
        };
        const entry = config[role] || { label: role, className: "" };
        return <Badge className={entry.className}>{entry.label}</Badge>;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={currentUserRole ?? "technician"}>
            <SEO title="Utenti - MACHINA" />
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                            <Users className="h-8 w-8 text-primary" />
                            Utenti
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Gestisci utenti e ruoli per {currentOrgName || "l'organizzazione attiva"}.
                        </p>
                    </div>

                    {isAdmin && (
                        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Nuovo utente
                        </Button>
                    )}
                </div>

                {!isAdmin && (
                    <Card>
                        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 text-primary" />
                            Modalità supervisore: puoi vedere gli utenti, ma creazione, modifica e disattivazione restano disponibili solo agli admin.
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Utenti totali</p>
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
                                    <p className="text-sm text-muted-foreground">Utenti attivi</p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">{members.filter((m) => m.is_active).length}</p>
                                </div>
                                <CheckCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Utenti disattivi</p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">{members.filter((m) => !m.is_active).length}</p>
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
                            Membri organizzazione
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cerca per nome, email o ruolo"
                                className="pl-10"
                            />
                        </div>

                        <div className="rounded-xl border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utente</TableHead>
                                        <TableHead>Ruolo</TableHead>
                                        <TableHead>Stato</TableHead>
                                        <TableHead>Accettazione</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                                Nessun utente trovato.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMembers.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-foreground">{member.display_name || "Utente senza nome"}</div>
                                                        <div className="text-sm text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(member.role)}</TableCell>
                                                <TableCell>
                                                    {member.is_active ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">Attivo</Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">Disattivo</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {member.accepted_at ? new Date(member.accepted_at).toLocaleDateString("it-IT") : "In attesa"}
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
                        <DialogTitle>Nuovo utente</DialogTitle>
                        <DialogDescription>Crea un nuovo utente nell'organizzazione attiva.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-user-name">Nome completo</Label>
                            <Input id="new-user-name" value={newUserData.full_name} onChange={(e) => setNewUserData((p) => ({ ...p, full_name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-user-email">Email</Label>
                            <Input id="new-user-email" type="email" value={newUserData.email} onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-user-password">Password</Label>
                            <Input id="new-user-password" type="password" value={newUserData.password} onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Ruolo</Label>
                            <Select value={newUserData.role} onValueChange={(value: "admin" | "supervisor" | "technician") => setNewUserData((p) => ({ ...p, role: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="technician">Tecnico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annulla</Button>
                        <Button onClick={handleCreateUser} disabled={creating}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crea utente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifica utente</DialogTitle>
                        <DialogDescription>Aggiorna nome, ruolo e stato dell'utente selezionato.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-display-name">Nome visualizzato</Label>
                            <Input id="edit-display-name" value={editData.display_name} onChange={(e) => setEditData((p) => ({ ...p, display_name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Ruolo</Label>
                            <Select value={editData.role} onValueChange={(value: "admin" | "supervisor" | "technician") => setEditData((p) => ({ ...p, role: value }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="technician">Tecnico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Stato</Label>
                            <Select value={editData.is_active ? "active" : "inactive"} onValueChange={(value: "active" | "inactive") => setEditData((p) => ({ ...p, is_active: value === "active" }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Attivo</SelectItem>
                                    <SelectItem value="inactive">Disattivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annulla</Button>
                        <Button onClick={handleEditMember} disabled={editing}>
                            {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salva modifiche
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disattiva utente</DialogTitle>
                        <DialogDescription>
                            Vuoi davvero disattivare {memberToDelete?.display_name || memberToDelete?.email}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
                        <Button variant="destructive" onClick={handleDeactivateMember} disabled={deleting}>
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disattiva
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
