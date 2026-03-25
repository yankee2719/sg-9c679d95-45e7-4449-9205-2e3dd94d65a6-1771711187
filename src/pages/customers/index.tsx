import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Factory, Mail, Phone, Plus, Search, Users } from "lucide-react";
import { listCustomers } from "@/services/customerApi";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";

interface CustomerRow {
    id: string;
    name: string | null;
    slug: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    created_at: string | null;
}

function KpiCard({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function CustomersIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < CustomerRow[] > ([]);
    const [search, setSearch] = useState("");

    const userRole = membership?.role ?? "viewer";
    const orgType = organization?.type ?? null;
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = await listCustomers();
                if (!active) return;
                setRows(data as CustomerRow[]);
            } catch (error) {
                console.error("Customers load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        if (!authLoading && orgType === "manufacturer") {
            void load();
        } else if (!authLoading) {
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [authLoading, orgType]);

    useEffect(() => {
        const onFocus = async () => {
            if (orgType !== "manufacturer") return;
            try {
                const data = await listCustomers();
                setRows(data as CustomerRow[]);
            } catch (error) {
                console.error("Customers refresh error:", error);
            }
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [orgType]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) =>
            [row.name, row.slug, row.city, row.country, row.email]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q))
        );
    }, [rows, search]);

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("customers.loading")}</div>
            </MainLayout>
        );
    }

    if (orgType !== "manufacturer") {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">
                    {t("customers.manufacturerOnly")}
                </div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("customers.title")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {t("customers.title")}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {t("customers.subtitle")}
                            </p>
                        </div>

                        {canEdit && (
                            <Link href="/customers/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("customers.new")}
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Building2 className="h-5 w-5" />} title={t("customers.kpi.total")} value={rows.length} />
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title={t("customers.kpi.activePlans")}
                            value={rows.filter((r) => !!r.subscription_plan).length}
                        />
                        <KpiCard
                            icon={<Users className="h-5 w-5" />}
                            title={t("customers.kpi.withEmail")}
                            value={rows.filter((r) => !!r.email).length}
                        />
                        <KpiCard
                            icon={<Mail className="h-5 w-5" />}
                            title={t("customers.kpi.withPhone")}
                            value={rows.filter((r) => !!r.phone).length}
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t("customers.search")}
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState
                                    title={t("customers.notFoundEmpty")}
                                    description={t("customers.notFoundDesc")}
                                    icon={<Building2 className="h-10 w-10" />}
                                    actionLabel={canEdit ? t("customers.createCustomer") : undefined}
                                    actionHref={canEdit ? "/customers/new" : undefined}
                                />
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredRows.map((row) => (
                                        <Link key={row.id} href={`/customers/${row.id}`} className="block">
                                            <div className="rounded-2xl border border-border p-5 transition hover:bg-muted/30">
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-xl font-semibold text-foreground">
                                                            {row.name || t("customers.fallbackTitle")}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {row.slug || "—"}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1 text-sm text-muted-foreground">
                                                        <div>{row.city || "—"} {row.country ? `· ${row.country}` : ""}</div>
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4" />
                                                            {row.email || "—"}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4" />
                                                            {row.phone || "—"}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {row.subscription_plan && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                {row.subscription_plan}
                                                            </span>
                                                        )}
                                                        {row.subscription_status && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                {row.subscription_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}