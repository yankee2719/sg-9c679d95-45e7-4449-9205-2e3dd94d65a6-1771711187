import { useMemo, useState } from "react";
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
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                                MACHINA unifica documentazione tecnica, checklist, work order, QR e dashboard in una web app pensata davvero per costruttori e utilizzatori finali.
                            </p>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <Button size="lg" className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register?plan=professional&period=yearly")}>Inizia la prova gratuita <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => scrollToSection("pricing")}>Vedi i piani</Button>
                            </div>

                            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                                {pillars.map((item) => (
                                    <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Card className="rounded-3xl border-slate-800 bg-slate-900/85 text-white shadow-2xl shadow-black/30">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-2xl">Piano consigliato</CardTitle>
                                    <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300">Professional</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span>Mensile</span>
                                    <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                                    <span>Annuale</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="text-4xl font-bold text-white">{heroPricing}</div>
                                    <p className="mt-2 text-sm text-slate-400">Pensato per aziende industriali che vogliono un flusso serio tra macchina, documento e manutenzione.</p>
                                </div>
                                <div className="space-y-3">
                                    {pricingPlans[1].features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                                            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push(`/register?plan=professional&period=${isYearly ? "yearly" : "monthly"}`)}>Configura il piano</Button>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Funzionalità chiave</p>
                            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Uno stack operativo unico per il ciclo vita macchina.</h2>
                            <p className="mt-4 text-slate-400">Dal tecnico in campo al responsabile manutenzione, MACHINA mette nello stesso flusso informazioni operative, documentali e decisionali.</p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {featureCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Card key={item.title} className="rounded-3xl border-slate-800 bg-slate-900/75 text-white">
                                        <CardContent className="p-6">
                                            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-lg font-semibold">{item.title}</h3>
                                            <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="positioning" className="border-y border-slate-800 bg-slate-900/60 px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Perché MACHINA</p>
                            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Non un CMMS generico, ma una piattaforma industriale concreta.</h2>
                            <p className="mt-4 text-slate-400">Il modello dati e l'esperienza sono costruiti attorno a costruttori, stabilimenti, macchine, linee, documentazione tecnica e work order. Non devi piegare il software al tuo processo.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300"><Factory className="h-5 w-5" /></div>
                                <h3 className="text-lg font-semibold">Per costruttori</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Assegna macchine ai clienti, mantieni storico, documenti e relazioni manufacturer/customer in modo serio.</p>
                            </div>
                            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300"><Wrench className="h-5 w-5" /></div>
                                <h3 className="text-lg font-semibold">Per manutenzione</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Checklist, QR e work order sono pensati per uso reale da parte dei tecnici, non solo per ufficio.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Prezzi</p>
                                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Piani chiari, senza linguaggio generico.</h2>
                            </div>
                            <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                                <span>Mensile</span>
                                <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                                <span>Annuale</span>
                            </div>
                        </div>

                        <div className="mt-10 grid gap-6 xl:grid-cols-3">
                            {pricingPlans.map((plan) => (
                                <Card key={plan.id} className={`rounded-3xl border ${plan.popular ? "border-orange-500/40 bg-slate-900" : "border-slate-800 bg-slate-900/70"} text-white`}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle>{plan.name}</CardTitle>
                                            {plan.popular ? <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300">Più scelto</Badge> : null}
                                        </div>
                                        <p className="text-sm text-slate-400">{plan.description}</p>
                                        <div className="pt-3 text-4xl font-bold text-white">€{isYearly ? plan.yearlyPrice : plan.monthlyPrice}<span className="ml-2 text-sm font-normal text-slate-400">/{isYearly ? "anno" : "mese"}</span></div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                                                <Check className="mt-0.5 h-4 w-4 text-orange-300" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                        <Button className={`mt-4 w-full ${plan.popular ? "bg-orange-600 text-white hover:bg-orange-500" : "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"}`} onClick={() => router.push(`/register?plan=${plan.id}&period=${isYearly ? "yearly" : "monthly"}`)} variant={plan.popular ? "default" : "outline"}>Scegli {plan.name}</Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="border-t border-slate-800 px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl">
                        <div className="text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">FAQ</p>
                            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Domande frequenti</h2>
                        </div>
                        <div className="mt-10 space-y-4">
                            {faqs.map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <button key={faq.question} type="button" className="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-slate-700" onClick={() => setOpenFaq(isOpen ? null : index)}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-lg font-semibold text-white">{faq.question}</div>
                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                                        </div>
                                        {isOpen ? <p className="mt-4 text-sm leading-7 text-slate-400">{faq.answer}</p> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-8 sm:p-12">
                        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">Pronto a provarla sul serio?</p>
                                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Porta documenti, QR, checklist e work order nello stesso flusso MACHINA.</h2>
                                <p className="mt-4 max-w-2xl text-slate-400">Apri un account demo e verifica come si comporta su un processo reale di manutenzione industriale.</p>
                            </div>
                            <Button size="lg" className="bg-orange-600 text-white hover:bg-orange-500" onClick={() => router.push("/register?plan=professional&period=yearly")}>Avvia la prova gratuita</Button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

