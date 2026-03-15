import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, Check, Factory, Loader2, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

const pricingPlans = {
    starter: { name: "Starter", monthlyPrice: 49, yearlyPrice: 490 },
    professional: { name: "Professional", monthlyPrice: 99, yearlyPrice: 990 },
    enterprise: { name: "Enterprise", monthlyPrice: 199, yearlyPrice: 1990 },
} as const;

type PlanType = keyof typeof pricingPlans;
type OrgType = "manufacturer" | "customer";

const industries = [
    { value: "manufacturing", label: "Manufacturing" },
    { value: "food", label: "Food" },
    { value: "pharma", label: "Pharma" },
    { value: "automotive", label: "Automotive" },
    { value: "facility", label: "Facility" },
    { value: "energy", label: "Energy" },
    { value: "logistics", label: "Logistics" },
    { value: "other", label: "Other" },
];

const copy = {
    it: {
        seo: "Registrazione - MACHINA",
        title: "Crea il tuo account MACHINA",
        subtitle: "Configura organizzazione, piano e utente amministratore iniziale.",
        step1: "Tipo organizzazione",
        step2: "Dati azienda",
        step3: "Utente amministratore",
        manufacturer: "Costruttore",
        customer: "Utilizzatore finale",
        chooseType: "Seleziona il profilo che descrive la tua organizzazione.",
        companyName: "Nome azienda",
        industry: "Settore",
        plan: "Piano",
        billing: "Fatturazione",
        yearly: "Annuale",
        monthly: "Mensile",
        continue: "Continua",
        back: "Indietro",
        fullName: "Nome e cognome",
        email: "Email aziendale",
        password: "Password",
        confirmPassword: "Conferma password",
        passwordHint: "Minimo 8 caratteri",
        create: "Crea account",
        creating: "Creazione in corso...",
        login: "Hai già un account? Accedi",
        successTitle: "Account creato con successo",
        successDescription: "Verrai reindirizzato alla dashboard.",
        passwordMismatch: "Le password non corrispondono",
        passwordTooShort: "La password deve contenere almeno 8 caratteri",
        genericError: "Errore durante la registrazione",
    },
    en: {
        seo: "Register - MACHINA",
        title: "Create your MACHINA account",
        subtitle: "Set up organization, plan, and the initial admin user.",
        step1: "Organization type",
        step2: "Company details",
        step3: "Admin user",
        manufacturer: "Manufacturer",
        customer: "End user",
        chooseType: "Select the profile that best matches your organization.",
        companyName: "Company name",
        industry: "Industry",
        plan: "Plan",
        billing: "Billing",
        yearly: "Yearly",
        monthly: "Monthly",
        continue: "Continue",
        back: "Back",
        fullName: "Full name",
        email: "Business email",
        password: "Password",
        confirmPassword: "Confirm password",
        passwordHint: "Minimum 8 characters",
        create: "Create account",
        creating: "Creating account...",
        login: "Already have an account? Sign in",
        successTitle: "Account created successfully",
        successDescription: "You will be redirected to the dashboard.",
        passwordMismatch: "Passwords do not match",
        passwordTooShort: "Password must be at least 8 characters",
        genericError: "Registration error",
    },
    fr: {
        seo: "Inscription - MACHINA",
        title: "Créez votre compte MACHINA",
        subtitle: "Configurez l’organisation, le plan et l’utilisateur administrateur initial.",
        step1: "Type d’organisation",
        step2: "Données entreprise",
        step3: "Utilisateur administrateur",
        manufacturer: "Constructeur",
        customer: "Utilisateur final",
        chooseType: "Sélectionnez le profil qui décrit votre organisation.",
        companyName: "Nom de l’entreprise",
        industry: "Secteur",
        plan: "Plan",
        billing: "Facturation",
        yearly: "Annuelle",
        monthly: "Mensuelle",
        continue: "Continuer",
        back: "Retour",
        fullName: "Nom complet",
        email: "Email professionnel",
        password: "Mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        passwordHint: "Minimum 8 caractères",
        create: "Créer le compte",
        creating: "Création du compte...",
        login: "Vous avez déjà un compte ? Connectez-vous",
        successTitle: "Compte créé avec succès",
        successDescription: "Vous allez être redirigé vers le tableau de bord.",
        passwordMismatch: "Les mots de passe ne correspondent pas",
        passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères",
        genericError: "Erreur d’inscription",
    },
    es: {
        seo: "Registro - MACHINA",
        title: "Crea tu cuenta MACHINA",
        subtitle: "Configura organización, plan y el usuario administrador inicial.",
        step1: "Tipo de organización",
        step2: "Datos de la empresa",
        step3: "Usuario administrador",
        manufacturer: "Fabricante",
        customer: "Usuario final",
        chooseType: "Selecciona el perfil que mejor describe tu organización.",
        companyName: "Nombre de la empresa",
        industry: "Sector",
        plan: "Plan",
        billing: "Facturación",
        yearly: "Anual",
        monthly: "Mensual",
        continue: "Continuar",
        back: "Atrás",
        fullName: "Nombre y apellidos",
        email: "Email corporativo",
        password: "Contraseña",
        confirmPassword: "Confirmar contraseña",
        passwordHint: "Mínimo 8 caracteres",
        create: "Crear cuenta",
        creating: "Creando cuenta...",
        login: "¿Ya tienes cuenta? Inicia sesión",
        successTitle: "Cuenta creada correctamente",
        successDescription: "Serás redirigido al dashboard.",
        passwordMismatch: "Las contraseñas no coinciden",
        passwordTooShort: "La contraseña debe tener al menos 8 caracteres",
        genericError: "Error durante el registro",
    },
} as const;

