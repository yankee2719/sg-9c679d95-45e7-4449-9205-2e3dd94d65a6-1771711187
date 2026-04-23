import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Factory,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Plus,
    Save,
    Shield,
    Trash2,
    UserCog,
    Users,
    Wrench,
} from "lucide-react";
import {
    createCustomerPlant,
    getCustomer,
    listCustomerPlants,
    updateCustomer,
    type CustomerPlantRow,
} from "@/services/customerApi";
import { apiFetch } from "@/services/apiClient";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CustomerRow {
    id: string;
    name: string | null;
    slug: string | null;
    type: string | null;
    manufacturer_org_id: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
    created_at: string | null;
}

interface CustomerUserRow {
    membership_id: string;
    user_id: string;
    role: "supervisor" | "technician" | string | null;
    is_active: boolean;
    created_at: string | null;
    accepted_at: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

interface AssignmentRow {
    id: string;
    machine_id: string;
    assigned_at: string | null;
}

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
        return value;
    }
}

function safeText(t: (key: string) => string, key: string, fallback: string) {
    const value = t(key);
    return !value || value === key ? fallback : value;
}

function KpiCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number | string }) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-3xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function CustomerDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership, organization } = useAuth();
    const { t, language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [creatingPlant, setCreatingPlant] = useState(false);
    const [plantsLoading, setPlantsLoading] = useState(false);
    const [updatingMembershipId, setUpdatingMembershipId] = useState < string | null > (null);
    const [customer, setCustomer] = useState < CustomerRow | null > (null);
    const [customerUsers, setCustomerUsers] = useState < CustomerUserRow[] > ([]);
    const [assignments, setAssignments] = useState < AssignmentRow[] > ([]);
    const [customerPlants, setCustomerPlants] = useState < CustomerPlantRow[] > ([]);

    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState < "supervisor" | "technician" > ("technician");
    const [newPlantName, setNewPlantName] = useState("");
    const [newPlantCode, setNewPlantCode] = useState("");

    const userRole = membership?.role ?? "technician";
    const orgType = organization?.type ?? null;
    const canEdit = ["admin", "supervisor"].includes(userRole);
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    const activeUsersCount = useMemo(() => customerUsers.filter((row) => row.is_active).length, [customerUsers]);
    const techniciansCount = useMemo(
        () => customerUsers.filter((row) => row.is_active && row.role === "technician").length,
        [customerUsers],
    );

    const loadUsersAndAssignments = async (customerId: string) => {
        setUsersLoading(true);
        try {
            const [usersData, assignmentsData] = await Promise.all([
                apiFetch < CustomerUserRow[] > (`/api/customers/${customerId}/users`),
                apiFetch < AssignmentRow[] > (`/api/customers/${customerId}/assignments`).catch(() => []),
            ]);
            setCustomerUsers(Array.isArray(usersData) ? usersData : []);
            setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        } finally {
            setUsersLoading(false);
        }
    };

    const loadCustomerPlants = async (customerId: string) => {
        setPlantsLoading(true);
        try {
            const data = await listCustomerPlants(customerId);
            setCustomerPlants(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Customer plants load error:", error);
            setCustomerPlants([]);
        } finally {
            setPlantsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!resolvedId || authLoading) return;

            try {
                const customerData = await getCustomer(resolvedId);
                if (!active) return;
                setCustomer(customerData);
                await Promise.all([loadUsersAndAssignments(resolvedId), loadCustomerPlants(resolvedId)]);
            } catch (error) {
                console.error(error);
                void router.replace("/customers");
            } finally {
                if (active) setLoading(false);
            }
        };

        if (orgType === "manufacturer") {
            void load();
        } else if (!authLoading) {
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, orgType, router]);

    const handleSave = async () => {
        if (!resolvedId || !customer) return;
        setSaving(true);
        try {
            const updated = await updateCustomer(resolvedId, {
                name: customer.name,
                slug: customer.slug,
                city: customer.city,
                country: customer.country,
                email: customer.email,
                phone: customer.phone,
                subscription_status: customer.subscription_status,
            });
            setCustomer(updated);
            toast({ title: safeText(t, "customers.updated", "Cliente aggiornato"), description: updated.name || "Cliente" });
        } catch (error: any) {
            console.error(error);
            toast({
                title: safeText(t, "common.error", "Errore"),
                description: error?.message || safeText(t, "customers.errorUpdate", "Errore aggiornamento cliente"),
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateUser = async () => {
        if (!resolvedId) return;
        if (!newUserEmail.trim() || !newUserPassword.trim()) {
            toast({ title: safeText(t, "common.error", "Errore"), description: "Email e password sono obbligatorie.", variant: "destructive" });
            return;
        }

        setCreatingUser(true);
        try {
            await apiFetch(`/api/customers/${resolvedId}/users`, {
                method: "POST",
                body: JSON.stringify({
                    email: newUserEmail.trim().toLowerCase(),
                    password: newUserPassword,
                    full_name: newUserName.trim() || null,
                    role: newUserRole,
                }),
            });
            setNewUserName("");
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserRole("technician");
            await loadUsersAndAssignments(resolvedId);
            toast({ title: "Utente cliente creato", description: "Il nuovo utente è stato aggiunto al tenant cliente." });
        } catch (error: any) {
            console.error(error);
            toast({ title: safeText(t, "common.error", "Errore"), description: error?.message || "Errore creazione utente cliente", variant: "destructive" });
        } finally {
            setCreatingUser(false);
        }
    };

    const handleCreatePlant = async () => {
        if (!resolvedId) return;
        if (!newPlantName.trim()) {
            toast({ title: "Errore", description: "Il nome dello stabilimento è obbligatorio.", variant: "destructive" });
            return;
        }

        setCreatingPlant(true);
        try {
            await createCustomerPlant(resolvedId, { name: newPlantName.trim(), code: newPlantCode.trim() || null });
            setNewPlantName("");
            setNewPlantCode("");
            await loadCustomerPlants(resolvedId);
            toast({ title: "Stabilimento creato", description: "Ora potrai selezionarlo in assegnazione macchina e nel contesto cliente." });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Errore", description: error?.message || "Errore creazione stabilimento cliente", variant: "destructive" });
        } finally {
            setCreatingPlant(false);
        }
    };

    const handleToggleUser = async (row: CustomerUserRow) => {
        if (!resolvedId) return;
        setUpdatingMembershipId(row.membership_id);
        try {
            await apiFetch(`/api/customers/${resolvedId}/users/${row.membership_id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: !row.is_active }),
            });
            await loadUsersAndAssignments(resolvedId);
            toast({ title: row.is_active ? "Utente disattivato" : "Utente riattivato", description: row.email || row.display_name || "Utente cliente" });
        } catch (error: any) {
            console.error(error);
            toast({ title: safeText(t, "common.error", "Errore"), description: error?.message || "Errore aggiornamento utente cliente", variant: "destructive" });
        } finally {
            setUpdatingMembershipId(null);
        }
    };

    const handleRoleChange = async (row: CustomerUserRow, role: "supervisor" | "technician") => {
        if (!resolvedId || row.role === role) return;
        setUpdatingMembershipId(row.membership_id);
        try {
            await apiFetch(`/api/customers/${resolvedId}/users/${row.membership_id}`, { method: "PATCH", body: JSON.stringify({ role }) });
            await loadUsersAndAssignments(resolvedId);
            toast({ title: "Ruolo aggiornato", description: row.email || row.display_name || "Utente cliente" });
        } catch (error: any) {
            console.error(error);
            toast({ title: safeText(t, "common.error", "Errore"), description: error?.message || "Errore aggiornamento ruolo", variant: "destructive" });
        } finally {
            setUpdatingMembershipId(null);
        }
    };

    const handleDeleteUser = async (row: CustomerUserRow) => {
        if (!resolvedId) return;
        const confirmed = window.confirm(`Rimuovere ${row.email || row.display_name || "questo utente"} dal cliente?`);
        if (!confirmed) return;

        setUpdatingMembershipId(row.membership_id);
        try {
            await apiFetch(`/api/customers/${resolvedId}/users/${row.membership_id}`, { method: "DELETE" });
            await loadUsersAndAssignments(resolvedId);
            toast({ title: "Utente rimosso", description: row.email || row.display_name || "Utente cliente" });
        } catch (error: any) {
            console.error(error);
            toast({ title: safeText(t, "common.error", "Errore"), description: error?.message || "Errore rimozione utente cliente", variant: "destructive" });
        } finally {
            setUpdatingMembershipId(null);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <div className="p-8 text-sm text-muted-foreground">Caricamento cliente...</div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (orgType !== "manufacturer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <div className="p-8 text-sm text-muted-foreground">Questa pagina è disponibile solo per il costruttore.</div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!customer) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <div className="p-8 text-sm text-muted-foreground">Cliente non trovato.</div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${customer.name || "Cliente"} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/customers">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">{customer.name || "Cliente"}</h1>
                                <p className="text-sm text-muted-foreground">
                                    Tenant cliente collegato al costruttore. Da qui gestisci anagrafica, utenti e stabilimenti del cliente finale.
                                </p>
                            </div>
                        </div>
                        {canEdit && (
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {saving ? "Salvataggio..." : "Salva cliente"}
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Users className="h-5 w-5" />} title="Utenti attivi" value={activeUsersCount} />
                        <KpiCard icon={<Shield className="h-5 w-5" />} title="Supervisor / Technician" value={techniciansCount} />
                        <KpiCard icon={<Wrench className="h-5 w-5" />} title="Macchine assegnate" value={assignments.length} />
                        <KpiCard icon={<MapPin className="h-5 w-5" />} title="Stabilimenti cliente" value={customerPlants.length} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Dati cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {canEdit ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="Nome" value={customer.name} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, name: value } : prev))} />
                                            <Field label="Slug" value={customer.slug} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, slug: value } : prev))} />
                                            <Field label="Città" value={customer.city} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, city: value } : prev))} />
                                            <Field label="Paese" value={customer.country} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, country: value } : prev))} />
                                            <Field label="Email" value={customer.email} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, email: value } : prev))} />
                                            <Field label="Telefono" value={customer.phone} onChange={(value) => setCustomer((prev) => (prev ? { ...prev, phone: value } : prev))} />
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <InfoRow label="Nome" value={customer.name} />
                                            <InfoRow label="Slug" value={customer.slug} />
                                            <InfoRow label="Città" value={customer.city} />
                                            <InfoRow label="Paese" value={customer.country} />
                                            <InfoRow label="Email" value={customer.email} />
                                            <InfoRow label="Telefono" value={customer.phone} />
                                            <InfoRow label="Creato il" value={formatDate(customer.created_at, language)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Stabilimenti cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                        Qui inserisci gli <strong className="text-foreground">stabilimenti del cliente finale</strong>. Dopo la creazione potrai selezionarli da <strong className="text-foreground">Assegnazioni macchina</strong>. L&apos;area / linea invece resta un dato della macchina.
                                    </div>

                                    {canEdit && (
                                        <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[1.4fr,1fr,auto]">
                                            <div className="space-y-2">
                                                <Label>Nome stabilimento *</Label>
                                                <Input value={newPlantName} onChange={(e) => setNewPlantName(e.target.value)} placeholder="Es. Stabilimento Verona" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Codice</Label>
                                                <Input value={newPlantCode} onChange={(e) => setNewPlantCode(e.target.value)} placeholder="Es. PLT-VR-01" />
                                            </div>
                                            <div className="flex items-end">
                                                <Button onClick={handleCreatePlant} disabled={creatingPlant} className="w-full md:w-auto">
                                                    {creatingPlant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                    {creatingPlant ? "Creazione..." : "Crea stabilimento"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {plantsLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento stabilimenti cliente...
                                        </div>
                                    ) : customerPlants.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                                            Nessuno stabilimento cliente configurato. Creane almeno uno qui, poi potrai collegarlo all&apos;assegnazione macchina.
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {customerPlants.map((plant) => (
                                                <div key={plant.id} className="rounded-2xl border border-border p-4">
                                                    <div className="font-semibold text-foreground">{plant.name || "Stabilimento"}</div>
                                                    <div className="mt-1 text-sm text-muted-foreground">Codice: {plant.code || "—"}</div>
                                                    <div className="mt-1 text-xs text-muted-foreground">Creato: {formatDate(plant.created_at, language)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Azioni rapide
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
                                        Prima crea almeno uno <strong className="text-foreground">stabilimento cliente</strong> qui sopra. Poi vai in <strong className="text-foreground">Assegnazioni</strong> per collegare macchina, cliente e stabilimento.
                                    </div>
                                    <Link href="/customers">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Building2 className="mr-2 h-4 w-4" />
                                            Clienti
                                        </Button>
                                    </Link>
                                    <Link href="/assignments">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Wrench className="mr-2 h-4 w-4" />
                                            Assegnazioni
                                        </Button>
                                    </Link>
                                    <Link href="/equipment">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Factory className="mr-2 h-4 w-4" />
                                            Macchine
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Utenti cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {canEdit && (
                                        <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-2 xl:grid-cols-1">
                                            <div className="space-y-2">
                                                <Label>Nome visualizzato</Label>
                                                <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Es. Mario Rossi" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="utente@cliente.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Password iniziale</Label>
                                                <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Password temporanea" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Ruolo</Label>
                                                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "supervisor" | "technician")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                                    <option value="technician">technician</option>
                                                    <option value="supervisor">supervisor</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Button onClick={handleCreateUser} disabled={creatingUser}>
                                                    {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                    {creatingUser ? "Creazione..." : "Crea utente cliente"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {usersLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento utenti cliente...
                                        </div>
                                    ) : customerUsers.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                                            Nessun utente cliente configurato.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {customerUsers.map((row) => {
                                                const fullName = row.display_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || "Utente cliente";
                                                const busy = updatingMembershipId === row.membership_id;
                                                return (
                                                    <div key={row.membership_id} className="rounded-2xl border border-border p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <div className="font-semibold text-foreground">{fullName}</div>
                                                                <div className="text-sm text-muted-foreground">{row.email || "—"}</div>
                                                                <div className="text-xs text-muted-foreground">Creato: {formatDate(row.created_at, language)}</div>
                                                            </div>
                                                            <Badge variant={row.is_active ? "default" : "outline"}>{row.is_active ? "attivo" : "disattivo"}</Badge>
                                                        </div>

                                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label>Ruolo</Label>
                                                                <select value={row.role || "technician"} onChange={(e) => handleRoleChange(row, e.target.value as "supervisor" | "technician")} disabled={busy} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                                                    <option value="technician">technician</option>
                                                                    <option value="supervisor">supervisor</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Accesso</Label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Button variant="outline" disabled={busy} onClick={() => handleToggleUser(row)}>
                                                                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                        {row.is_active ? "Disattiva" : "Riattiva"}
                                                                    </Button>
                                                                    <Button variant="outline" disabled={busy} onClick={() => handleDeleteUser(row)}>
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Rimuovi
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

function Field({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (value: string) => void }) {
    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}
