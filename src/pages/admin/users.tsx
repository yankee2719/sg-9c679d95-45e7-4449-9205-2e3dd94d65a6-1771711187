import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
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
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { apiClient } from "@/lib/apiClient";
import {
  UserPlus,
  Shield,
  Users,
  Loader2,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "supervisor" | "technician";
  is_active: boolean;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  two_factor_enabled: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "technician" as "admin" | "supervisor" | "technician",
    phone: "",
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({
    full_name: "",
    role: "technician" as "admin" | "supervisor" | "technician",
    phone: "",
    is_active: true,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        
        const profile = await userService.getUserById(user.id);
        if (profile.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setUserRole(profile.role);
        setCurrentUserId(user.id);
        await loadUsers();
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email?.toLowerCase().includes(query) ||
            user.full_name?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await apiClient.users.list();

      if (error) {
        throw new Error(error);
      }

      setUsers(data?.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare gli utenti",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Email e password sono obbligatori",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await apiClient.users.create(newUserData);

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "✅ Utente Creato",
        description: `${newUserData.email} è stato creato con successo`,
      });

      setCreateDialogOpen(false);
      setNewUserData({
        email: "",
        password: "",
        full_name: "",
        role: "technician",
        phone: "",
      });

      await loadUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "❌ Errore",
        description: error.message || "Impossibile creare l'utente",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setEditing(true);
    try {
      const { error } = await apiClient.users.update(selectedUser.id, editUserData);

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "✅ Utente Aggiornato",
        description: "Le modifiche sono state salvate",
      });

      setEditDialogOpen(false);
      setSelectedUser(null);

      await loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "❌ Errore",
        description: error.message || "Impossibile aggiornare l'utente",
      });
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { error } = await apiClient.users.delete(userToDelete.id);

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "✅ Utente Eliminato",
        description: `${userToDelete.email} è stato eliminato`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);

      await loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "❌ Errore",
        description: error.message || "Impossibile eliminare l'utente",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      full_name: user.full_name || "",
      role: user.role,
      phone: user.phone || "",
      is_active: user.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>;
      case "supervisor":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Supervisore</Badge>;
      case "technician":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Tecnico</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <MainLayout userRole={userRole}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#fb923c]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Gestione Utenti - Maint Ops" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-[#fb923c]" />
              Gestione Utenti
            </h1>
            <p className="text-slate-400 mt-2">
              Amministra utenti, ruoli e permessi del sistema
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[#fb923c] hover:bg-[#f97316] text-white"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Nuovo Utente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Totale Utenti</p>
                  <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
                </div>
                <Users className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Amministratori</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {users.filter((u) => u.role === "admin").length}
                  </p>
                </div>
                <Shield className="h-12 w-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Supervisori</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {users.filter((u) => u.role === "supervisor").length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tecnici</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {users.filter((u) => u.role === "technician").length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Cerca per email, nome o ruolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              Elenco Utenti ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Nome</TableHead>
                    <TableHead className="text-slate-300">Ruolo</TableHead>
                    <TableHead className="text-slate-300">Stato</TableHead>
                    <TableHead className="text-slate-300">2FA</TableHead>
                    <TableHead className="text-slate-300">Ultimo Accesso</TableHead>
                    <TableHead className="text-slate-300 text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nessun utente trovato</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-slate-700">
                        <TableCell className="text-white">{user.email}</TableCell>
                        <TableCell className="text-slate-300">
                          {user.full_name || "-"}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Attivo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inattivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.two_factor_enabled ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Abilitato
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400">
                              Disabilitato
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString("it-IT")
                            : "Mai"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Crea Nuovo Utente</DialogTitle>
            <DialogDescription className="text-slate-400">
              Inserisci i dati del nuovo utente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, email: e.target.value })
                }
                placeholder="utente@example.com"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, password: e.target.value })
                }
                placeholder="••••••••"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-200">Nome Completo</Label>
              <Input
                id="full_name"
                value={newUserData.full_name}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, full_name: e.target.value })
                }
                placeholder="Mario Rossi"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-200">Ruolo *</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value: any) =>
                  setNewUserData({ ...newUserData, role: value })
                }
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="admin" className="text-white">Admin</SelectItem>
                  <SelectItem value="supervisor" className="text-white">Supervisor</SelectItem>
                  <SelectItem value="technician" className="text-white">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                value={newUserData.phone}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, phone: e.target.value })
                }
                placeholder="+39 123 456 7890"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creating}
              className="bg-[#fb923c] hover:bg-[#f97316] text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                "Crea Utente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Modifica Utente</DialogTitle>
            <DialogDescription className="text-slate-400">
              Aggiorna i dati di {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name" className="text-slate-200">Nome Completo</Label>
              <Input
                id="edit_full_name"
                value={editUserData.full_name}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, full_name: e.target.value })
                }
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_role" className="text-slate-200">Ruolo</Label>
              <Select
                value={editUserData.role}
                onValueChange={(value: any) =>
                  setEditUserData({ ...editUserData, role: value })
                }
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="admin" className="text-white">Admin</SelectItem>
                  <SelectItem value="supervisor" className="text-white">Supervisor</SelectItem>
                  <SelectItem value="technician" className="text-white">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone" className="text-slate-200">Telefono</Label>
              <Input
                id="edit_phone"
                type="tel"
                value={editUserData.phone}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, phone: e.target.value })
                }
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_is_active" className="text-slate-200">Stato</Label>
              <Select
                value={editUserData.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setEditUserData({ ...editUserData, is_active: value === "active" })
                }
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="active" className="text-white">Attivo</SelectItem>
                  <SelectItem value="inactive" className="text-white">Inattivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editing}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={editing}
              className="bg-[#fb923c] hover:bg-[#f97316] text-white"
            >
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva Modifiche"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Elimina Utente</DialogTitle>
            <DialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare <strong>{userToDelete?.email}</strong>?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina Utente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}