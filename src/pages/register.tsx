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
import { Wrench, Loader2, ArrowLeft, Check, Building2, User, Shield, Sparkles, Factory, Settings } from "lucide-react";
import { SEO } from "@/components/SEO";

const pricingPlans = {
    starter: {
        name: "Starter",
        monthlyPrice: 49, yearlyPrice: 490, maxUsers: 6, maxEquipment: 100,
        features: ["1 Admin + 5 utenti", "100 macchine", "Checklist illimitate"],
    },
    professional: {
        name: "Professional",
        monthlyPrice: 99, yearlyPrice: 990, maxUsers: 19, maxEquipment: 500,
        features: ["1 Admin + 3 Supervisor + 15 utenti", "500 macchine", "KPI avanzati"],
    },
    enterprise: {
        name: "Enterprise",
        monthlyPrice: 199, yearlyPrice: 1990, maxUsers: -1, maxEquipment: -1,
        features: ["Utenti illimitati", "Macchine illimitate", "Account manager dedicato"],
    },
};

type PlanType = keyof typeof pricingPlans;
type OrgType = "manufacturer" | "customer";

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
    const [step, setStep] = useState(0);
    const [orgType, setOrgType] = useState < OrgType | null > (null);
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
        const { plan, period, type } = router.query;
        if (plan && typeof plan === "string" && plan in pricingPlans) setSelectedPlan(plan as PlanType);
        if (period === "monthly" || period === "yearly") setBillingPeriod(period);
        if (type === "manufacturer" || type === "customer") { setOrgType(type); setStep(1); }
    }, [router.query]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        if (password !== confirmPassword) { setError("Le password non corrispondono"); setLoading(false); return; }
        if (password.length < 8) { setError("La password deve contenere almeno 8 caratteri"); setLoading(false); return; }
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName, fullName, email, password, plan: selectedPlan, orgType: orgType || "customer" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante la registrazione");
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;
            setSuccess(true);
            setTimeout(() => { router.push("/dashboard"); }, 2000);
        } catch (err: any) { setError(err.message || "Errore"); setLoading(false); }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Account creato con successo!</h3>
                                <p className="text-muted-foreground mt-2">
                                    {orgType === "manufacturer" ? "Il tuo account costruttore è pronto." : "Il tuo trial di 14 giorni è iniziato."}
                                    {" "}Verrai reindirizzato alla dashboard...
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Sparkles className="w-4 h-4" /><span>Nessuna carta di credito richiesta</span>
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
            <SEO title="Registrazione - MACHINA" description="Crea il tuo account e inizia a usare MACHINA." />
            <div className="min-h-screen bg-background py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#e55a2b] rounded-xl flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-foreground">MACHINA</span>
                        </Link>
                        {step === 0 && (<><h1 className="text-3xl font-bold text-foreground mb-2">Come vuoi usare MACHINA?</h1><p className="text-muted-foreground">Scegli il profilo più adatto alla tua attività</p></>)}
                        {step === 1 && (<><h1 className="text-3xl font-bold text-foreground mb-2">Inizia la tua prova gratuita</h1><p className="text-muted-foreground">14 giorni gratis • Nessuna carta di credito</p></>)}
                        {step === 2 && (<><h1 className="text-3xl font-bold text-foreground mb-2">Crea il tuo account</h1><p className="text-muted-foreground">Ultimo step — credenziali di accesso</p></>)}
                    </div>

                    {/* Step 0: Choose org type */}
                    {step === 0 && (
                        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
                            <Card
                                className={`cursor-pointer transition-all hover:shadow-lg ${orgType === "manufacturer" ? "border-purple-500 ring-2 ring-purple-500/20 shadow-lg" : "hover:border-purple-300 dark:hover:border-purple-500/50"}`}
                                onClick={() => setOrgType("manufacturer")}
                            >
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center">
                                        <Factory className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">Costruttore</h3>
                                        <p className="text-muted-foreground text-sm">Produci macchine e vuoi fornire ai tuoi clienti documentazione, manuali e supporto alla manutenzione.</p>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Feature text="Catalogo macchine prodotte" />
                                        <Feature text="Condivisione documentazione con clienti" />
                                        <Feature text="Creazione account clienti" />
                                        <Feature text="Monitoraggio manutenzioni clienti" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card
                                className={`cursor-pointer transition-all hover:shadow-lg ${orgType === "customer" ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg" : "hover:border-blue-300 dark:hover:border-blue-500/50"}`}
                                onClick={() => setOrgType("customer")}
                            >
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                        <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">Utilizzatore Finale</h3>
                                        <p className="text-muted-foreground text-sm">Hai macchine nei tuoi stabilimenti e vuoi gestire manutenzione, checklist e documentazione.</p>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Feature text="Gestione stabilimenti e linee" />
                                        <Feature text="Piani di manutenzione programmata" />
                                        <Feature text="Checklist e ordini di lavoro" />
                                        <Feature text="QR Code per accesso rapido" />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="md:col-span-2 flex justify-center">
                                <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white px-8" disabled={!orgType} onClick={() => setStep(1)}>Continua</Button>
                            </div>
                            <div className="md:col-span-2 text-center">
                                <Link href="/login" className="text-sm text-primary hover:underline">Hai già un account? Accedi</Link>
                            </div>
                        </div>
                    )}

                    {/* Steps 1 & 2 */}
                    {step >= 1 && (
                        <div className="grid lg:grid-cols-5 gap-8">
                            <div className="lg:col-span-3">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white">
                                                    {orgType === "manufacturer" ? <Factory className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                                </div>
                                                <div className={`w-12 h-1 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
                                            </div>
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 1 ? "bg-primary" : "bg-muted"}`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className={`w-12 h-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                                            </div>
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 2 ? "bg-primary" : "bg-muted"}`}>
                                                    <User className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                        <CardTitle className="text-foreground">{step === 1 ? "Informazioni Azienda" : "Crea il tuo Account"}</CardTitle>
                                        <CardDescription>{step === 1 ? (orgType === "manufacturer" ? "Inserisci i dati della tua azienda costruttrice" : "Inserisci i dati della tua azienda") : "Crea le credenziali di accesso amministratore"}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister} className="space-y-4">
                                            {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}

                                            {step === 1 ? (
                                                <>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className={orgType === "manufacturer" ? "border-purple-500 text-purple-600 dark:text-purple-400" : "border-blue-500 text-blue-600 dark:text-blue-400"}>
                                                            {orgType === "manufacturer" ? "Costruttore" : "Utilizzatore Finale"}
                                                        </Badge>
                                                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setStep(0); setOrgType(null); }}>Cambia</button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>{orgType === "manufacturer" ? "Nome Azienda Costruttrice *" : "Nome Azienda *"}</Label>
                                                        <Input placeholder={orgType === "manufacturer" ? "es. Tecno Machines Srl" : "es. Acme Srl"} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                                                    </div>
                                                    {orgType === "customer" && (
                                                        <div className="space-y-2">
                                                            <Label>Settore</Label>
                                                            <Select value={industry} onValueChange={setIndustry}>
                                                                <SelectTrigger><SelectValue placeholder="Seleziona il settore" /></SelectTrigger>
                                                                <SelectContent>{industries.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>))}</SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <Label>Piano</Label>
                                                        <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanType)}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(pricingPlans).map(([key, plan]) => (
                                                                    <SelectItem key={key} value={key}>{plan.name} - €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}/{billingPeriod === "yearly" ? "anno" : "mese"}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button type="submit" className="w-full" disabled={!companyName}>Continua</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-2"><Label>Nome e Cognome *</Label><Input placeholder="Mario Rossi" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                                                    <div className="space-y-2"><Label>Email Aziendale *</Label><Input type="email" placeholder="mario.rossi@azienda.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                                                    <div className="space-y-2"><Label>Password *</Label><Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /><p className="text-xs text-muted-foreground">Minimo 8 caratteri</p></div>
                                                    <div className="space-y-2"><Label>Conferma Password *</Label><Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
                                                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${orgType === "manufacturer" ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30" : "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30"}`}>
                                                        <Shield className={`w-5 h-5 ${orgType === "manufacturer" ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}`} />
                                                        <span className={`text-sm ${orgType === "manufacturer" ? "text-purple-700 dark:text-purple-300" : "text-blue-700 dark:text-blue-300"}`}>
                                                            Sarai registrato come <strong>Amministratore</strong> {orgType === "manufacturer" ? "costruttore" : "del workspace"}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Indietro</Button>
                                                        <Button type="submit" className="flex-1 bg-[#FF6B35] hover:bg-[#e55a2b] text-white" disabled={loading}>
                                                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione...</> : "Crea Account"}
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                            <div className="text-center pt-4 border-t">
                                                <Link href="/login" className="text-sm text-primary hover:underline">Hai già un account? Accedi</Link>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="lg:col-span-2">
                                <Card className="sticky top-8">
                                    <CardHeader><CardTitle className="text-lg">Riepilogo</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            {orgType === "manufacturer" ? <Factory className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                                            <span className="text-foreground font-medium">{orgType === "manufacturer" ? "Costruttore" : "Utilizzatore Finale"}</span>
                                        </div>
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-foreground">{currentPlan.name}</span>
                                                {selectedPlan === "professional" && <Badge>Più Popolare</Badge>}
                                            </div>
                                            <div className="text-2xl font-bold text-foreground mb-1">€{price}<span className="text-sm font-normal text-muted-foreground">/{billingPeriod === "yearly" ? "anno" : "mese"}</span></div>
                                        </div>
                                        <div className="space-y-2">{currentPlan.features.map((f, i) => <Feature key={i} text={f} />)}</div>
                                        {orgType === "manufacturer" && (
                                            <div className="space-y-2 pt-3 border-t">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Funzioni Costruttore</p>
                                                <Feature text="Gestione clienti" /><Feature text="Assegnazione macchine" /><Feature text="Condivisione documenti" />
                                            </div>
                                        )}
                                        <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-1"><Sparkles className="w-4 h-4" /> 14 giorni gratis</div>
                                            <p className="text-xs text-muted-foreground">Prova tutte le funzionalità senza impegno.</p>
                                        </div>
                                        {companyName && (<div className="pt-4 border-t"><p className="text-xs text-muted-foreground mb-1">Azienda</p><p className="text-foreground font-medium">{companyName}</p></div>)}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function Feature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" /><span>{text}</span>
        </div>
    );
}
