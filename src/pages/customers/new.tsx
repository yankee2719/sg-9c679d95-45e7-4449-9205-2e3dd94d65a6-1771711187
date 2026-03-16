import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Save,
    Loader2,
    Building2,
    UserPlus,
    Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NewCustomerForm {
    companyName: string;
    city: string;
    email: string;
    phone: string;
    supervisorName: string;
    supervisorEmail: string;
    supervisorPassword: string;
}

const initialForm: NewCustomerForm = {
    companyName: "",
    city: "",
    email: "",
    phone: "",
    supervisorName: "",
    supervisorEmail: "",
    supervisorPassword: "",
};

export default function NewCustomerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, isAuthenticated, organization, session } = useAuth();

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState < NewCustomerForm > (initialForm);

    const orgType = organization?.type ?? null;

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            void router.replace("/login");
            return;
        }

        if (orgType !== "manufacturer") {
            void router.replace("/dashboard");
        }
    }, [authLoading, isAuthenticated, orgType, router]);

    const updateField = (field: keyof NewCustomerForm, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            let accessToken = session?.access_token ?? null;

            if (!accessToken) {
                const {
                    data: { session: freshSession },
                } = await supabase.auth.getSession();

                accessToken = freshSession?.access_token ?? null;
            }

            if (!accessToken) {
                throw new Error("Sessione scaduta. Effettua di nuovo il login.");
            }

            const response = await fetch("/api/customers/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    companyName: form.companyName.trim(),
                    city: form.city.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    supervisorName: form.supervisorName.trim(),
                    supervisorEmail: form.supervisorEmail.trim(),
                    supervisorPassword: form.supervisorPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore nella creazione del cliente");
            }

            toast({
                title: "Cliente creato",
                description: `"${form.companyName}" creato con account supervisor`,
            });

            void router.push("/customers");
        } catch (err: any) {
            toast({
                title: "Errore",
                description: err?.message || "Operazione non riuscita",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;
    if (!isAuthenticated) return null;
    if (orgType !== "manufacturer") return null;

    return (
        <MainLayout>
            <SEO title="Nuovo Cliente - MACHINA" />
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Indietro
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">Nuovo Cliente</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-400" />
                                Dati Azienda Cliente
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome Azienda *</Label>
                                    <Input
                                        value={form.companyName}
                                        onChange={(e) => updateField("companyName", e.target.value)}
                                        required
                                        placeholder="es. Acme Manufacturing Srl"
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Città</Label>
                                    <Input
                                        value={form.city}
                                        onChange={(e) => updateField("city", e.target.value)}
                                        placeholder="es. Milano"
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Email Azienda</Label>
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => updateField("email", e.target.value)}
                                        placeholder="info@azienda.com"
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Telefono</Label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => updateField("phone", e.target.value)}
                                        placeholder="+39..."
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-green-400" />
                                Account Supervisor Cliente
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Alert className="bg-blue-100 dark:bg-blue-500/10 border-blue-500/30">
                                <Info className="w-4 h-4 text-blue-400" />
                                <AlertDescription className="text-blue-300 text-sm">
                                    Il supervisor potrà accedere alla piattaforma, vedere le macchine
                                    assegnate, gestire manutenzioni e creare utenti tecnici.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome Supervisor *</Label>
                                    <Input
                                        value={form.supervisorName}
                                        onChange={(e) => updateField("supervisorName", e.target.value)}
                                        required
                                        placeholder="Mario Rossi"
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Email Supervisor *</Label>
                                    <Input
                                        type="email"
                                        value={form.supervisorEmail}
                                        onChange={(e) => updateField("supervisorEmail", e.target.value)}
                                        required
                                        placeholder="mario.rossi@cliente.com"
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground">Password Temporanea *</Label>
                                <Input
                                    type="text"
                                    value={form.supervisorPassword}
                                    onChange={(e) => updateField("supervisorPassword", e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="Minimo 8 caratteri"
                                    className="bg-muted border-border text-foreground"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Comunica questa password al supervisor. Potrà cambiarla dopo il
                                    primo accesso.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Crea Cliente
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Annulla
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}