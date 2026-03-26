import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { createCustomer } from "@/services/customerApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Loader2, Save, Shield } from "lucide-react";

export default function NewCustomerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { organization, membership, loading: authLoading } = useAuth();
    const { t } = useLanguage();

    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("IT");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [subscriptionStatus, setSubscriptionStatus] = useState("trial");

    const orgType = organization?.type ?? null;
    const userRole = membership?.role ?? "technician";
    const canCreate = userRole === "owner" || userRole === "admin" || userRole === "supervisor";

    const pageBlocked = useMemo(() => authLoading || orgType !== "manufacturer" || !canCreate, [authLoading, orgType, canCreate]);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({
                title: t("common.error") || "Errore",
                description: t("customers.errorNameRequired") || "Il nome cliente è obbligatorio.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const data = await createCustomer({
                name: name.trim(),
                slug: slug.trim() || null,
                city: city.trim() || null,
                country: country.trim() || "IT",
                email: email.trim().toLowerCase() || null,
                phone: phone.trim() || null,
                subscription_status: subscriptionStatus,
            });

            toast({
                title: t("customers.created") || "Cliente creato",
                description: name.trim(),
            });

            void router.push(`/customers/${data.id}`);
        } catch (err: any) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: err?.message || t("customers.errorCreate") || "Errore creazione cliente",
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
                    <SEO title={`${t("customers.newTitle")} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("customers.ownerAdminOnly") || "Solo owner, admin e supervisor possono creare clienti."}
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
                <SEO title={`${t("customers.newTitle")} - MACHINA`} />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href="/customers">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{t("customers.newTitle") || "Nuovo cliente"}</h1>
                            <p className="text-sm text-muted-foreground">
                                {t("customers.newSubtitle") || "Crea un nuovo cliente nel contesto del costruttore attivo."}
                            </p>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                {t("customers.registry") || "Anagrafica cliente"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("customers.nameLabel") || "Nome cliente"} *</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("customers.namePlaceholder") || "Es. Rossi Impianti"} />
                            </div>

                            <div className="space-y-2">
                                <Label>Slug</Label>
                                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="es. rossi-impianti" />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("customers.cityLabel") || "Città"}</Label>
                                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("customers.cityPlaceholder") || "Es. Vicenza"} />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("customers.countryLabel") || "Paese"}</Label>
                                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IT" />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("customers.companyEmail") || "Email aziendale"}</Label>
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@cliente.com" />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("customers.phoneLabel") || "Telefono"}</Label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 ..." />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Status</Label>
                                <select
                                    value={subscriptionStatus}
                                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="trial">trial</option>
                                    <option value="active">active</option>
                                    <option value="suspended">suspended</option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Il cliente è un tenant operativo gestito dal costruttore. Il piano commerciale non si imposta qui.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-orange-200/60 bg-orange-50/40 dark:border-orange-500/20 dark:bg-orange-500/5">
                        <CardContent className="flex items-start gap-3 p-6">
                            <Shield className="mt-0.5 h-5 w-5 text-orange-500" />
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="font-medium text-foreground">Modello consigliato</div>
                                <div>
                                    Dopo la creazione del cliente, il costruttore gestisce gli utenti customer come supervisor o technician e assegna le macchine tramite il registro assegnazioni.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Link href="/customers">
                            <Button variant="outline">{t("common.cancel") || "Annulla"}</Button>
                        </Link>
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {saving ? t("common.saving") || "Salvataggio..." : t("common.create") || "Crea"}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

