import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Building2,
    Loader2,
    Save,
    Shield,
    UserPlus,
} from "lucide-react";

export default function NewCustomerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { organization, membership, session, loading: authLoading } = useAuth();

    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("IT");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [createPrimaryUser, setCreatePrimaryUser] = useState(true);
    const [primaryUserName, setPrimaryUserName] = useState("");
    const [primaryUserEmail, setPrimaryUserEmail] = useState("");
    const [primaryUserPassword, setPrimaryUserPassword] = useState("");
    const [primaryUserRole, setPrimaryUserRole] = useState("admin");

    const orgType = organization?.type ?? null;
    const userRole = membership?.role ?? "technician";
    const canCreate = userRole === "owner" || userRole === "admin";

    const pageBlocked = useMemo(() => {
        return authLoading || orgType !== "manufacturer" || !canCreate;
    }, [authLoading, orgType, canCreate]);

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (await supabase.auth.getSession()).data.session?.access_token;

        if (!accessToken) throw new Error("Sessione scaduta");
        return accessToken;
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci il nome del cliente.",
                variant: "destructive",
            });
            return;
        }

        if (createPrimaryUser) {
            if (!primaryUserName.trim() || !primaryUserEmail.trim() || !primaryUserPassword.trim()) {
                toast({
                    title: "Errore",
                    description: "Compila i dati dell'utente principale.",
                    variant: "destructive",
                });
                return;
            }
        }

        setSaving(true);

        try {
            const accessToken = await getAccessToken();

            const response = await fetch("/api/customers/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    city: city.trim() || null,
                    country: country.trim() || "IT",
                    email: email.trim().toLowerCase() || null,
                    phone: phone.trim() || null,
                    create_primary_user: createPrimaryUser,
                    primary_user_name: createPrimaryUser ? primaryUserName.trim() : null,
                    primary_user_email: createPrimaryUser
                        ? primaryUserEmail.trim().toLowerCase()
                        : null,
                    primary_user_password: createPrimaryUser ? primaryUserPassword : null,
                    primary_user_role: createPrimaryUser ? primaryUserRole : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore creazione cliente");
            }

            toast({
                title: "Cliente creato",
                description: name.trim(),
            });

            void router.push(`/customers/${data.customer_id}`);
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore creazione cliente",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (pageBlocked) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Nuovo cliente - MACHINA" />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Questa pagina è disponibile solo per owner/admin lato costruttore.
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Nuovo cliente - MACHINA" />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href="/customers">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Nuovo cliente</h1>
                            <p className="text-sm text-muted-foreground">
                                Crea una nuova organizzazione cliente collegata al costruttore attivo.
                            </p>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Anagrafica cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Nome cliente *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Es. Rimeco Srl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Città</Label>
                                <Input
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="Es. Milano"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Input
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    placeholder="IT"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email azienda</Label>
                                <Input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="info@cliente.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Telefono</Label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+39 ..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                Utente principale cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <label className="flex items-center gap-3 rounded-xl border border-border p-4">
                                <input
                                    type="checkbox"
                                    checked={createPrimaryUser}
                                    onChange={(e) => setCreatePrimaryUser(e.target.checked)}
                                />
                                <div>
                                    <div className="font-medium">Crea utente principale subito</div>
                                    <div className="text-sm text-muted-foreground">
                                        Se attivo, viene creato anche il primo utente del cliente.
                                    </div>
                                </div>
                            </label>

                            {createPrimaryUser && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Nome completo *</Label>
                                        <Input
                                            value={primaryUserName}
                                            onChange={(e) => setPrimaryUserName(e.target.value)}
                                            placeholder="Es. Mario Rossi"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email *</Label>
                                        <Input
                                            value={primaryUserEmail}
                                            onChange={(e) => setPrimaryUserEmail(e.target.value)}
                                            placeholder="m.rossi@cliente.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Password *</Label>
                                        <Input
                                            type="password"
                                            value={primaryUserPassword}
                                            onChange={(e) => setPrimaryUserPassword(e.target.value)}
                                            placeholder="Password iniziale"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Ruolo iniziale</Label>
                                        <select
                                            value={primaryUserRole}
                                            onChange={(e) => setPrimaryUserRole(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="admin">admin</option>
                                            <option value="supervisor">supervisor</option>
                                            <option value="technician">technician</option>
                                            <option value="viewer">viewer</option>
                                        </select>
                                    </div>

                                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                        L'utente creato avrà come organizzazione di default il nuovo cliente.
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Controllo finale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div>Costruttore attivo: {organization?.name || "—"}</div>
                            <div>Tipo organizzazione attiva: {organization?.type || "—"}</div>
                            <div>Ruolo attivo: {membership?.role || "—"}</div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href="/customers">
                            <Button variant="outline">Annulla</Button>
                        </Link>

                        <Button onClick={handleCreate} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {saving ? "Creazione..." : "Crea cliente"}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}