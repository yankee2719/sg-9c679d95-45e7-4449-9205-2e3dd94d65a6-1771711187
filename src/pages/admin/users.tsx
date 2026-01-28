import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, Search, AlertCircle, CheckCircle, Shield, UserCog, Wrench } from "lucide-react";

type UserRole = "admin" | "supervisor" | "technician";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole | null;
  two_factor_enabled: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create user modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "technician" as UserRole
  });

  // Edit user modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "technician" as UserRole
  });

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const checkAdminAccess = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const isAdmin = await userService.isAdmin(session.user.id);
      if (!isAdmin) {
        router.push("/dashboard");
        return;
      }

      await loadUsers();
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/login");
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map data to match UserProfile interface
      const mappedUsers: UserProfile[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
        two_factor_enabled: false // Default value as it's not in profiles table directly
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setError("Errore nel caricamento degli utenti");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    try {
      setError("");
      setSuccess("");

      if (!createForm.email || !createForm.password) {
        setError("Email e password sono obbligatori");
        return;
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        email_confirm: true,
        user_metadata: {
          full_name: createForm.full_name
        }
      });

      if (authError) throw authError;

      // Update profile with role and full_name
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            role: createForm.role,
            full_name: createForm.full_name || null
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;
      }

      setSuccess("Utente creato con successo");
      setCreateModalOpen(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "technician" });
      await loadUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      setError(error.message || "Errore nella creazione dell'utente");
    }
  };

  const handleEditUser = async () => {
    try {
      setError("");
      setSuccess("");

      if (!selectedUser) return;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name || null,
          role: editForm.role
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      setSuccess("Utente aggiornato con successo");
      setEditModalOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      setError(error.message || "Errore nell'aggiornamento dell'utente");
    }
  };

  const handleDeleteUser = async () => {
    try {
      setError("");
      setSuccess("");

      if (!userToDelete) return;

      // Delete user from Supabase Auth (this will cascade to profiles via trigger)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (deleteError) throw deleteError;

      setSuccess("Utente eliminato con successo");
      setDeleteModalOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setError(error.message || "Errore nell'eliminazione dell'utente");
    }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      role: user.role || "technician"
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const getRoleBadgeColor = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "supervisor":
        return "bg-blue-500";
      case "technician":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRoleLabel = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return "Amministratore";
      case "supervisor":
        return "Supervisore";
      case "technician":
        return "Tecnico";
      default:
        return "Non assegnato";
    }
  };

  return (
    <MainLayout>
      <SEO
        title="Gestione Utenti - Admin"
        description="Gestione completa degli utenti del sistema"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-slate-400">
                {users.length} users • {users.filter(u => u.role === "admin").length} admins • 
                {users.filter(u => u.role === "supervisor").length} supervisors • 
                {users.filter(u => u.role === "technician").length} technicians
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl">
              <Plus className="h-5 w-5 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">{users.filter(u => u.role === "admin").length}</h3>
                  <p className="text-sm text-slate-400">Administrators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">{users.filter(u => u.role === "supervisor").length}</h3>
                  <p className="text-sm text-slate-400">Supervisors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">{users.filter(u => u.role === "technician").length}</h3>
                  <p className="text-sm text-slate-400">Technicians</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Utenti Registrati ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Gestisci tutti gli utenti del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per email o nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtra per ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                  <SelectItem value="supervisor">Supervisore</SelectItem>
                  <SelectItem value="technician">Tecnico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nessun utente trovato</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Data Registrazione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.two_factor_enabled ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Attivo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600">
                              Disattivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell suppressHydrationWarning>
                          {new Date(user.created_at).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Create User Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Utente</DialogTitle>
              <DialogDescription>
                Aggiungi un nuovo utente al sistema
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="mario.rossi@example.com"
                />
              </div>

              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Password sicura"
                />
              </div>

              <div>
                <Label htmlFor="create-name">Nome Completo</Label>
                <Input
                  id="create-name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                />
              </div>

              <div>
                <Label htmlFor="create-role">Ruolo *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value: UserRole) => setCreateForm({ ...createForm, role: value })}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Amministratore</SelectItem>
                    <SelectItem value="supervisor">Supervisore</SelectItem>
                    <SelectItem value="technician">Tecnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateUser}>
                Crea Utente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifica Utente</DialogTitle>
              <DialogDescription>
                Aggiorna i dati dell'utente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Email (non modificabile)</Label>
                <Input value={selectedUser?.email || ""} disabled />
              </div>

              <div>
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                />
              </div>

              <div>
                <Label htmlFor="edit-role">Ruolo *</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: UserRole) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Amministratore</SelectItem>
                    <SelectItem value="supervisor">Supervisore</SelectItem>
                    <SelectItem value="technician">Tecnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleEditUser}>
                Salva Modifiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Conferma Eliminazione</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare questo utente?
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attenzione:</strong> Questa azione è irreversibile. L'utente{" "}
                <strong>{userToDelete?.email}</strong> verrà eliminato permanentemente
                dal sistema.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Utente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}