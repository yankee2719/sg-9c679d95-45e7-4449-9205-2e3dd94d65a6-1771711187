import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Loader2, Building2, UserPlus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewCustomerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [orgType, setOrgType] = useState < string | null > (null);

    const [form, setForm] = useState({
        companyName: "",
        city: "",
        email: "",
        phone: "",
        supervisorName: "",
        supervisorEmail: "",
        supervisorPassword: "",
    });

    useEffect(() => {
        const check = async () => {
            const ctx = await getUserContext();
            if (!ctx || ctx.orgType !== "manufacturer") {
                router.push("/dashboard");
                return;
            }
            setOrgType(ctx.orgType);
        };
        check();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const ctx = await getUserContext();
            if (!ctx) throw new Error("Non autenticato");

            // Call API to create customer org + supervisor
            const response = await fetch("/api/customers/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: form.companyName.trim(),
                    city: form.city.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    supervisorName: form.supervisorName.trim(),
                    supervisorEmail: form.supervisorEmail.trim(),
                    supervisorPassword: form.supervisorPassword,
                    manufacturerOrgId: ctx.orgId,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore nella creazione");

            toast({ title: "Cliente creato", description: `"${form.companyName}" creato con account supervisor` });
            router.push("/customers");
        } catch (err: any) {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!orgType) return null;

    return (
        <MainLayout>
            <SEO title="Nuovo Cliente - MACHINA" />
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">Nuovo Cliente</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Company info */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-400" /> Dati Azienda Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome Azienda *</Label>
                                    <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                        required placeholder="es. Acme Manufacturing Srl"
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Città</Label>
                                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        placeholder="es. Milano" className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email Azienda</Label>
                                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="info@azienda.com" className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Telefono</Label>
                                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+39..." className="bg-muted border-border text-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supervisor account */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-green-400" /> Account Supervisor Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="bg-blue-500/10 border-blue-500/30">
                                <Info className="w-4 h-4 text-blue-400" />
                                <AlertDescription className="text-blue-300 text-sm">
                                    Il supervisor potrà accedere alla piattaforma, vedere le macchine assegnate, gestire manutenzioni e creare utenti tecnici.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome Supervisor *</Label>
                                    <Input value={form.supervisorName} onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
                                        required placeholder="Mario Rossi"
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email Supervisor *</Label>
                                    <Input type="email" value={form.supervisorEmail} onChange={(e) => setForm({ ...form, supervisorEmail: e.target.value })}
                                        required placeholder="mario.rossi@cliente.com"
                                        className="bg-muted border-border text-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Password Temporanea *</Label>
                                <Input type="text" value={form.supervisorPassword} onChange={(e) => setForm({ ...form, supervisorPassword: e.target.value })}
                                    required minLength={8} placeholder="Minimo 8 caratteri"
                                    className="bg-muted border-border text-foreground" />
                                <p className="text-xs text-muted-foreground">Comunica questa password al supervisor. Potrà cambiarla dopo il primo accesso.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button type="submit" disabled={loading} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                            {loading
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione...</>
                                : <><Save className="mr-2 h-4 w-4" /> Crea Cliente</>
                            }
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.back()}>Annulla</Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
