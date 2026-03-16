import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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
import { useAuth } from "@/hooks/useAuth";
import {
    UserPlus,
    Users,
    Loader2,
    Edit,
    Trash2,
    Search,
    Building2,
    CheckCircle,
    XCircle,
} from "lucide-react";

interface MemberUser {
    id: string;
    membership_id: string;
    email: string;
    display_name: string | null;
    role: "owner" | "admin" | "supervisor" | "technician" | "viewer";
    is_active: boolean;
    accepted_at: string | null;
    created_at?: string | null;
}

const copy = {
    it: {
        seo: "Utenti - MACHINA",
        title: "Utenti",
        subtitle: "Gestisci gli utenti dell’organizzazione attiva.",
        total: "Utenti totali",
        active: "Utenti attivi",
        admins: "Admin e owner",
        search: "Cerca utente...",
        orgLabel: "Organizzazione",
        newUser: "Nuovo utente",
        loading: "Caricamento utenti...",
        noResults: "Nessun utente trovato.",
        createTitle: "Crea utente",
        createDescription: "Crea un nuovo utente e aggiungilo all’organizzazione attiva.",
        editTitle: "Modifica utente",
        editDescription: "Aggiorna ruolo, nome e stato dell’utente.",
        deleteTitle: "Rimuovi utente",
        deleteDescription: "Questa operazione rimuove la membership dell’utente dall’organizzazione.",
        fullName: "Nome completo",
        email: "Email",
        password: "Password",
        role: "Ruolo",
        status: "Stato",
        activeStatus: "Attivo",
        inactiveStatus: "Disattivo",
        actions: "Azioni",
        cancel: "Annulla",
        save: "Salva",
        create: "Crea",
        remove: "Rimuovi",
        confirmRemove: "Confermi la rimozione di questo utente?",
        created: "Utente creato",
        updated: "Utente aggiornato",
        removed: "Utente rimosso",
        error: "Errore",
        sessionExpired: "Sessione scaduta",
        missingData: "Compila email e password",
        cannotEditSelfRole: "Non puoi cambiare il tuo ruolo o disattivarti.",
        memberSince: "Abilitato",
    },
    en: {
        seo: "Users - MACHINA",
        title: "Users",
        subtitle: "Manage users in the active organization.",
        total: "Total users",
        active: "Active users",
        admins: "Admins and owners",
        search: "Search user...",
        orgLabel: "Organization",
        newUser: "New user",
        loading: "Loading users...",
        noResults: "No users found.",
        createTitle: "Create user",
        createDescription: "Create a new user and add it to the active organization.",
        editTitle: "Edit user",
        editDescription: "Update user role, name and status.",
        deleteTitle: "Remove user",
        deleteDescription: "This removes the user's membership from the organization.",
        fullName: "Full name",
        email: "Email",
        password: "Password",
        role: "Role",
        status: "Status",
        activeStatus: "Active",
        inactiveStatus: "Inactive",
        actions: "Actions",
        cancel: "Cancel",
        save: "Save",
        create: "Create",
        remove: "Remove",
        confirmRemove: "Confirm removal of this user?",
        created: "User created",
        updated: "User updated",
        removed: "User removed",
        error: "Error",
        sessionExpired: "Session expired",
        missingData: "Email and password are required",
        cannotEditSelfRole: "You cannot change your own role or deactivate yourself.",
        memberSince: "Enabled",
    },
    fr: {
        seo: "Utilisateurs - MACHINA",
        title: "Utilisateurs",
        subtitle: "Gérez les utilisateurs de l’organisation active.",
        total: "Utilisateurs totaux",
        active: "Utilisateurs actifs",
        admins: "Admins et owners",
        search: "Rechercher un utilisateur...",
        orgLabel: "Organisation",
        newUser: "Nouvel utilisateur",
        loading: "Chargement des utilisateurs...",
        noResults: "Aucun utilisateur trouvé.",
        createTitle: "Créer un utilisateur",
        createDescription: "Créez un nouvel utilisateur et ajoutez-le à l’organisation active.",
        editTitle: "Modifier l’utilisateur",
        editDescription: "Mettez à jour le rôle, le nom et l’état.",
        deleteTitle: "Supprimer l’utilisateur",
        deleteDescription: "Cette opération supprime l’adhésion de l’utilisateur à l’organisation.",
        fullName: "Nom complet",
        email: "Email",
        password: "Mot de passe",
        role: "Rôle",
        status: "Statut",
        activeStatus: "Actif",
        inactiveStatus: "Inactif",
        actions: "Actions",
        cancel: "Annuler",
        save: "Enregistrer",
        create: "Créer",
        remove: "Supprimer",
        confirmRemove: "Confirmer la suppression de cet utilisateur ?",
        created: "Utilisateur créé",
        updated: "Utilisateur mis à jour",
        removed: "Utilisateur supprimé",
        error: "Erreur",
        sessionExpired: "Session expirée",
        missingData: "Email et mot de passe requis",
        cannotEditSelfRole: "Vous ne pouvez pas changer votre propre rôle ni vous désactiver.",
        memberSince: "Activé",
    },
    es: {
        seo: "Usuarios - MACHINA",
        title: "Usuarios",
        subtitle: "Gestiona los usuarios de la organización activa.",
        total: "Usuarios totales",
        active: "Usuarios activos",
        admins: "Admins y owners",
        search: "Buscar usuario...",
        orgLabel: "Organización",
        newUser: "Nuevo usuario",
        loading: "Cargando usuarios...",
        noResults: "No se encontraron usuarios.",
        createTitle: "Crear usuario",
        createDescription: "Crea un nuevo usuario y añádelo a la organización activa.",
        editTitle: "Editar usuario",
        editDescription: "Actualiza rol, nombre y estado del usuario.",
        deleteTitle: "Eliminar usuario",
        deleteDescription: "Esta operación elimina la membresía del usuario en la organización.",
        fullName: "Nombre completo",
        email: "Email",
        password: "Contraseña",
        role: "Rol",
        status: "Estado",
        activeStatus: "Activo",
        inactiveStatus: "Inactivo",
        actions: "Acciones",
        cancel: "Cancelar",
        save: "Guardar",
        create: "Crear",
        remove: "Eliminar",
        confirmRemove: "¿Confirmas la eliminación de este usuario?",
        created: "Usuario creado",
        updated: "Usuario actualizado",
        removed: "Usuario eliminado",
        error: "Error",
        sessionExpired: "Sesión expirada",
        missingData: "Email y contraseña obligatorios",
        cannotEditSelfRole: "No puedes cambiar tu propio rol ni desactivarte.",
        memberSince: "Habilitado",
    },
} as const;

