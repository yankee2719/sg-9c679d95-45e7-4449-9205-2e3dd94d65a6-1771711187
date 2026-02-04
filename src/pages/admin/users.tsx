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
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Building2,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "supervisor" | "technician";
  is_active: boolean;
  created_at: string;
  tenant_id: string | null;
}

interface Tenant {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "supervisor" | "technician" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [currentTenantName, setCurrentTenantName] = useState<string>("");
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
    is_active: true,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        
        // Get user profile with tenant info
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, tenant_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          router.push("/login");
          return;
        }

        // Only admin and supervisor can access this page
        if (profile.role !== "admin" && profile.role !== "supervisor") {
          router.push("/dashboard");
          return;
        }

        setCurrentUserRole(profile.role as "admin" | "supervisor" | "technician");
        setCurrentUserId(user.id);
        setCurrentTenantId(profile.tenant_id);

        // Get tenant name
        if (profile.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", profile.tenant_id)
            .single();
          
          if (tenant) {
            setCurrentTenantName(tenant.name);
          }
        }

        await loadUsers(profile.role as "admin" | "supervisor", profile.tenant_id);
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
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

  const loadUsers = async (role: "admin" | "supervisor", tenantId: string | null) => {
    try {
      // Load users from same tenant only (RLS will enforce this)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter based on role hierarchy
      let filteredData = data || [];
      
      if (role === "supervisor") {
        // Supervisors can only see technicians
        filteredData = filteredData.filter(u => u.role === "technician");
      }

      setUsers(filteredData.map(u => ({
        id: u.id,
        email: u.email || "",
        full_name: u.full_name,
        role: u.role as "admin" | "supervisor" | "technician",
        is_active: u.is_active ?? true,
        created_at: u.created_at || "",
        tenant_id: u.tenant_id,
      })));
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.loadError"),
      });
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = (): ("admin" | "supervisor" | "technician")[] => {
    if (currentUserRole === "admin") {
      return ["supervisor", "technician"];
    } else if (currentUserRole === "supervisor") {
      return ["technician"];
    }
    return [];
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.emailPasswordRequired"),
      });
      return;
    }

    // Validate role hierarchy
    const availableRoles = getAvailableRoles();
    if (!availableRoles.includes(newUserData.role)) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotCreateRole"),
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await apiClient.users.create({
        email: newUserData.email,
        password: newUserData.password,
        full_name: newUserData.full_name || undefined,
        role: newUserData.role,
      });

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "✅ " + t("users.created"),
        description: `${newUserData.email} ${t("users.createdSuccess")}`,
      });

      setCreateDialogOpen(false);
      setNewUserData({
        email: "",
        password: "",
        full_name: "",
        role: "technician",
        phone: "",
      });

      await loadUsers(currentUserRole!, currentTenantId);
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "❌ " + t("common.error"),
        description: error instanceof Error ? error.message : t("users.createError"),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    // Validate role hierarchy
    const availableRoles = getAvailableRoles();
    if (editUserData.role !== selectedUser.role && !availableRoles.includes(editUserData.role)) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotAssignRole"),
      });
      return;
    }

    setEditing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editUserData.full_name,
          role: editUserData.role,
          is_active: editUserData.is_active,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "✅ " + t("users.updated"),
        description: t("users.updatedSuccess"),
      });

      setEditDialogOpen(false);
      setSelectedUser(null);

      await loadUsers(currentUserRole!, currentTenantId);
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "❌ " + t("common.error"),
        description: error instanceof Error ? error.message : t("users.updateError"),
      });
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Prevent deleting yourself
    if (userToDelete.id === currentUserId) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotDeleteSelf"),
      });
      return;
    }

    // Validate role hierarchy
    if (currentUserRole === "supervisor" && userToDelete.role !== "technician") {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotDeleteRole"),
      });
      return;
    }

    setDeleting(true);
    try {
      // Deactivate user instead of deleting
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userToDelete.id);

      if (error) throw error;

      toast({
        title: "✅ " + t("users.deactivated"),
        description: `${userToDelete.email} ${t("users.deactivatedSuccess")}`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);

      await loadUsers(currentUserRole!, currentTenantId);
    } catch (error: unknown) {
      console.error("Error deactivating user:", error);
      toast({
        variant: "destructive",
        title: "❌ " + t("common.error"),
        description: error instanceof Error ? error.message : t("users.deleteError"),
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (user: User) => {
    // Validate can edit this user
    if (currentUserRole === "supervisor" && user.role !== "technician") {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotEditRole"),
      });
      return;
    }

    setSelectedUser(user);
    setEditUserData({
      full_name: user.full_name || "",
      role: user.role,
      is_active: user.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    // Validate can delete this user
    if (user.id === currentUserId) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotDeleteSelf"),
      });
      return;
    }

    if (currentUserRole === "supervisor" && user.role !== "technician") {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.cannotDeleteRole"),
      });
      return;
    }

    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t("users.roleAdmin")}</Badge>;
      case "supervisor":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{t("users.roleSupervisor")}</Badge>;
      case "technician":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("users.roleTechnician")}</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO title={`${t("users.title")} - Maint Ops`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              {t("users.title")}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              {currentTenantName && (
                <>
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{currentTenantName}</span>
                  <span>•</span>
                </>
              )}
              {currentUserRole === "admin" 
                ? t("users.descriptionAdmin")
                : t("users.descriptionSupervisor")}
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {t("users.newUser")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("users.totalUsers")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{users.length}</p>
                </div>
                <Users className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          {currentUserRole === "admin" && (
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("users.supervisors")}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {users.filter((u) => u.role === "supervisor").length}
                    </p>
                  </div>
                  <Shield className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("users.technicians")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {users.filter((u) => u.role === "technician").length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("users.activeUsers")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {users.filter((u) => u.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("users.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              {t("users.userList")} ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">{t("users.email")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("users.name")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("users.role")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("users.status")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("users.createdAt")}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{t("users.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{t("users.noUsers")}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell className="text-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.full_name || "-"}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t("users.active")}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              {t("users.inactive")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("it-IT")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              disabled={currentUserRole === "supervisor" && user.role !== "technician"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              disabled={user.id === currentUserId || (currentUserRole === "supervisor" && user.role !== "technician")}
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("users.createNew")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("users.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("users.email")} *</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, email: e.target.value })
                }
                placeholder="utente@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("users.password")} *</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">{t("users.fullName")}</Label>
              <Input
                id="full_name"
                value={newUserData.full_name}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, full_name: e.target.value })
                }
                placeholder="Mario Rossi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t("users.role")} *</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value: "admin" | "supervisor" | "technician") =>
                  setNewUserData({ ...newUserData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("users.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "supervisor" ? t("users.roleSupervisor") : t("users.roleTechnician")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("users.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={newUserData.phone}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, phone: e.target.value })
                }
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.creating")}
                </>
              ) : (
                t("users.createUser")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("users.editUser")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("users.editDescription")} {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">{t("users.fullName")}</Label>
              <Input
                id="edit_full_name"
                value={editUserData.full_name}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_role">{t("users.role")}</Label>
              <Select
                value={editUserData.role}
                onValueChange={(value: "admin" | "supervisor" | "technician") =>
                  setEditUserData({ ...editUserData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "supervisor" ? t("users.roleSupervisor") : t("users.roleTechnician")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_is_active">{t("users.status")}</Label>
              <Select
                value={editUserData.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setEditUserData({ ...editUserData, is_active: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("users.active")}</SelectItem>
                  <SelectItem value="inactive">{t("users.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={editing}
            >
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("users.deactivateUser")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("users.deactivateConfirm")} <strong>{userToDelete?.email}</strong>?
              {t("users.deactivateNote")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.deactivating")}
                </>
              ) : (
                t("users.deactivate")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}