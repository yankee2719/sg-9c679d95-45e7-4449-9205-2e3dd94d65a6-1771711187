import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Building2,
    Users,
    Package,
    MapPin,
    Mail,
    Phone,
    Wrench,
    Plus,
    Trash2,
    UserPlus,
    Edit2,
    Save,
    X,
    Search,
    Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerOrg {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    created_at: string;
}

interface Member {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    display_name: string | null;
    email: string | null;
}

interface AssignedMachine {
    assignment_id: string;
    machine_id: string;
    machine_name: string;
    internal_code: string;
    category: string | null;
    lifecycle_state: string | null;
    assigned_at: string;
}

interface AvailableMachine {
    id: string;
    name: string;
    internal_code: string;
    category: string | null;
}

export default function CustomerDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { organization, membership, user, session, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState < CustomerOrg | null > (null);
    const [members, setMembers] = useState < Member[] > ([]);
    const [assignedMachines, setAssignedMachines] = useState < AssignedMachine[] > ([]);

    const [showAssignPanel, setShowAssignPanel] = useState(false);
    const [availableMachines, setAvailableMachines] = useState < AvailableMachine[] > ([]);
    const [machineSearch, setMachineSearch] = useState("");
    const [assigning, setAssigning] = useState < string | null > (null);

    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState("technician");
    const [addingUser, setAddingUser] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", city: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);

    const manufacturerOrgId = organization?.id ?? null;
    const orgType = organization?.type ?? null;
    const userRole = membership?.role ?? "technician";
    const canManage = userRole === "owner" || userRole === "admin" || userRole === "supervisor";

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (
                await supabase.auth.getSession()
            ).data.session?.access_token;

        if (!accessToken) throw new Error("Sessione scaduta");
        return accessToken;
    };

    useEffect(() => {
        if (!id || typeof id !== "string" || authLoading) return;
        void loadAll(id);
    }, [id, authLoading, manufacturerOrgId, orgType]);

    async function loadAll(customerId: string) {
        if (!manufacturerOrgId || orgType !== "manufacturer") {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const { data: org, error: orgError } = await supabase
                .from("organizations")
                .select(
                    "id, name, slug, city, email, phone, subscription_status, subscription_plan, created_at, manufacturer_org_id, type"
                )
                .eq("id", customerId)
                .eq("manufacturer_org_id", manufacturerOrgId)
                .eq("type", "customer")
                .single();

            if (orgError || !org) {
                void router.replace("/customers");
                return;
            }

            setCustomer(org as CustomerOrg);
            setEditForm({
                name: org.name,
                city: org.city || "",
                email: org.email || "",
                phone: org.phone || "",
            });

            const [membershipsRes, assignmentsRes] = await Promise.all([
                supabase
                    .from("organization_memberships")
                    .select("id, user_id, role, is_active")
                    .eq("organization_id", customerId)
                    .order("role"),
                supabase
                    .from("machine_assignments")
                    .select("id, machine_id, assigned_at, machines(name, internal_code, category, lifecycle_state)")
                    .eq("customer_org_id", customerId)
                    .eq("is_active", true)
                    .order("assigned_at", { ascending: false }),
            ]);

            if (membershipsRes.error) throw membershipsRes.error;
            if (assignmentsRes.error) throw assignmentsRes.error;

            const memberships = membershipsRes.data ?? [];
            const assignments = assignmentsRes.data ?? [];

            if (memberships.length > 0) {
                const userIds = memberships.map((m: any) => m.user_id);
                const { data: profiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, display_name, first_name, last_name, email")
                    .in("id", userIds);

                if (profilesError) throw profilesError;

                const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

                setMembers(
                    memberships.map((m: any) => {
                        const p = profileMap.get(m.user_id);
                        return {
                            id: m.id,
                            user_id: m.user_id,
                            role: m.role,
                            is_active: m.is_active,
                            display_name:
                                p?.display_name ||
                                `${p?.first_name || ""} ${p?.last_name || ""}`.trim() ||
                                null,
                            email: p?.email || null,
                        };
                    })
                );
            } else {
                setMembers([]);
            }

            setAssignedMachines(
                assignments.map((a: any) => ({
                    assignment_id: a.id,
                    machine_id: a.machine_id,
                    machine_name: a.machines?.name || "—",
                    internal_code: a.machines?.internal_code || "—",
                    category: a.machines?.category || null,
                    lifecycle_state: a.machines?.lifecycle_state || null,
                    assigned_at: a.assigned_at,
                }))
            );
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const openAssignPanel = async () => {
        if (!manufacturerOrgId || !customer) return;
        setShowAssignPanel(true);
        setMachineSearch("");

        const assignedIds = assignedMachines.map((a) => a.machine_id);

        const { data, error } = await supabase
            .from("machines")
            .select("id, name, internal_code, category")
            .eq("organization_id", manufacturerOrgId)
            .order("name");

        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return;
        }

        setAvailableMachines(
            ((data ?? []) as any[]).filter((m) => !assignedIds.includes(m.id))
        );
    };

    const handleAssign = async (machineId: string) => {
        if (!customer || !user?.id) return;

        setAssigning(machineId);
        try {
            const { error } = await supabase.from("machine_assignments").insert({
                machine_id: machineId,
                customer_org_id: customer.id,
                assigned_by: user.id,
                is_active: true,
            });

            if (error) throw error;

            toast({ title: "Macchina assegnata" });
            await loadAll(customer.id);
            setAvailableMachines((prev) => prev.filter((m) => m.id !== machineId));
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setAssigning(null);
        }
    };

    const handleUnassign = async (assignmentId: string, machineName: string) => {
        if (!confirm(`Rimuovere "${machineName}" da questo cliente?`)) return;

        try {
            const { error } = await supabase
                .from("machine_assignments")
                .update({ is_active: false })
                .eq("id", assignmentId);

            if (error) throw error;

            setAssignedMachines((prev) => prev.filter((a) => a.assignment_id !== assignmentId));
            toast({ title: "Macchina rimossa" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    const handleAddUser = async () => {
        if (!customer || !newUserName || !newUserEmail || !newUserPassword) return;

        setAddingUser(true);
        try {
            const accessToken = await getAccessToken();

            const response = await fetch("/api/users/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    full_name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                    organization_id: customer.id,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore");

            setShowAddUser(false);
            setNewUserName("");
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserRole("technician");

            toast({ title: "Utente creato" });
            await loadAll(customer.id);
        } catch (err: any) {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        } finally {
            setAddingUser(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!customer) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("organizations")
                .update({
                    name: editForm.name.trim(),
                    city: editForm.city.trim() || null,
                    email: editForm.email.trim() || null,
                    phone: editForm.phone.trim() || null,
                })
                .eq("id", customer.id);

            if (error) throw error;

            setCustomer({
                ...customer,
                ...editForm,
                city: editForm.city || null,
                email: editForm.email || null,
                phone: editForm.phone || null,
            });

            setEditing(false);
            toast({ title: "Cliente aggiornato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const getLifecycleColor = (state: string | null) => {
        const map: Record<string, string> = {
            active: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
            inactive: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
            under_maintenance: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
            decommissioned: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
        };
        return map[state || "active"] || map.active;
    };

    const getRoleBadge = (role: string) => {
        const map: Record<string, { label: string; color: string }> = {
            owner: {
                label: "Owner",
                color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
            },
            admin: {
                label: "Admin",
                color: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30",
            },
            supervisor: {
                label: "Supervisor",
                color: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30",
            },
            technician: {
                label: "Tecnico",
                color: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30",
            },
            viewer: {
                label: "Viewer",
                color: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30",
            },
        };
        return map[role] || map.technician;
    };

    const filteredAvailable = machineSearch
        ? availableMachines.filter(
            (m) =>
                m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
                m.internal_code.toLowerCase().includes(machineSearch.toLowerCase())
        )
        : availableMachines;

    if (authLoading || loading) return null;
    if (!customer) return null;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${customer.name} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/customers">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold">{customer.name}</h1>
                                <p className="text-sm text-muted-foreground">
                                    Organizzazione cliente
                                </p>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex gap-2">
                                {!editing ? (
                                    <Button variant="outline" onClick={() => setEditing(true)}>
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Modifica
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={() => setEditing(false)}>
                                            <X className="mr-2 h-4 w-4" />
                                            Annulla
                                        </Button>
                                        <Button onClick={handleSaveEdit} disabled={saving}>
                                            {saving ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="mr-2 h-4 w-4" />
                                            )}
                                            Salva
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2 rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Dati cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    {editing ? (
                                        <Input
                                            value={editForm.name}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="rounded-xl bg-muted px-4 py-3">
                                            {customer.name}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Città</Label>
                                    {editing ? (
                                        <Input
                                            value={editForm.city}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    city: e.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="rounded-xl bg-muted px-4 py-3 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            {customer.city || "—"}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    {editing ? (
                                        <Input
                                            value={editForm.email}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    email: e.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="rounded-xl bg-muted px-4 py-3 flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {customer.email || "—"}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Telefono</Label>
                                    {editing ? (
                                        <Input
                                            value={editForm.phone}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    phone: e.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="rounded-xl bg-muted px-4 py-3 flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            {customer.phone || "—"}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Riepilogo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="rounded-xl bg-muted p-4">
                                    <div className="text-sm text-muted-foreground">Utenti</div>
                                    <div className="mt-1 text-2xl font-bold">{members.length}</div>
                                </div>
                                <div className="rounded-xl bg-muted p-4">
                                    <div className="text-sm text-muted-foreground">
                                        Macchine assegnate
                                    </div>
                                    <div className="mt-1 text-2xl font-bold">
                                        {assignedMachines.length}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-muted p-4">
                                    <div className="text-sm text-muted-foreground">Piano</div>
                                    <div className="mt-1 text-lg font-semibold">
                                        {customer.subscription_plan || "—"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Utenti cliente
                            </CardTitle>
                            {canManage && (
                                <Button onClick={() => setShowAddUser((prev) => !prev)}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Aggiungi utente
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {showAddUser && (
                                <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Nome completo</Label>
                                        <Input
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            value={newUserEmail}
                                            onChange={(e) => setNewUserEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <Input
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ruolo</Label>
                                        <select
                                            value={newUserRole}
                                            onChange={(e) => setNewUserRole(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="admin">admin</option>
                                            <option value="supervisor">supervisor</option>
                                            <option value="technician">technician</option>
                                            <option value="viewer">viewer</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 flex gap-2">
                                        <Button onClick={handleAddUser} disabled={addingUser}>
                                            {addingUser && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Crea utente
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowAddUser(false)}
                                        >
                                            Annulla
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {members.length === 0 ? (
                                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                    Nessun utente cliente presente.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {members.map((member) => {
                                        const roleInfo = getRoleBadge(member.role);

                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-semibold">
                                                        {member.display_name || "—"}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {member.email || "—"}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`border ${roleInfo.color}`}>
                                                        {roleInfo.label}
                                                    </Badge>
                                                    {!member.is_active && (
                                                        <Badge variant="outline">inactive</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Macchine assegnate
                            </CardTitle>
                            {canManage && (
                                <Button onClick={openAssignPanel}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Assegna macchina
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {showAssignPanel && (
                                <div className="rounded-2xl border border-border p-4 space-y-4">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={machineSearch}
                                            onChange={(e) => setMachineSearch(e.target.value)}
                                            placeholder="Cerca macchina..."
                                            className="pl-10"
                                        />
                                    </div>

                                    {filteredAvailable.length === 0 ? (
                                        <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                            Nessuna macchina disponibile.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredAvailable.map((machine) => (
                                                <div
                                                    key={machine.id}
                                                    className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium">
                                                            {machine.name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {machine.internal_code}
                                                            {machine.category
                                                                ? ` · ${machine.category}`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleAssign(machine.id)}
                                                        disabled={assigning === machine.id}
                                                    >
                                                        {assigning === machine.id && (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        )}
                                                        Assegna
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {assignedMachines.length === 0 ? (
                                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                    Nessuna macchina assegnata.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {assignedMachines.map((machine) => (
                                        <div
                                            key={machine.assignment_id || machine.machine_id}
                                            className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Wrench className="h-4 w-4 text-muted-foreground" />
                                                    <div className="font-semibold">
                                                        {machine.machine_name}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {machine.internal_code}
                                                    {machine.category ? ` · ${machine.category}` : ""}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {machine.lifecycle_state && (
                                                    <Badge
                                                        className={`border ${getLifecycleColor(
                                                            machine.lifecycle_state
                                                        )}`}
                                                    >
                                                        {machine.lifecycle_state}
                                                    </Badge>
                                                )}

                                                {canManage && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleUnassign(
                                                                machine.assignment_id,
                                                                machine.machine_name
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}