export default function UsersPage() {
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = copy[language];
    const { organization, membership, session, canManageMembers, loading: authLoading, user } =
        useAuth();

    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState < MemberUser[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "technician" as MemberUser["role"],
    });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState < MemberUser | null > (null);
    const [editData, setEditData] = useState({
        display_name: "",
        role: "technician" as MemberUser["role"],
        is_active: true,
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState < MemberUser | null > (null);

    const currentOrgId = organization?.id ?? null;
    const currentOrgName = organization?.name ?? "";
    const currentUserRole = membership?.role ?? "technician";
    const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";

    const loadMembers = async () => {
        if (!currentOrgId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const accessToken =
                session?.access_token ??
                (
                    await supabase.auth.getSession()
                ).data.session?.access_token;

            if (!accessToken) throw new Error(text.sessionExpired);

            const res = await fetch("/api/users/list", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || text.error);

            setMembers((result.users ?? []) as MemberUser[]);
        } catch (error: any) {
            console.error("Error loading members:", error);
            toast({
                variant: "destructive",
                title: text.error,
                description: error?.message || text.error,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        void loadMembers();
    }, [authLoading, currentOrgId]);

    const filteredMembers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return members;

        return members.filter((m) => {
            return (
                m.email?.toLowerCase().includes(q) ||
                m.display_name?.toLowerCase().includes(q) ||
                m.role?.toLowerCase().includes(q)
            );
        });
    }, [members, searchQuery]);

    const stats = useMemo(() => {
        return {
            total: members.length,
            active: members.filter((m) => m.is_active).length,
            admins: members.filter((m) => m.role === "owner" || m.role === "admin").length,
        };
    }, [members]);

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (
                await supabase.auth.getSession()
            ).data.session?.access_token;

        if (!accessToken) throw new Error(text.sessionExpired);
        return accessToken;
    };

    const handleCreateUser = async () => {
        if (!isAdmin || !currentOrgId) return;

        if (!newUserData.email.trim() || !newUserData.password.trim()) {
            toast({
                variant: "destructive",
                title: text.error,
                description: text.missingData,
            });
            return;
        }

        setCreating(true);
        try {
            const accessToken = await getAccessToken();

            const res = await fetch("/api/users/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    email: newUserData.email.trim(),
                    password: newUserData.password,
                    full_name: newUserData.full_name.trim() || undefined,
                    role: newUserData.role,
                    organization_id: currentOrgId,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || text.error);

            toast({
                title: text.created,
                description: newUserData.email.trim(),
            });

            setCreateDialogOpen(false);
            setNewUserData({
                email: "",
                password: "",
                full_name: "",
                role: "technician",
            });

            await loadMembers();
        } catch (error: any) {
            console.error("Error creating user:", error);
            toast({
                variant: "destructive",
                title: text.error,
                description: error?.message || text.error,
            });
        } finally {
            setCreating(false);
        }
    };

    const openEditDialog = (member: MemberUser) => {
        setSelectedMember(member);
        setEditData({
            display_name: member.display_name ?? "",
            role: member.role,
            is_active: member.is_active,
        });
        setEditDialogOpen(true);
    };

    const handleEditMember = async () => {
        if (!isAdmin || !selectedMember) return;

        if (selectedMember.id === user?.id) {
            if (editData.role !== selectedMember.role || !editData.is_active) {
                toast({
                    variant: "destructive",
                    title: text.error,
                    description: text.cannotEditSelfRole,
                });
                return;
            }
        }

        setEditing(true);
        try {
            const accessToken = await getAccessToken();

            const res = await fetch(`/api/users/${selectedMember.membership_id}/update`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    user_id: selectedMember.id,
                    display_name: editData.display_name.trim(),
                    role: editData.role,
                    is_active: editData.is_active,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || text.error);

            toast({
                title: text.updated,
                description: selectedMember.email,
            });

            setEditDialogOpen(false);
            setSelectedMember(null);
            await loadMembers();
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast({
                variant: "destructive",
                title: text.error,
                description: error?.message || text.error,
            });
        } finally {
            setEditing(false);
        }
    };

    const openDeleteDialog = (member: MemberUser) => {
        setMemberToDelete(member);
        setDeleteDialogOpen(true);
    };

    const handleDeleteMember = async () => {
        if (!isAdmin || !memberToDelete) return;

        setDeleting(true);
        try {
            const accessToken = await getAccessToken();

            const res = await fetch(`/api/users/${memberToDelete.membership_id}/delete`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || text.error);

            toast({
                title: text.removed,
                description: memberToDelete.email,
            });

            setDeleteDialogOpen(false);
            setMemberToDelete(null);
            await loadMembers();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast({
                variant: "destructive",
                title: text.error,
                description: error?.message || text.error,
            });
        } finally {
            setDeleting(false);
        }
    };

    const roleBadge = (role: MemberUser["role"]) => {
        const classes: Record<MemberUser["role"], string> = {
            owner: "bg-red-500/15 text-red-300 border-red-500/30",
            admin: "bg-orange-500/15 text-orange-300 border-orange-500/30",
            supervisor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
            technician: "bg-blue-500/15 text-blue-300 border-blue-500/30",
            viewer: "bg-slate-500/15 text-slate-300 border-slate-500/30",
        };

        return (
            <Badge className={`border ${classes[role] ?? classes.viewer}`}>
                {role}
            </Badge>
        );
    };

    if (authLoading) {
        return null;
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={currentUserRole}>
                <SEO title={text.seo} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1380px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {text.title}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {text.subtitle}
                                </p>
                            </div>

                            {canManageMembers && (
                                <Button
                                    className="rounded-2xl bg-orange-500 hover:bg-orange-600"
                                    onClick={() => setCreateDialogOpen(true)}
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {text.newUser}
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-5 w-5" />
                                        {text.total}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-4xl font-bold">
                                    {stats.total}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        {text.active}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-4xl font-bold">
                                    {stats.active}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                        <Building2 className="h-5 w-5" />
                                        {text.orgLabel}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-lg font-semibold">
                                    {currentOrgName || "—"}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-5 w-5" />
                                        {text.admins}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-4xl font-bold">
                                    {stats.admins}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-2xl">
                            <CardContent className="pt-6">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={text.search}
                                        className="h-12 rounded-2xl pl-12"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>{text.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                        {text.loading}
                                    </div>
                                ) : filteredMembers.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        {text.noResults}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{text.fullName}</TableHead>
                                                    <TableHead>{text.email}</TableHead>
                                                    <TableHead>{text.role}</TableHead>
                                                    <TableHead>{text.status}</TableHead>
                                                    <TableHead>{text.memberSince}</TableHead>
                                                    <TableHead className="text-right">
                                                        {text.actions}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredMembers.map((member) => (
                                                    <TableRow key={member.membership_id}>
                                                        <TableCell className="font-medium">
                                                            {member.display_name || "—"}
                                                        </TableCell>
                                                        <TableCell>{member.email}</TableCell>
                                                        <TableCell>{roleBadge(member.role)}</TableCell>
                                                        <TableCell>
                                                            {member.is_active ? (
                                                                <Badge className="border border-green-500/30 bg-green-500/15 text-green-300">
                                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                                    {text.activeStatus}
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="border border-slate-500/30 bg-slate-500/15 text-slate-300">
                                                                    <XCircle className="mr-1 h-3 w-3" />
                                                                    {text.inactiveStatus}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {member.accepted_at
                                                                ? new Date(
                                                                    member.accepted_at
                                                                ).toLocaleDateString()
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {isAdmin && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openEditDialog(member)}
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                openDeleteDialog(member)
                                                                            }
                                                                            disabled={member.id === user?.id}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{text.createTitle}</DialogTitle>
                            <DialogDescription>{text.createDescription}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{text.fullName}</Label>
                                <Input
                                    value={newUserData.full_name}
                                    onChange={(e) =>
                                        setNewUserData((prev) => ({
                                            ...prev,
                                            full_name: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.email}</Label>
                                <Input
                                    type="email"
                                    value={newUserData.email}
                                    onChange={(e) =>
                                        setNewUserData((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.password}</Label>
                                <Input
                                    type="text"
                                    value={newUserData.password}
                                    onChange={(e) =>
                                        setNewUserData((prev) => ({
                                            ...prev,
                                            password: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.role}</Label>
                                <Select
                                    value={newUserData.role}
                                    onValueChange={(value: MemberUser["role"]) =>
                                        setNewUserData((prev) => ({
                                            ...prev,
                                            role: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">admin</SelectItem>
                                        <SelectItem value="supervisor">supervisor</SelectItem>
                                        <SelectItem value="technician">technician</SelectItem>
                                        <SelectItem value="viewer">viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                            >
                                {text.cancel}
                            </Button>
                            <Button onClick={handleCreateUser} disabled={creating}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {text.create}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{text.editTitle}</DialogTitle>
                            <DialogDescription>{text.editDescription}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{text.fullName}</Label>
                                <Input
                                    value={editData.display_name}
                                    onChange={(e) =>
                                        setEditData((prev) => ({
                                            ...prev,
                                            display_name: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.role}</Label>
                                <Select
                                    value={editData.role}
                                    onValueChange={(value: MemberUser["role"]) =>
                                        setEditData((prev) => ({
                                            ...prev,
                                            role: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">admin</SelectItem>
                                        <SelectItem value="supervisor">supervisor</SelectItem>
                                        <SelectItem value="technician">technician</SelectItem>
                                        <SelectItem value="viewer">viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{text.status}</Label>
                                <Select
                                    value={editData.is_active ? "active" : "inactive"}
                                    onValueChange={(value) =>
                                        setEditData((prev) => ({
                                            ...prev,
                                            is_active: value === "active",
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{text.activeStatus}</SelectItem>
                                        <SelectItem value="inactive">
                                            {text.inactiveStatus}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                {text.cancel}
                            </Button>
                            <Button onClick={handleEditMember} disabled={editing}>
                                {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {text.save}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{text.deleteTitle}</DialogTitle>
                            <DialogDescription>{text.deleteDescription}</DialogDescription>
                        </DialogHeader>

                        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                            {text.confirmRemove}
                            {memberToDelete?.email ? ` ${memberToDelete.email}` : ""}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                {text.cancel}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteMember}
                                disabled={deleting}
                            >
                                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {text.remove}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </MainLayout>
        </OrgContextGuard>
    );
}