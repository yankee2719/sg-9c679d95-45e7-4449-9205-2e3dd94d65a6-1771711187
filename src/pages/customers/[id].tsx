import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Building2, Users, Package, MapPin, Mail, Phone,
    Wrench, Plus, Trash2, UserPlus, ChevronRight, Edit2, Save, X,
    Check, Search, Loader2,
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

    const [loading, setLoading] = useState(true);
    const [mfrOrgId, setMfrOrgId] = useState < string | null > (null);
    const [customer, setCustomer] = useState < CustomerOrg | null > (null);
    const [members, setMembers] = useState < Member[] > ([]);
    const [assignedMachines, setAssignedMachines] = useState < AssignedMachine[] > ([]);

    // Assign machine modal
    const [showAssignPanel, setShowAssignPanel] = useState(false);
    const [availableMachines, setAvailableMachines] = useState < AvailableMachine[] > ([]);
    const [machineSearch, setMachineSearch] = useState("");
    const [assigning, setAssigning] = useState < string | null > (null);

    // Add supervisor
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState("technician");
    const [addingUser, setAddingUser] = useState(false);

    // Edit customer
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", city: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id && typeof id === "string") loadAll(id);
    }, [id]);

    async function loadAll(customerId: string) {
        try {
            const ctx = await getUserContext();
            if (!ctx || ctx.orgType !== "manufacturer") { router.push("/dashboard"); return; }
            setMfrOrgId(ctx.orgId);

            // Load customer org
            const { data: org } = await supabase
                .from("organizations").select("*").eq("id", customerId).single();
            if (!org) { router.push("/customers"); return; }
            setCustomer(org);
            setEditForm({ name: org.name, city: org.city || "", email: org.email || "", phone: org.phone || "" });

            // Load members with profile info
            const { data: memberships } = await supabase
                .from("organization_memberships")
                .select("id, user_id, role, is_active")
                .eq("organization_id", customerId)
                .order("role");

            if (memberships && memberships.length > 0) {
                const userIds = memberships.map(m => m.user_id);
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name, first_name, last_name, email")
                    .in("id", userIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
                setMembers(memberships.map(m => {
                    const p = profileMap.get(m.user_id);
                    return {
                        ...m,
                        display_name: p?.display_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || null,
                        email: p?.email || null,
                    };
                }));
            }

            // Load assigned machines
            const { data: assignments } = await supabase
                .from("machine_assignments")
                .select("id, machine_id, assigned_at, machines(name, internal_code, category, lifecycle_state)")
                .eq("customer_org_id", customerId)
                .eq("is_active", true)
                .order("assigned_at", { ascending: false });

            if (assignments) {
                setAssignedMachines(assignments.map((a: any) => ({
                    assignment_id: a.id,
                    machine_id: a.machine_id,
                    machine_name: a.machines?.name || "—",
                    internal_code: a.machines?.internal_code || "—",
                    category: a.machines?.category || null,
                    lifecycle_state: a.machines?.lifecycle_state || null,
                    assigned_at: a.assigned_at,
                })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // ═══════════ ASSIGN MACHINE ═══════════
    const openAssignPanel = async () => {
        if (!mfrOrgId || !customer) return;
        setShowAssignPanel(true);
        setMachineSearch("");

        // Load manufacturer's machines not yet assigned to this customer
        const assignedIds = assignedMachines.map(a => a.machine_id);

        let query = supabase
            .from("machines")
            .select("id, name, internal_code, category")
            .eq("organization_id", mfrOrgId)
            .order("name");

        const { data } = await query;
        if (data) {
            setAvailableMachines(data.filter(m => !assignedIds.includes(m.id)));
        }
    };

    const handleAssign = async (machineId: string) => {
        if (!customer) return;
        setAssigning(machineId);
        try {
            const ctx = await getUserContext();
            const { error } = await supabase.from("machine_assignments").insert({
                machine_id: machineId,
                customer_org_id: customer.id,
                assigned_by: ctx?.userId,
                is_active: true,
            });
            if (error) throw error;

            // Refresh
            const assigned = availableMachines.find(m => m.id === machineId);
            if (assigned) {
                setAssignedMachines(prev => [{
                    assignment_id: "", // will be refreshed
                    machine_id: machineId,
                    machine_name: assigned.name,
                    internal_code: assigned.internal_code,
                    category: assigned.category,
                    lifecycle_state: null,
                    assigned_at: new Date().toISOString(),
                }, ...prev]);
                setAvailableMachines(prev => prev.filter(m => m.id !== machineId));
            }
            toast({ title: "Macchina assegnata" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setAssigning(null);
        }
    };

    const handleUnassign = async (assignmentId: string, machineName: string) => {
        if (!confirm(`Rimuovere "${machineName}" da questo cliente?`)) return;
        try {
            const { error } = await supabase.from("machine_assignments")
                .update({ is_active: false })
                .eq("id", assignmentId);
            if (error) throw error;
            setAssignedMachines(prev => prev.filter(a => a.assignment_id !== assignmentId));
            toast({ title: "Macchina rimossa" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    // ═══════════ ADD USER ═══════════
    const handleAddUser = async () => {
        if (!customer || !newUserName || !newUserEmail || !newUserPassword) return;
        setAddingUser(true);
        try {
            const response = await fetch("/api/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                    organizationId: customer.id,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore");

            setMembers(prev => [...prev, {
                id: data.membershipId || "",
                user_id: data.userId || "",
                role: newUserRole,
                is_active: true,
                display_name: newUserName,
                email: newUserEmail,
            }]);
            setShowAddUser(false);
            setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNewUserRole("technician");
            toast({ title: "Utente creato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        } finally {
            setAddingUser(false);
        }
    };

    // ═══════════ EDIT CUSTOMER ═══════════
    const handleSaveEdit = async () => {
        if (!customer) return;
        setSaving(true);
        try {
            const { error } = await supabase.from("organizations").update({
                name: editForm.name.trim(),
                city: editForm.city.trim() || null,
                email: editForm.email.trim() || null,
                phone: editForm.phone.trim() || null,
            }).eq("id", customer.id);
            if (error) throw error;
            setCustomer({ ...customer, ...editForm, city: editForm.city || null, email: editForm.email || null, phone: editForm.phone || null });
            setEditing(false);
            toast({ title: "Aggiornato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const getLifecycleColor = (state: string | null) => {
        const map: Record<string, string> = {
            active: "bg-green-500/20 text-green-400 border-green-500/30",
            inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
            under_maintenance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            decommissioned: "bg-red-500/20 text-red-400 border-red-500/30",
        };
        return map[state || "active"] || map.active;
    };

    const getRoleBadge = (role: string) => {
        const map: Record<string, { label: string; color: string }> = {
            admin: { label: "Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" },
            supervisor: { label: "Supervisor", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
            technician: { label: "Tecnico", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
        };
        return map[role] || map.technician;
    };

    const filteredAvailable = machineSearch
        ? availableMachines.filter(m =>
            m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
            m.internal_code.toLowerCase().includes(machineSearch.toLowerCase())
        )
        : availableMachines;

    if (loading) return null;
    if (!customer) return null;

    return (
        <MainLayout>
            <SEO title={`${customer.name} - MACHINA`} />
            <div className="space-y-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
                            <p className="text-sm text-muted-foreground">{customer.slug}</p>
                        </div>
                        <Badge className={
                            customer.subscription_status === "trial" || customer.subscription_status === "active"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        }>
                            {customer.subscription_status || "—"}
                        </Badge>
                    </div>
                    <Button variant="outline" onClick={() => setEditing(!editing)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Modifica
                    </Button>
                </div>

                {/* Edit form */}
                {editing && (
                    <Card className="bg-card border-border">
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome *</Label>
                                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Città</Label>
                                    <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email</Label>
                                    <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Telefono</Label>
                                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSaveEdit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                                    <Save className="w-4 h-4 mr-2" />{saving ? "..." : "Salva"}
                                </Button>
                                <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-2" /> Annulla</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Info cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {customer.city && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                            <MapPin className="w-5 h-5 text-blue-400" />
                            <span className="text-foreground">{customer.city}</span>
                        </div>
                    )}
                    {customer.email && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                            <Mail className="w-5 h-5 text-green-400" />
                            <span className="text-foreground">{customer.email}</span>
                        </div>
                    )}
                    {customer.phone && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                            <Phone className="w-5 h-5 text-amber-400" />
                            <span className="text-foreground">{customer.phone}</span>
                        </div>
                    )}
                </div>

                {/* ═══════════ ASSIGNED MACHINES ═══════════ */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Package className="w-5 h-5 text-green-400" />
                                Macchine Assegnate ({assignedMachines.length})
                            </CardTitle>
                            <Button size="sm" className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={openAssignPanel}>
                                <Plus className="w-4 h-4 mr-2" /> Assegna Macchina
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {assignedMachines.map(m => (
                            <div key={m.assignment_id || m.machine_id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                        <Wrench className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <span className="text-foreground font-semibold">{m.machine_name}</span>
                                        <span className="text-muted-foreground text-sm ml-2">({m.internal_code})</span>
                                        {m.category && <span className="text-muted-foreground text-xs ml-2">• {m.category}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={`text-xs border ${getLifecycleColor(m.lifecycle_state)}`}>
                                        {m.lifecycle_state || "attivo"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(m.assigned_at).toLocaleDateString("it-IT")}
                                    </span>
                                    <button onClick={() => handleUnassign(m.assignment_id, m.machine_name)}
                                        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {assignedMachines.length === 0 && (
                            <p className="text-muted-foreground text-center py-6">Nessuna macchina assegnata. Clicca "Assegna Macchina" per iniziare.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Assign machine panel */}
                {showAssignPanel && (
                    <Card className="bg-card border-green-500/30">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-foreground">Seleziona macchine da assegnare</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setShowAssignPanel(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Cerca macchine..." value={machineSearch}
                                    onChange={(e) => setMachineSearch(e.target.value)}
                                    className="pl-10 bg-muted border-border text-foreground" />
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {filteredAvailable.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-green-500/30 transition-colors">
                                        <div>
                                            <span className="text-foreground font-medium">{m.name}</span>
                                            <span className="text-muted-foreground text-sm ml-2">({m.internal_code})</span>
                                            {m.category && <span className="text-muted-foreground text-xs ml-2">• {m.category}</span>}
                                        </div>
                                        <Button size="sm" disabled={assigning === m.id}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleAssign(m.id)}>
                                            {assigning === m.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <><Check className="w-4 h-4 mr-1" /> Assegna</>
                                            }
                                        </Button>
                                    </div>
                                ))}
                                {filteredAvailable.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">
                                        {availableMachines.length === 0 ? "Tutte le macchine sono già assegnate" : "Nessun risultato"}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ═══════════ USERS ═══════════ */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                Utenti ({members.length})
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={() => setShowAddUser(!showAddUser)}>
                                <UserPlus className="w-4 h-4 mr-2" /> Aggiungi Utente
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {members.map(m => {
                            const roleBadge = getRoleBadge(m.role);
                            return (
                                <div key={m.id || m.user_id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                                            <span className="text-blue-400 font-bold text-sm">
                                                {(m.display_name || m.email || "U").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-foreground font-semibold">{m.display_name || "—"}</span>
                                            {m.email && <p className="text-muted-foreground text-sm">{m.email}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-xs border ${roleBadge.color}`}>{roleBadge.label}</Badge>
                                        <Badge className={m.is_active
                                            ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                                            : "bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs"
                                        }>
                                            {m.is_active ? "Attivo" : "Inattivo"}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                        {members.length === 0 && (
                            <p className="text-muted-foreground text-center py-6">Nessun utente. Aggiungi il primo.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Add user form */}
                {showAddUser && (
                    <Card className="bg-card border-blue-500/30">
                        <CardHeader>
                            <CardTitle className="text-foreground">Nuovo Utente per {customer.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome *</Label>
                                    <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)}
                                        placeholder="Nome Cognome" className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email *</Label>
                                    <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
                                        placeholder="email@cliente.com" className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Password *</Label>
                                    <Input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="Min 8 caratteri" className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Ruolo</Label>
                                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground">
                                        <option value="supervisor">Supervisor</option>
                                        <option value="technician">Tecnico</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAddUser} disabled={addingUser || !newUserName || !newUserEmail || !newUserPassword}
                                    className="bg-blue-600 hover:bg-blue-700">
                                    {addingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                    {addingUser ? "Creazione..." : "Crea Utente"}
                                </Button>
                                <Button variant="outline" onClick={() => setShowAddUser(false)}>
                                    <X className="w-4 h-4 mr-2" /> Annulla
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
