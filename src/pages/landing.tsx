import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    ArrowRight,
    BarChart3,
    Bell,
    Check,
    ChevronDown,
    ClipboardCheck,
    Factory,
    FileText,
    Globe,
    Lock,
    QrCode,
    Shield,
    Users,
    Wrench,
} from "lucide-react";

type PricingPlan = {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    popular?: boolean;
    features: string[];
};

const pricingPlans: PricingPlan[] = [
    {
        id: "starter",
        name: "Starter",
        description: "Per piccole realtà industriali e reparti manutenzione",
        monthlyPrice: 49,
        yearlyPrice: 490,
        features: [
            "1 Admin + 5 utenti",
            "Fino a 100 macchine / impianti",
            "Checklist illimitate",
            "QR code per ogni asset",
            "Archivio documentale tecnico",
            "Supporto email",
        ],
    },
    {
        id: "professional",
        name: "Professional",
        description: "Per costruttori e aziende con più linee o stabilimenti",
        monthlyPrice: 99,
        yearlyPrice: 990,
        popular: true,
        features: [
            "1 Admin + 3 Supervisor + 15 utenti",
            "Fino a 500 macchine / impianti",
            "Dashboard KPI MTBF / MTTR",
            "Pianificazione work order",
            "Notifiche programmate",
            "Export PDF / Excel",
            "Supporto prioritario",
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Per gruppi industriali e multi-tenant manufacturer/customer",
        monthlyPrice: 199,
        yearlyPrice: 1990,
        features: [
            "Utenti e asset illimitati",
            "Contesto manufacturer / customer",
            "Ruoli avanzati e audit trail",
            "Integrazioni custom",
            "Account manager dedicato",
            "Onboarding e formazione inclusi",
        ],
    },
];

const featureCards = [
    {
        icon: QrCode,
        title: "QR code operativi",
        description:
            "Ogni macchina ha un accesso rapido a documenti, checklist, storico e work order direttamente dal campo.",
    },
    {
        icon: ClipboardCheck,
        title: "Checklist digitali",
        description:
            "Esecuzioni guidate con foto, firme, campi obbligatori e storico consultabile da reparto, manutenzione o assistenza.",
    },
    {
        icon: FileText,
        title: "Documentazione tecnica",
        description:
            "Manuali, dichiarazioni, schemi e revisioni documentali gestiti con versioning e tracciabilità.",
    },
    {
        icon: Wrench,
        title: "Work order e manutenzione",
        description:
            "Pianifica interventi, assegna tecnici e monitora attività preventive e correttive in un flusso unico.",
    },
    {
        icon: BarChart3,
        title: "Dashboard industriali",
        description:
            "KPI operativi, stato macchine, criticità e vista direzionale per costruttori e utilizzatori finali.",
    },
    {
        icon: Users,
        title: "Multi-tenant reale",
        description:
            "Gestisci costruttori, clienti, stabilimenti, linee e macchine con contesti separati e permessi coerenti.",
    },
];

const pillars = [
    "Progettata per macchine e impianti industriali, non per asset generici.",
    "Uso rapido da smartphone per tecnici sul campo tramite QR.",
    "Operatività offline per checklist e manutenzioni; i documenti restano scaricabili quando necessario.",
    "Approccio serio a audit trail, compliance e documentazione tecnica.",
];

const faqs = [
    {
        question: "MACHINA va bene anche per costruttori di macchine?",
        answer:
            "Sì. Il modello manufacturer/customer è pensato per chi costruisce, assegna e mantiene nel tempo un parco macchine distribuito presso clienti diversi.",
    },
    {
        question: "Funziona bene per i tecnici in reparto o in assistenza?",
        answer:
            "Sì. Il flusso QR + mobile consente di aprire rapidamente scheda macchina, checklist e work order. Le attività operative possono funzionare anche offline.",
    },
    {
        question: "Posso gestire documenti tecnici versionati?",
        answer:
            "Sì. MACHINA è pensata per archiviare manuali, schemi, certificati, dichiarazioni e revisioni in modo coerente con l'uso industriale.",
    },
    {
        question: "C'è una prova iniziale?",
        answer:
            "Sì. Puoi iniziare con una prova gratuita per verificare flusso operativo, ruoli, QR e documentazione sul tuo caso reale.",
    },
];

export default function LandingPage() {
    const router = useRouter();
    const [isYearly, setIsYearly] = useState(true);
    const [openFaq, setOpenFaq] = useState < number | null > (0);

    const heroPricing = useMemo(() => {
        const professional = pricingPlans.find((plan) => plan.id === "professional")!;
        return isYearly ? `${professional.yearlyPrice}€/anno` : `${professional.monthlyPrice}€/mese`;
    }, [isYearly]);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <>
            <SEO
                title="MACHINA - Gestione manutenzione, documenti e checklist industriali"
                description="Web app SaaS industriale per macchine e impianti: documentazione tecnica, work order, checklist, QR e analytics per costruttori e clienti finali."
            />

            <div className="min-h-screen bg-slate-950 text-white">
                <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <button onClick={() => router.push("/")} className="flex items-center gap-3" type="button">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                                <Factory className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold tracking-[0.18em] text-orange-400">MACHINA</div>
                                <div className="text-xs text-slate-400">Industrial maintenance platform</div>
                            </div>
                        </button>

                        <div className="hidden items-center gap-8 md:flex">
                            <button className="text-sm text-slate-300 transition hover:text-white" onClick={() => scrollToSection("features")} type="button">Funzionalità</button>
                            <button className="text-sm text-slate-300 transition hover:text-white" onClick={() => scrollToSection("positioning")} type="button">Perché MACHINA</button>
                            <button className="text-sm text-slate-300 transition hover:text-white" onClick={() => scrollToSection("pricing")} type="button">Prezzi</button>
                            <button className="text-sm text-slate-300 transition hover:text-white" onClick={() => scrollToSection("faq")} type="button">FAQ</button>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="text-slate-200 hover:text-white" onClick={() => router.push("/login")}>Accedi</Button>
                            <Button className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register")}>Prova gratuita</Button>
                        </div>
                    </div>
                </nav>

                <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_30%)]" />
                    <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                        <div>
                            <div className="mb-6 flex flex-wrap items-center gap-3">
                                <Badge className="border-orange-500/30 bg-orange-500/10 px-3 py-1 text-orange-300">
                                    <Shield className="mr-1 h-3 w-3" /> SaaS industriale
                                </Badge>
                                <Badge className="border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">
                                    <QrCode className="mr-1 h-3 w-3" /> QR per tecnici sul campo
                                </Badge>
                                <Badge className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                                    <Globe className="mr-1 h-3 w-3" /> Offline-ready per operatività
                                </Badge>
                            </div>

                            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                                Gestione industriale di <span className="text-orange-400">macchine, documenti e manutenzione</span> in un'unica piattaforma.
                            </h1>
                            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                                MACHINA è la web app pensata per costruttori e utilizzatori finali che vogliono governare documentazione tecnica, work order, checklist, QR code e KPI di reparto con un'impostazione seria, industriale e vendibile.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <Button size="lg" className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register")}>
                                    Inizia ora
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => scrollToSection("pricing")}>
                                    Vedi i piani
                                </Button>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                <Card className="rounded-2xl border-slate-800 bg-slate-900/70">
                                    <CardContent className="p-5">
                                        <div className="text-2xl font-semibold text-white">QR + Mobile</div>
                                        <p className="mt-2 text-sm text-slate-400">Accesso immediato per tecnici, manutentori e assistenza.</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl border-slate-800 bg-slate-900/70">
                                    <CardContent className="p-5">
                                        <div className="text-2xl font-semibold text-white">Documenti versionati</div>
                                        <p className="mt-2 text-sm text-slate-400">Manuali, schemi, dichiarazioni e revisioni sempre tracciabili.</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl border-slate-800 bg-slate-900/70">
                                    <CardContent className="p-5">
                                        <div className="text-2xl font-semibold text-white">Multi-tenant</div>
                                        <p className="mt-2 text-sm text-slate-400">Costruttore, cliente, stabilimento, linea e macchina nello stesso modello.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Card className="rounded-3xl border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/30">
                            <CardHeader className="space-y-4">
                                <Badge className="w-fit border-orange-500/30 bg-orange-500/10 text-orange-300">Professional</Badge>
                                <div>
                                    <CardTitle className="text-2xl text-white">Piattaforma pronta per demo e vendita</CardTitle>
                                    <p className="mt-2 text-sm text-slate-400">
                                        Un posizionamento credibile per il settore industriale: meno fogli sparsi, meno ambiguità operative, più controllo.
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                                    <div className="text-sm text-slate-400">Piano di riferimento</div>
                                    <div className="mt-2 text-4xl font-bold text-white">{heroPricing}</div>
                                    <div className="mt-1 text-sm text-slate-400">billed {isYearly ? "yearly" : "monthly"}</div>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                                    <span className="text-sm text-slate-300">Mostra prezzo annuale</span>
                                    <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                                </div>

                                <ul className="space-y-3 text-sm text-slate-200">
                                    {[
                                        "Archivio documentale tecnico con versioni",
                                        "Checklist operative da smartphone",
                                        "Work order preventivi e correttivi",
                                        "QR per apertura rapida della macchina",
                                        "Vista KPI e criticità per reparto",
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3">
                                            <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Funzionalità chiave</p>
                        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Pensata per l'uso reale in officina, reparto e assistenza.</h2>
                        <p className="mt-4 text-base leading-7 text-slate-400">
                            MACHINA non prova a sembrare industriale: parte direttamente dai bisogni veri di chi gestisce macchine, documentazione e manutenzione.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {featureCards.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={feature.title} className="rounded-3xl border-slate-800 bg-slate-900/70">
                                    <CardHeader>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm leading-6 text-slate-400">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                <section id="positioning" className="border-y border-slate-800 bg-slate-900/60 px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Perché MACHINA</p>
                            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Una piattaforma industriale credibile, non un gestionale generico travestito.</h2>
                            <p className="mt-4 text-base leading-7 text-slate-400">
                                Il punto forte è mettere insieme documenti, manutenzione, checklists e contesto macchina in modo coerente, senza staccare il tecnico dalla realtà del campo.
                            </p>
                        </div>
                        <div className="grid gap-4">
                            {pillars.map((item) => (
                                <Card key={item} className="rounded-2xl border-slate-800 bg-slate-950/70">
                                    <CardContent className="flex items-start gap-3 p-5">
                                        <Check className="mt-0.5 h-5 w-5 text-emerald-400" />
                                        <p className="text-sm leading-6 text-slate-300">{item}</p>
                                    </CardContent>
                                </Card>
                            ))}
                            <Card className="rounded-2xl border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
                                <CardContent className="flex items-start gap-3 p-5">
                                    <Lock className="mt-0.5 h-5 w-5 text-blue-400" />
                                    <p className="text-sm leading-6 text-slate-300">
                                        Sicurezza, ruoli e audit trail restano parte del prodotto, non un'aggiunta di facciata. Questo aiuta sia in demo sia nell'uso reale in azienda.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Prezzi</p>
                            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Piani semplici, industriali, difendibili in vendita.</h2>
                        </div>
                        <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                            <span>Mensile</span>
                            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                            <span>Annuale</span>
                        </div>
                    </div>

                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        {pricingPlans.map((plan) => {
                            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                            const suffix = isYearly ? "/anno" : "/mese";
                            return (
                                <Card
                                    key={plan.id}
                                    className={[
                                        "rounded-3xl border-slate-800 bg-slate-900/70",
                                        plan.popular ? "ring-1 ring-orange-500/40" : "",
                                    ].join(" ")}
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                                            {plan.popular ? <Badge className="bg-orange-600 text-white">Più scelto</Badge> : null}
                                        </div>
                                        <p className="text-sm text-slate-400">{plan.description}</p>
                                        <div className="pt-2 text-4xl font-bold text-white">{price}€<span className="ml-1 text-base font-medium text-slate-400">{suffix}</span></div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <ul className="space-y-3 text-sm text-slate-300">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3">
                                                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button className="w-full bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register")}>Attiva prova</Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                <section id="faq" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">FAQ</p>
                        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Domande frequenti</h2>
                    </div>
                    <div className="mt-10 space-y-4">
                        {faqs.map((faq, index) => {
                            const open = openFaq === index;
                            return (
                                <button
                                    key={faq.question}
                                    className="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-slate-700"
                                    onClick={() => setOpenFaq(open ? null : index)}
                                    type="button"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-lg font-semibold text-white">{faq.question}</span>
                                        <ChevronDown className={["h-5 w-5 text-slate-400 transition-transform", open ? "rotate-180" : ""].join(" ")} />
                                    </div>
                                    {open ? <p className="mt-4 text-sm leading-6 text-slate-400">{faq.answer}</p> : null}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
                    <Card className="mx-auto max-w-6xl rounded-[2rem] border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                        <CardContent className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
                            <div className="max-w-3xl">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Pronto a provarla sul tuo caso reale?</p>
                                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Porta in ordine documenti, manutenzione e operatività macchina.</h2>
                                <p className="mt-4 text-base leading-7 text-slate-400">
                                    Inizia con il tuo reparto, una linea o un gruppo di macchine. MACHINA è costruita per essere seria in demo e utile nel quotidiano.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button size="lg" className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register")}>Crea account</Button>
                                <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => router.push("/login")}>Accedi</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-sm text-slate-500 md:flex-row">
                        <span>© {new Date().getFullYear()} MACHINA</span>
                        <div className="flex items-center gap-5">
                            <Link href="/login" className="transition hover:text-white">Login</Link>
                            <Link href="/register" className="transition hover:text-white">Registrazione</Link>
                            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifiche, QR, checklist e documenti</span>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
