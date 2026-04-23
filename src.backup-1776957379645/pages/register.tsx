import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Check,
    Factory,
    Loader2,
    QrCode,
    Shield,
    User,
    Wrench,
} from "lucide-react";
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
        chooseType: "Seleziona il profilo che descrive meglio la tua organizzazione industriale.",
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
        backToLanding: "Torna alla landing",
        panelTitle: "Onboarding coerente con la landing MACHINA",
        panelBody: "La registrazione resta nello stesso linguaggio visivo: dark industriale, focus su macchine, documenti, QR e manutenzione.",
        panelBullet1: "Contesto costruttore / utilizzatore finale",
        panelBullet2: "Piani chiari per realtà industriali",
        panelBullet3: "Accesso rapido a workflow QR e checklist",
        summaryTitle: "Riepilogo configurazione",
        summaryDescription: "Anteprima del setup iniziale",
        summaryOrg: "Profilo organizzazione",
        summaryPlan: "Piano selezionato",
        summaryAdmin: "Amministratore iniziale",
        setupReady: "Setup pronto",
        setupHint: "Puoi completare ora l'attivazione iniziale dell'ambiente MACHINA.",
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
        chooseType: "Select the profile that best matches your industrial organization.",
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
        backToLanding: "Back to landing",
        panelTitle: "Onboarding aligned with the MACHINA landing",
        panelBody: "Registration now keeps the same industrial dark language: machines, documents, QR, and maintenance.",
        panelBullet1: "Manufacturer / end user context",
        panelBullet2: "Clear plans for industrial teams",
        panelBullet3: "Fast path to QR and checklist workflows",
        summaryTitle: "Configuration summary",
        summaryDescription: "Preview of the initial setup",
        summaryOrg: "Organization profile",
        summaryPlan: "Selected plan",
        summaryAdmin: "Initial admin",
        setupReady: "Setup ready",
        setupHint: "You can now complete the initial activation of your MACHINA environment.",
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
        chooseType: "Sélectionnez le profil qui correspond le mieux à votre organisation industrielle.",
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
        backToLanding: "Retour à la landing",
        panelTitle: "Onboarding aligné avec la landing MACHINA",
        panelBody: "L’inscription conserve désormais le même langage visuel industriel sombre : machines, documents, QR et maintenance.",
        panelBullet1: "Contexte constructeur / utilisateur final",
        panelBullet2: "Plans clairs pour les équipes industrielles",
        panelBullet3: "Accès rapide aux flux QR et check-lists",
        summaryTitle: "Résumé de configuration",
        summaryDescription: "Aperçu du paramétrage initial",
        summaryOrg: "Profil de l’organisation",
        summaryPlan: "Plan sélectionné",
        summaryAdmin: "Administrateur initial",
        setupReady: "Configuration prête",
        setupHint: "Vous pouvez maintenant terminer l’activation initiale de votre environnement MACHINA.",
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
        chooseType: "Selecciona el perfil que mejor describe tu organización industrial.",
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
        backToLanding: "Volver a la landing",
        panelTitle: "Onboarding alineado con la landing MACHINA",
        panelBody: "El registro mantiene ahora el mismo lenguaje visual industrial oscuro: máquinas, documentos, QR y mantenimiento.",
        panelBullet1: "Contexto fabricante / usuario final",
        panelBullet2: "Planes claros para equipos industriales",
        panelBullet3: "Acceso rápido a flujos QR y checklists",
        summaryTitle: "Resumen de configuración",
        summaryDescription: "Vista previa de la configuración inicial",
        summaryOrg: "Perfil de la organización",
        summaryPlan: "Plan seleccionado",
        summaryAdmin: "Administrador inicial",
        setupReady: "Configuración lista",
        setupHint: "Ahora puedes completar la activación inicial de tu entorno MACHINA.",
    },
} as const;

