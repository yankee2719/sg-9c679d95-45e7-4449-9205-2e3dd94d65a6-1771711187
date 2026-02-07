import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Check,
    QrCode,
    ClipboardCheck,
    Calendar,
    BarChart3,
    Bell,
    Users,
    Shield,
    ArrowRight,
    ChevronDown,
    Wrench,
    Star,
    Zap,
    Globe,
    Lock,
} from "lucide-react";

const pricingPlans = [
    {
        id: "starter",
        name: "Starter",
        description: "Per piccoli team e officine",
        monthlyPrice: 49,
        yearlyPrice: 490,
        popular: false,
        features: [
            "1 Admin + 5 utenti",
            "100 attrezzature",
            "Checklist illimitate",
            "QR Code per ogni attrezzatura",
            "App mobile responsive",
            "Supporto email",
            "Report base",
        ],
    },
    {
        id: "professional",
        name: "Professional",
        description: "Per aziende in crescita",
        monthlyPrice: 99,
        yearlyPrice: 990,
        popular: true,
        features: [
            "1 Admin + 3 Supervisor + 15 utenti",
            "500 attrezzature",
            "Tutto di Starter, più:",
            "KPI avanzati (MTBF, MTTR)",
            "Calendario manutenzioni drag & drop",
            "Notifiche programmate",
            "Export PDF/Excel",
            "Supporto prioritario",
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Per grandi organizzazioni",
        monthlyPrice: 199,
        yearlyPrice: 1990,
        popular: false,
        features: [
            "Utenti illimitati",
            "Attrezzature illimitate",
            "Tutto di Professional, più:",
            "API REST completa",
            "Integrazioni ERP custom",
            "Account manager dedicato",
            "Formazione inclusa (2h)",
            "SLA 99.9% garantito",
            "Single Sign-On (SSO)",
        ],
    },
];

const features = [
    {
        icon: QrCode,
        title: "QR Code Intelligenti",
        description: "Genera e stampa QR code per ogni attrezzatura. Scansiona per accedere istantaneamente a manuali, storico e checklist.",
    },
    {
        icon: ClipboardCheck,
        title: "Checklist Digitali",
        description: "Crea checklist personalizzate con foto, firme e campi obbligatori. Mai più fogli di carta persi.",
    },
    {
        icon: Calendar,
        title: "Manutenzione Preventiva",
        description: "Pianifica interventi ricorrenti e ricevi notifiche automatiche. Riduci i fermi macchina imprevisti.",
    },
    {
        icon: BarChart3,
        title: "Dashboard Analytics",
        description: "Monitora KPI come MTBF e MTTR. Visualizza trend e identifica le attrezzature problematiche.",
    },
    {
        icon: Bell,
        title: "Notifiche in Tempo Reale",
        description: "Avvisi automatici per manutenzioni scadute, checklist incomplete e anomalie rilevate.",
    },
    {
        icon: Users,
        title: "Multi-Utente & Ruoli",
        description: "Admin, Supervisor e Tecnici con permessi differenziati. Ogni team ha la vista giusta.",
    },
];

const faqs = [
    {
        question: "Posso provare gratis prima di acquistare?",
        answer: "Sì! Offriamo 14 giorni di prova gratuita senza carta di credito. Potrai testare tutte le funzionalità del piano Professional.",
    },
    {
        question: "Posso cambiare piano in qualsiasi momento?",
        answer: "Assolutamente. Puoi fare upgrade o downgrade in qualsiasi momento. Il cambio sarà effettivo dal prossimo ciclo di fatturazione.",
    },
    {
        question: "I miei dati sono al sicuro?",
        answer: "I tuoi dati sono ospitati su server europei (GDPR compliant), con backup giornalieri e crittografia SSL/TLS.",
    },
    {
        question: "Funziona su mobile?",
        answer: "Sì! L'interfaccia è completamente responsive. I tecnici possono usare lo scanner QR e compilare checklist direttamente dal telefono.",
    },
];

const testimonials = [
    {
        name: "Marco Bianchi",
        role: "Responsabile Manutenzione",
        company: "Industria Meccanica SpA",
        text: "Abbiamo ridotto i fermi macchina del 40% nel primo anno. Il ROI è stato immediato.",
        rating: 5,
    },
    {
        name: "Laura Rossi",
        role: "Plant Manager",
        company: "Food Processing Srl",
        text: "Finalmente addio ai fogli Excel! Le checklist digitali hanno reso le ispezioni HACCP molto più semplici.",
        rating: 5,
    },
    {
        name: "Giuseppe Verdi",
        role: "Titolare",
        company: "Officina Verdi & Figli",
        text: "Anche con un piccolo team, riusciamo a gestire 50+ attrezzature senza stress. Ottimo rapporto qualità-prezzo.",
        rating: 5,
    },
];

export default function LandingPage() {
    const router = useRouter();
    const [isYearly, setIsYearly] = useState(true);
    const [openFaq, setOpenFaq] = useState < number | null > (null);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <>
            <SEO
                title="MaintOps - Software CMMS per la Gestione della Manutenzione"
                description="Gestisci manutenzione, attrezzature e checklist in modo semplice e intelligente. 14 giorni di prova gratuita."
            />

            <div className="min-h-screen bg-slate-900">
                {/* NAVBAR */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                    <Wrench className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">MaintOps</span>
                            </div>
                            <div className="hidden md:flex items-center gap-8">
                                <button onClick={() => scrollToSection("features")} className="text-slate-300 hover:text-white transition-colors">Funzionalità</button>
                                <button onClick={() => scrollToSection("pricing")} className="text-slate-300 hover:text-white transition-colors">Prezzi</button>
                                <button onClick={() => scrollToSection("faq")} className="text-slate-300 hover:text-white transition-colors">FAQ</button>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => router.push("/login")}>Accedi</Button>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push("/register")}>Prova Gratis</Button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* HERO SECTION */}
                <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

                    <div className="relative max-w-5xl mx-auto text-center">
                        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/30 px-3 py-1">
                                <Check className="w-3 h-3 mr-1" /> 14 giorni gratis
                            </Badge>
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 px-3 py-1">
                                <Shield className="w-3 h-3 mr-1" /> Nessuna carta richiesta
                            </Badge>
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 px-3 py-1">
                                <Globe className="w-3 h-3 mr-1" /> Server EU - GDPR
                            </Badge>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                            Gestisci la manutenzione<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                in modo semplice e intelligente
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                            Il software CMMS italiano che semplifica la gestione di attrezzature, manutenzioni preventive e checklist. Per PMI e grandi aziende.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-blue-500/25" onClick={() => router.push("/register")}>
                                Inizia la Prova Gratuita <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8 py-6 rounded-xl" onClick={() => scrollToSection("features")}>
                                Scopri le Funzionalità
                            </Button>
                        </div>

                        <div className="flex items-center justify-center gap-8 text-slate-500">
                            <div className="flex items-center gap-2"><Users className="w-5 h-5" /><span>500+ aziende</span></div>
                            <div className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /><span>4.9/5 rating</span></div>
                            <div className="flex items-center gap-2"><Zap className="w-5 h-5" /><span>Setup in 5 minuti</span></div>
                        </div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section id="features" className="py-20 px-4 bg-slate-800/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">Funzionalità</Badge>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Tutto ciò che serve per gestire la manutenzione</h2>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Dalla creazione di QR code alla pianificazione delle manutenzioni, MaintOps copre ogni aspetto del CMMS.</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, index) => (
                                <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                                            <feature.icon className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                        <p className="text-slate-400">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING SECTION */}
                <section id="pricing" className="py-20 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/30 mb-4">Prezzi Trasparenti</Badge>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Scegli il piano adatto a te</h2>
                            <p className="text-slate-400 text-lg mb-8">Nessun costo nascosto. Cancella quando vuoi.</p>
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <span className={`text-sm ${!isYearly ? "text-white" : "text-slate-500"}`}>Mensile</span>
                                <Switch checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-blue-600" />
                                <span className={`text-sm ${isYearly ? "text-white" : "text-slate-500"}`}>Annuale</span>
                                {isYearly && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">Risparmia 2 mesi</Badge>}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {pricingPlans.map((plan) => (
                                <Card key={plan.id} className={`relative bg-slate-800/50 border-slate-700 ${plan.popular ? "border-blue-500 ring-2 ring-blue-500/20" : "hover:border-slate-600"} transition-all`}>
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-blue-600 text-white border-0 px-3">Più Popolare</Badge>
                                        </div>
                                    )}
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-white">{plan.name}</CardTitle>
                                        <p className="text-slate-400 text-sm">{plan.description}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mb-6">
                                            <span className="text-4xl font-bold text-white">€{isYearly ? plan.yearlyPrice : plan.monthlyPrice}</span>
                                            <span className="text-slate-400">/{isYearly ? "anno" : "mese"}</span>
                                            {isYearly && <p className="text-sm text-slate-500 mt-1">€{Math.round(plan.yearlyPrice / 12)}/mese fatturato annualmente</p>}
                                        </div>
                                        <Button className={`w-full mb-6 ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"}`} onClick={() => router.push(`/register?plan=${plan.id}&period=${isYearly ? "yearly" : "monthly"}`)}>
                                            Inizia con {plan.name}
                                        </Button>
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                                                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="text-center mt-12">
                            <div className="inline-flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full">
                                <Shield className="w-5 h-5 text-green-400" />
                                <span>Garanzia soddisfatti o rimborsati entro 30 giorni</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TESTIMONIALS SECTION */}
                <section className="py-20 px-4 bg-slate-800/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 mb-4">Testimonianze</Badge>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Cosa dicono i nostri clienti</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {testimonials.map((testimonial, index) => (
                                <Card key={index} className="bg-slate-800/50 border-slate-700">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-1 mb-4">
                                            {Array.from({ length: testimonial.rating }).map((_, i) => (
                                                <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                            ))}
                                        </div>
                                        <p className="text-slate-300 mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                                        <div>
                                            <p className="font-semibold text-white">{testimonial.name}</p>
                                            <p className="text-sm text-slate-400">{testimonial.role}, {testimonial.company}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section id="faq" className="py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30 mb-4">FAQ</Badge>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Domande Frequenti</h2>
                        </div>
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <Card key={index} className="bg-slate-800/50 border-slate-700 cursor-pointer" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-white">{faq.question}</h3>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                                        </div>
                                        {openFaq === index && <p className="text-slate-400 mt-4 pt-4 border-t border-slate-700">{faq.answer}</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA SECTION */}
                <section className="py-20 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pronto a semplificare la manutenzione?</h2>
                        <p className="text-xl text-slate-400 mb-8">Inizia oggi con 14 giorni di prova gratuita. Nessuna carta di credito richiesta.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 rounded-xl" onClick={() => router.push("/register")}>
                                Inizia la Prova Gratuita <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="py-12 px-4 border-t border-slate-800">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                    <Wrench className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">MaintOps</span>
                            </div>
                            <p className="text-sm text-slate-500">© {new Date().getFullYear()} MaintOps. Tutti i diritti riservati.</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <Lock className="w-4 h-4" />
                                <span>Pagamenti sicuri con Stripe</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