export default function RegisterPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

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
        if (type === "manufacturer" || type === "customer") {
            setOrgType(type);
            setStep(1);
        }
    }, [router.query]);

    const handleRegister = async (event: React.FormEvent) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        if (password !== confirmPassword) {
            setError(text.passwordMismatch);
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError(text.passwordTooShort);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    fullName,
                    email,
                    password,
                    plan: selectedPlan,
                    orgType: orgType || "customer",
                    industry,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || text.genericError);

            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;

            setSuccess(true);
            setTimeout(() => router.push("/dashboard"), 1500);
        } catch (err: any) {
            setError(err?.message || text.genericError);
            setLoading(false);
        }
    };

    const selectedPlanLabel = `${pricingPlans[selectedPlan].name} - €${billingPeriod === "yearly" ? pricingPlans[selectedPlan].yearlyPrice : pricingPlans[selectedPlan].monthlyPrice}/${billingPeriod === "yearly" ? "yr" : "mo"}`;

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <SEO title={text.seo} />
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">{text.successTitle}</h3>
                                <p className="text-muted-foreground mt-2">{text.successDescription}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <SEO title={text.seo} />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
                <div className="mx-auto max-w-5xl py-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {text.login}
                        </Link>
                        <Badge variant="outline">{selectedPlanLabel}</Badge>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <Card className="rounded-3xl border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-2xl">{text.title}</CardTitle>
                                <CardDescription>{text.subtitle}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <Badge variant={step === 0 ? "default" : "outline"}>{text.step1}</Badge>
                                    <Badge variant={step === 1 ? "default" : "outline"}>{text.step2}</Badge>
                                    <Badge variant={step === 2 ? "default" : "outline"}>{text.step3}</Badge>
                                </div>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {step === 0 && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <button type="button" onClick={() => { setOrgType("manufacturer"); setStep(1); }} className="rounded-2xl border border-border p-6 text-left transition hover:border-primary hover:bg-primary/5">
                                            <Factory className="mb-4 h-8 w-8 text-primary" />
                                            <div className="font-semibold">{text.manufacturer}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">{text.chooseType}</div>
                                        </button>
                                        <button type="button" onClick={() => { setOrgType("customer"); setStep(1); }} className="rounded-2xl border border-border p-6 text-left transition hover:border-primary hover:bg-primary/5">
                                            <Building2 className="mb-4 h-8 w-8 text-primary" />
                                            <div className="font-semibold">{text.customer}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">{text.chooseType}</div>
                                        </button>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>{text.companyName}</Label>
                                            <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{text.industry}</Label>
                                            <Select value={industry} onValueChange={setIndustry}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={text.industry} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {industries.map((item) => (
                                                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>{text.plan}</Label>
                                                <Select value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as PlanType)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.keys(pricingPlans).map((key) => (
                                                            <SelectItem key={key} value={key}>{pricingPlans[key as PlanType].name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{text.billing}</Label>
                                                <Select value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="yearly">{text.yearly}</SelectItem>
                                                        <SelectItem value="monthly">{text.monthly}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" onClick={() => setStep(0)}>{text.back}</Button>
                                            <Button onClick={() => setStep(2)} disabled={!companyName.trim()}>{text.continue}</Button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>{text.fullName}</Label>
                                            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{text.email}</Label>
                                            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{text.password}</Label>
                                            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                                            <p className="text-xs text-muted-foreground">{text.passwordHint}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{text.confirmPassword}</Label>
                                            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button type="button" variant="outline" onClick={() => setStep(1)}>{text.back}</Button>
                                            <Button type="submit" disabled={loading}>
                                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {loading ? text.creating : text.create}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border shadow-sm">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                                <CardDescription>Setup preview</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
                                    {orgType === "manufacturer" ? <Factory className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                                    <div>
                                        <div className="font-medium">{orgType === "manufacturer" ? text.manufacturer : text.customer}</div>
                                        <div className="text-muted-foreground">{companyName || "—"}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-medium">{pricingPlans[selectedPlan].name}</div>
                                        <div className="text-muted-foreground">{billingPeriod === "yearly" ? text.yearly : text.monthly}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
                                    <User className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-medium">{fullName || "—"}</div>
                                        <div className="text-muted-foreground">{email || "—"}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