export default function RegisterPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    const [step, setStep] = useState(0);
    const [orgType, setOrgType] = useState<OrgType | null>(null);
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedPlan, setSelectedPlan] = useState<PlanType>("professional");
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
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

    const summaryOrgLabel = orgType === "manufacturer" ? text.manufacturer : orgType === "customer" ? text.customer : "—";
    const darkInputClass = "border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 autofill:border-slate-700 autofill:[-webkit-text-fill-color:rgb(255,255,255)] autofill:shadow-[inset_0_0_0px_1000px_rgb(2,6,23)]";

    if (success) {
        return (
            <>
                <SEO title={text.seo} />
                <div className="min-h-screen bg-slate-950 p-4 text-white">
                    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
                        <Card className="w-full rounded-[2rem] border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/30">
                            <CardContent className="pt-8">
                                <div className="space-y-4 text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                                        <Check className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{text.successTitle}</h3>
                                        <p className="mt-2 text-slate-400">{text.successDescription}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO title={text.seo} />
            <div className="min-h-screen bg-slate-950 text-white">
                <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="relative hidden overflow-hidden border-r border-slate-800 bg-slate-950 lg:block">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />
                        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
                            <div>
                                <Link href="/landing" className="inline-flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                                        <Factory className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold tracking-[0.18em] text-orange-400">MACHINA</div>
                                        <div className="text-xs text-slate-400">Industrial maintenance platform</div>
                                    </div>
                                </Link>
                            </div>

                            <div className="max-w-xl">
                                <Badge className="border-orange-500/30 bg-orange-500/10 px-3 py-1 text-orange-300">{text.setupReady}</Badge>
                                <h1 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl">{text.panelTitle}</h1>
                                <p className="mt-5 text-lg leading-8 text-slate-300">{text.panelBody}</p>

                                <div className="mt-10 space-y-4">
                                    {[
                                        { icon: Factory, text: text.panelBullet1 },
                                        { icon: Shield, text: text.panelBullet2 },
                                        { icon: QrCode, text: text.panelBullet3 },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <div key={item.text} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-300">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span>{item.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{text.setupReady}</div>
                                        <div className="text-slate-400">{text.setupHint}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative p-4 sm:p-6 lg:p-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_28%)] lg:hidden" />
                        <div className="relative mx-auto max-w-5xl py-6 lg:py-8">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <Link href="/landing" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">{text.backToLanding}</span>
                                    <span className="sm:hidden">MACHINA</span>
                                </Link>
                                <Badge className="border-slate-700 bg-slate-900 text-slate-300">{selectedPlanLabel}</Badge>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <Card className="min-w-0 rounded-[2rem] border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/20">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white">{text.title}</CardTitle>
                                        <CardDescription className="text-slate-400">{text.subtitle}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <Badge className={step === 0 ? "bg-orange-600 text-white hover:bg-orange-600" : "border-slate-700 bg-slate-950 text-slate-300"} variant={step === 0 ? "default" : "outline"}>{text.step1}</Badge>
                                            <Badge className={step === 1 ? "bg-orange-600 text-white hover:bg-orange-600" : "border-slate-700 bg-slate-950 text-slate-300"} variant={step === 1 ? "default" : "outline"}>{text.step2}</Badge>
                                            <Badge className={step === 2 ? "bg-orange-600 text-white hover:bg-orange-600" : "border-slate-700 bg-slate-950 text-slate-300"} variant={step === 2 ? "default" : "outline"}>{text.step3}</Badge>
                                        </div>

                                        {error ? (
                                            <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-100">
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        ) : null}

                                        {step === 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrgType("manufacturer");
                                                        setStep(1);
                                                    }}
                                                    className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-left transition hover:border-orange-500/40 hover:bg-orange-500/5"
                                                >
                                                    <Factory className="mb-4 h-8 w-8 text-orange-300" />
                                                    <div className="font-semibold text-white">{text.manufacturer}</div>
                                                    <div className="mt-2 text-sm leading-6 text-slate-400">{text.chooseType}</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrgType("customer");
                                                        setStep(1);
                                                    }}
                                                    className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-left transition hover:border-orange-500/40 hover:bg-orange-500/5"
                                                >
                                                    <Building2 className="mb-4 h-8 w-8 text-orange-300" />
                                                    <div className="font-semibold text-white">{text.customer}</div>
                                                    <div className="mt-2 text-sm leading-6 text-slate-400">{text.chooseType}</div>
                                                </button>
                                            </div>
                                        ) : null}

                                        {step === 1 ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.companyName}</Label>
                                                    <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required className={darkInputClass} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.industry}</Label>
                                                    <Select value={industry} onValueChange={setIndustry}>
                                                        <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                                                            <SelectValue placeholder={text.industry} />
                                                        </SelectTrigger>
                                                        <SelectContent className="border-slate-700 bg-slate-950 text-white">
                                                            {industries.map((item) => (
                                                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-200">{text.plan}</Label>
                                                        <Select value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as PlanType)}>
                                                            <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-slate-700 bg-slate-950 text-white">
                                                                {Object.keys(pricingPlans).map((key) => (
                                                                    <SelectItem key={key} value={key}>{pricingPlans[key as PlanType].name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-200">{text.billing}</Label>
                                                        <Select value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}>
                                                            <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-slate-700 bg-slate-950 text-white">
                                                                <SelectItem value="yearly">{text.yearly}</SelectItem>
                                                                <SelectItem value="monthly">{text.monthly}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" onClick={() => setStep(0)}>{text.back}</Button>
                                                    <Button className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => setStep(2)} disabled={!companyName.trim()}>{text.continue}</Button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {step === 2 ? (
                                            <form onSubmit={handleRegister} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.fullName}</Label>
                                                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required className={darkInputClass} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.email}</Label>
                                                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={darkInputClass} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.password}</Label>
                                                    <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className={darkInputClass} />
                                                    <p className="text-xs text-slate-500">{text.passwordHint}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-200">{text.confirmPassword}</Label>
                                                    <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} className={darkInputClass} />
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button type="button" variant="outline" className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" onClick={() => setStep(1)}>{text.back}</Button>
                                                    <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-500" disabled={loading}>
                                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        {loading ? text.creating : text.create}
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                <Card className="min-w-0 rounded-[2rem] border-slate-800 bg-slate-900/90 text-white shadow-xl shadow-black/10">
                                    <CardHeader>
                                        <CardTitle className="text-white">{text.summaryTitle}</CardTitle>
                                        <CardDescription className="text-slate-400">{text.summaryDescription}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4">
                                            {orgType === "manufacturer" ? <Factory className="h-5 w-5 text-orange-300" /> : <Building2 className="h-5 w-5 text-orange-300" />}
                                            <div className="min-w-0">
                                                <div className="font-medium text-white">{text.summaryOrg}</div>
                                                <div className="text-slate-400">{summaryOrgLabel}</div>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4">
                                            <Shield className="h-5 w-5 text-orange-300" />
                                            <div className="min-w-0">
                                                <div className="font-medium text-white">{text.summaryPlan}</div>
                                                <div className="text-slate-400">{pricingPlans[selectedPlan].name} · {billingPeriod === "yearly" ? text.yearly : text.monthly}</div>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4">
                                            <User className="h-5 w-5 text-orange-300" />
                                            <div className="min-w-0">
                                                <div className="font-medium text-white">{text.summaryAdmin}</div>
                                                <div className="text-slate-400">{fullName || "—"}</div>
                                                <div className="max-w-full break-all text-slate-500">{email || "—"}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-5 text-center text-sm text-slate-400 lg:text-left">
                                {text.login}{" "}
                                <Link href="/login" className="font-semibold text-orange-300 hover:text-orange-200">
                                    /login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
