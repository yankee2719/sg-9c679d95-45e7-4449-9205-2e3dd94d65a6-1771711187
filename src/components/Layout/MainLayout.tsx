import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    BarChart3,
    Building2,
    ClipboardList,
    FileText,
    Factory,
    Home,
    Layers3,
    LogOut,
    Settings,
    Shield,
    Users,
    Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface MainLayoutProps {
    children: React.ReactNode;
    userRole?: string | null;
}

type NavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
};

export default function MainLayout({
    children,
    userRole = null,
}: MainLayoutProps) {
    const router = useRouter();
    const { organization, membership, signOut, loading } = useAuth();
    const { t } = useLanguage();

    const role = userRole ?? membership?.role ?? "viewer";
    const orgType = organization?.type ?? null;

    const navItems = useMemo < NavItem[] > (() => {
        const base: NavItem[] = [
            { href: "/dashboard", label: t("nav.dashboard"), icon: <Home className="h-4 w-4" /> },
            { href: "/equipment", label: t("nav.equipment"), icon: <Factory className="h-4 w-4" /> },
            { href: "/documents", label: t("nav.documents"), icon: <FileText className="h-4 w-4" /> },
            { href: "/work-orders", label: t("nav.workOrders"), icon: <ClipboardList className="h-4 w-4" /> },
            { href: "/users", label: t("nav.users"), icon: <Users className="h-4 w-4" /> },
        ];

        if (orgType === "manufacturer") {
            base.splice(2, 0, {
                href: "/customers",
                label: t("nav.customers"),
                icon: <Building2 className="h-4 w-4" />,
            });
            base.push({
                href: "/assignments",
                label: t("nav.assignments"),
                icon: <Layers3 className="h-4 w-4" />,
            });
        }

        if (orgType === "customer") {
            base.splice(2, 0, {
                href: "/plants",
                label: t("nav.plants"),
                icon: <Building2 className="h-4 w-4" />,
            });
        }

        if (["owner", "admin", "supervisor"].includes(role)) {
            base.push({
                href: "/settings",
                label: t("nav.settings"),
                icon: <Settings className="h-4 w-4" />,
            });
            base.push({
                href: "/settings/security",
                label: t("nav.security") || t("nav.settings"),
                icon: <Shield className="h-4 w-4" />,
            });
        }

        return base;
    }, [orgType, role, t]);

    // Traduci il tipo di organizzazione
    const orgTypeLabel = useMemo(() => {
        if (!orgType) return "—";
        if (orgType === "manufacturer") return t("org.manufacturer");
        if (orgType === "customer") return t("org.customer");
        return orgType;
    }, [orgType, t]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
                <aside className="hidden border-r border-border bg-card lg:block">
                    <div className="flex h-full flex-col">
                        <div className="border-b border-border px-5 py-5">
                            <div className="text-xl font-bold tracking-tight">MACHINA</div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                {organization?.name || t("activeOrg.fallbackOrganization")}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                                {orgTypeLabel} · {role}
                            </div>
                        </div>

                        <nav className="flex-1 space-y-1 px-3 py-4">
                            {navItems.map((item) => {
                                const active =
                                    router.pathname === item.href ||
                                    (item.href !== "/dashboard" &&
                                        router.pathname.startsWith(item.href));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active
                                            ? "bg-orange-500/10 text-orange-500"
                                            : "text-foreground hover:bg-muted"
                                            }`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-border p-3">
                            <button
                                type="button"
                                onClick={() => void signOut()}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                            >
                                <LogOut className="h-4 w-4" />
                                {t("common.logout")}
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="min-w-0">
                    <header className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-medium">
                                    {organization?.name || "MACHINA"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {orgTypeLabel} · {role}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                {t("org.context")}
                            </div>
                        </div>
                    </header>

                    <div className="min-w-0">{children}</div>
                </main>
            </div>
        </div>
    );
}

// ─── Named re-export: 27 file importano { MainLayout } invece di default ───
export { MainLayout };
