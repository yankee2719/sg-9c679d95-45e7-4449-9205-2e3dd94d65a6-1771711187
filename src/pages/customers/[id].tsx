import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Factory,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    Users,
    Wrench,
} from "lucide-react";
import { getCustomer, updateCustomer } from "@/services/customerApi";
import { apiFetch } from "@/services/apiClient";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerRow {
    id: string;
    name: string | null;
    slug: string | null;
    type: string | null;
    manufacturer_org_id: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    created_at: string | null;
}

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return value;
    }
}

function KpiCard({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: number | string;
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-3xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function CustomerDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership, organization } = useAuth();
    const { t, language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customer, setCustomer] = useState < CustomerRow | null > (null);
    const [membersCount, setMembersCount] = useState(0);
    const [assignedMachines, setAssignedMachines] = useState(0);

    const userRole = membership?.role ?? "viewer";
    const orgType = organization?.type ?? null;
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!resolvedId || authLoading) return;

            try {
                const customerData = await getCustomer(resolvedId);

                const memberships = await apiFetch < any[] > (
                    `/api/internal/customer-memberships?customerId=${resolvedId}`
                ).catch(() => []);

                const assignments = await apiFetch < any[] > (
                    `/api/internal/customer-assignments?customerId=${resolvedId}`
                ).catch(() => []);

                if (!active) return;

                setCustomer(customerData);
                setMembersCount(Array.isArray(memberships) ? memberships.length : 0);
                setAssignedMachines(Array.isArray(assignments) ? assignments.length : 0);
            } catch (error) {
                console.error(error);
                void router.replace("/customers");
            } finally {
                if (active) setLoading(false);
            }
        };

        if (orgType === "manufacturer") {
            void load();
        } else if (!authLoading) {
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, orgType, router]);

    const handleSave = async () => {
        if (!resolvedId || !customer) return;

        setSaving(true);
        try {
            const updated = await updateCustomer(resolvedId, {
                name: customer.name,
                slug: customer.slug,
                city: customer.city,
                country: customer.country,
                email: customer.email,
                phone: customer.phone,
                subscription_status: customer.subscription_status,
                subscription_plan: customer.subscription_plan,
            });

            setCustomer(updated);
            toast({
                title: t("customers.updated") || "Cliente aggiornato",
                description: updated.name || t("customers.fallbackTitle"),
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("common.error") || "Errore",
                description: error?.message || t("customers.errorUpdate") || "Errore aggiornamento cliente",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("customers.loading")}</div>
            </MainLayout>
        );
    }

    if (orgType !== "manufacturer" || !customer) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("customers.noResults")}</div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${customer.name || t("customers.fallbackTitle")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/customers">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold">
                                    {customer.name || t("customers.fallbackTitle")}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {t("customers.detailTitle") || "Dettaglio cliente"}
                                </p>
                            </div>
                        </div>

                        {canEdit && (
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {saving ? t("common.saving") || "Salvataggio..." : t("common.save") || "Salva"}
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Users className="h-5 w-5" />} title={t("nav.users") || "Utenti"} value={membersCount} />
                        <KpiCard icon={<Shield className="h-5 w-5" />} title={t("customers.kpi.activePlans") || "Piano"} value={customer.subscription_plan || "—"} />
                        <KpiCard icon={<Wrench className="h-5 w-5" />} title={t("customers.machines") || "Macchine"} value={assignedMachines} />
                        <KpiCard icon={<Factory className="h-5 w-5" />} title="Status" value={customer.subscription_status || "—"} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    {t("customers.registry") || "Anagrafica"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {canEdit ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field
                                            label={(t("customers.nameLabel") || "Nome").replace(" *", "")}
                                            value={customer.name}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, name: value } : prev))
                                            }
                                        />
                                        <Field
                                            label="Slug"
                                            value={customer.slug}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, slug: value } : prev))
                                            }
                                        />
                                        <Field
                                            label={t("customers.cityLabel") || "Città"}
                                            value={customer.city}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, city: value } : prev))
                                            }
                                        />
                                        <Field
                                            label={t("customers.countryLabel") || "Paese"}
                                            value={customer.country}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, country: value } : prev))
                                            }
                                        />
                                        <Field
                                            label="Email"
                                            value={customer.email}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, email: value } : prev))
                                            }
                                        />
                                        <Field
                                            label={t("customers.phoneLabel") || "Telefono"}
                                            value={customer.phone}
                                            onChange={(value) =>
                                                setCustomer((prev) => (prev ? { ...prev, phone: value } : prev))
                                            }
                                        />
                                        <Field
                                            label={(t("customers.kpi.activePlans") || "Piano")}
                                            value={customer.subscription_plan}
                                            onChange={(value) =>
                                                setCustomer((prev) =>
                                                    prev ? { ...prev, subscription_plan: value } : prev
                                                )
                                            }
                                        />
                                        <Field
                                            label="Status"
                                            value={customer.subscription_status}
                                            onChange={(value) =>
                                                setCustomer((prev) =>
                                                    prev ? { ...prev, subscription_status: value } : prev
                                                )
                                            }
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <InfoRow label={(t("customers.nameLabel") || "Nome").replace(" *", "")} value={customer.name} />
                                        <InfoRow label="Slug" value={customer.slug} />
                                        <InfoRow label={t("customers.cityLabel") || "Città"} value={customer.city} />
                                        <InfoRow label={t("customers.countryLabel") || "Paese"} value={customer.country} />
                                        <InfoRow label="Email" value={customer.email} />
                                        <InfoRow label={t("customers.phoneLabel") || "Telefono"} value={customer.phone} />
                                        <InfoRow label={t("documents.uploadedAt") || "Creato il"} value={formatDate(customer.created_at, language)} />
                                    </>
                                )}

                                <div className="grid gap-3 pt-2 md:grid-cols-2">
                                    {customer.email && (
                                        <a
                                            href={`mailto:${customer.email}`}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted"
                                        >
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </a>
                                    )}

                                    {customer.phone && (
                                        <a
                                            href={`tel:${customer.phone}`}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted"
                                        >
                                            <Phone className="h-4 w-4" />
                                            {t("customers.phoneLabel") || "Telefono"}
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    {t("customers.quickActions") || "Azioni rapide"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href="/customers">
                                    <Button variant="outline" className="w-full justify-start">
                                        <Building2 className="mr-2 h-4 w-4" />
                                        {t("customers.title") || "Clienti"}
                                    </Button>
                                </Link>
                                <Link href="/assignments">
                                    <Button variant="outline" className="w-full justify-start">
                                        <Wrench className="mr-2 h-4 w-4" />
                                        {t("nav.assignments") || "Assegnazioni"}
                                    </Button>
                                </Link>
                                <Link href="/equipment">
                                    <Button variant="outline" className="w-full justify-start">
                                        <Factory className="mr-2 h-4 w-4" />
                                        {t("nav.equipment") || "Macchine"}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">
                {value || "—"}
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string | null | undefined;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}