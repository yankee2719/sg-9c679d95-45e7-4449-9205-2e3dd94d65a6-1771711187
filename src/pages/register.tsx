import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wrench, Loader2, ArrowLeft, Check, Building2, User, Shield, Sparkles } from "lucide-react";
import { SEO } from "@/components/SEO";

const pricingPlans = {
    starter: {
        name: "Starter",
        monthlyPrice: 49,
        yearlyPrice: 490,
        maxUsers: 6,
        maxEquipment: 100,
        features: ["1 Admin + 5 utenti", "100 attrezzature", "Checklist illimitate"],
    },
    professional: {
        name: "Professional",
        monthlyPrice: 99,
        yearlyPrice: 990,
        maxUsers: 19,
        maxEquipment: 500,
        features: ["1 Admin + 3 Supervisor + 15 utenti", "500 attrezzature", "KPI avanzati"],
    },
    enterprise: {
        name: "Enterprise",
        monthlyPrice: 199,
        yearlyPrice: 1990,
        maxUsers: -1,
        maxEquipment: -1,
        features: ["Utenti illimitati", "Attrezzature illimitate", "Account manager dedicato"],
    },
};

type PlanType = keyof typeof pricingPlans;

const industries = [
    { value: "manufacturing", label: "Manifatturiero" },
    { value: "food", label: "Alimentare (HACCP)" },
    { value: "pharma", label: "Farmaceutico" },
    { value: "automotive", label: "Automotive" },
    { value: "facility", label: "Facility Management" },
    { value: "energy", label: "Energia" },
    { value: "logistics", label: "Logistica" },
    { value: "other", label: "Altro" },
];

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedPlan, setSelectedPlan] = useState < PlanType > ("professional");
    const [billingPeriod, setBillingPeriod] = useState < "monthly" | "yearly" > ("yearly");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const { plan, period } = router.query;
        if (plan && typeof plan === "string" && plan in pricingPlans) {
            setSelectedPlan(plan as PlanType);
        }
        if (period === "monthly" || period === "yearly") {
            setBillingPeriod(period);
        }
    }, [router.query]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (password !== confirmPassword) {
            setError("Le password non corrispondono");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("La password deve contenere almeno 8 caratteri");
            setLoading(false);
            return;
        }

        try {
            const plan = pricingPlans[selectedPlan];

            const { data: tenantData, error: tenantError } = await supabase
                .from("tenants")
                .insert({
                    name: companyName,
                    max_users: plan.maxUsers === -1 ? 9999 : plan.maxUsers,
                    subscription_status: "trialing",
                })
                .select()
                .single();

            if (tenantError) throw tenantError;

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });

            if (signUpError) throw signUpError;

            if (authData.user) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: fullName,
                        role: "admin",
                        tenant_id: tenantData.id,
                    })
                    .eq("id", authData.user.id);

                if (profileError) throw profileError;

                setSuccess(true);
                setTimeout(() => { router.push("/dashboard"); }, 2000);
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "Errore durante la registrazione");
            setLoading(false);
        }
    };
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <Card className="w-full max-w-md bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                                <Check className="h-8 w-8 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Account creato con successo!</h3>
                                <p className="text-slate-400 mt-2">Il tuo trial di 14 giorni è iniziato. Verrai reindirizzato alla dashboard...</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                <Sparkles className="w-4 h-4" />
                                <span>Nessuna carta di credito richiesta</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentPlan = pricingPlans[selectedPlan];
    const price = billingPeriod === "yearly" ? currentPlan.yearlyPrice : currentPlan.monthlyPrice;

    return (
        <>
            <SEO title="Inizia la Prova Gratuita - MaintOps" description="Crea il tuo account e inizia 14 giorni di prova gratuita." />

            <div className="min-h-screen bg-slate-900 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-white">MaintOps</span>
                        </Link>
                        <h1 className="text-3xl font-bold text-white mb-2">Inizia la tua prova gratuita</h1>
                        <p className="text-slate-400">14 giorni gratis • Nessuna carta di credito</p>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-3">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                <Building2 className="w-4 h-4 text-white" />
                                            </div>
                                            <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
                                        </div>
                                        <div className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                <User className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <CardTitle className="text-white">{step === 1 ? "Informazioni Azienda" : "Crea il tuo Account"}</CardTitle>
                                    <CardDescription className="text-slate-400">{step === 1 ? "Inserisci i dati della tua azienda" : "Crea le credenziali di accesso amministratore"}</CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister} className="space-y-4">
                                        {error && (
                                            <Alert className="bg-red-500/10 border-red-500/30">
                                                <AlertDescription className="text-red-400">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        {step === 1 ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="companyName" className="text-white">Nome Azienda *</Label>
                                                    <Input id="companyName" type="text" placeholder="Acme Srl" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="industry" className="text-white">Settore</Label>
                                                    <Select value={industry} onValueChange={setIndustry}>
                                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Seleziona il settore" /></SelectTrigger>
                                                        <SelectContent className="bg-slate-800 border-slate-600">
                                                            {industries.map((ind) => (<SelectItem key={ind.value} value={ind.value} className="text-white hover:bg-slate-700 focus:bg-slate-700">{ind.label}</SelectItem>))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-white">Piano Selezionato</Label>
                                                    <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanType)}>
                                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-800 border-slate-600">
                                                            {Object.entries(pricingPlans).map(([key, plan]) => (<SelectItem key={key} value={key} className="text-white hover:bg-slate-700 focus:bg-slate-700">{plan.name} - €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}/{billingPeriod === "yearly" ? "anno" : "mese"}</SelectItem>))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!companyName}>Continua</Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="fullName" className="text-white">Nome e Cognome *</Label>
                                                    <Input id="fullName" type="text" placeholder="Mario Rossi" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email" className="text-white">Email Aziendale *</Label>
                                                    <Input id="email" type="email" placeholder="mario.rossi@azienda.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="password" className="text-white">Password *</Label>
                                                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                                                    <p className="text-xs text-slate-500">Minimo 8 caratteri</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirmPassword" className="text-white">Conferma Password *</Label>
                                                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                                                </div>
                                                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                                    <Shield className="w-5 h-5 text-blue-400" />
                                                    <span className="text-sm text-blue-300">Sarai registrato come <strong>Amministratore</strong> del workspace</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Indietro</Button>
                                                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</> : "Crea Account"}</Button>
                                                </div>
                                            </>
                                        )}
                                        <div className="text-center pt-4 border-t border-slate-700">
                                            <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">Hai già un account? Accedi</Link>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2">
                            <Card className="bg-slate-800/50 border-slate-700 sticky top-8">
                                <CardHeader><CardTitle className="text-white text-lg">Riepilogo</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-white">{currentPlan.name}</span>
                                            {selectedPlan === "professional" && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Più Popolare</Badge>}
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">€{price}<span className="text-sm font-normal text-slate-400">/{billingPeriod === "yearly" ? "anno" : "mese"}</span></div>
                                    </div>
                                    <div className="space-y-2">
                                        {currentPlan.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-slate-300"><Check className="w-4 h-4 text-green-400" /><span>{feature}</span></div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-400 font-medium mb-1"><Sparkles className="w-4 h-4" />14 giorni gratis</div>
                                        <p className="text-xs text-slate-400">Prova tutte le funzionalità senza impegno.</p>
                                    </div>
                                    {companyName && (
                                        <div className="pt-4 border-t border-slate-700">
                                            <p className="text-xs text-slate-500 mb-1">Azienda</p>
                                            <p className="text-white font-medium">{companyName}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}