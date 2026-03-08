import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import {
    LayoutDashboard,
    Factory,
    Wrench,
    ClipboardList,
    CheckSquare,
    QrCode,
    BarChart3,
    ShieldCheck,
    FileText,
    Building2,
    Users,
    Settings,
    Bell,
    LogOut,
    Globe,
} from "lucide-react";

import { ThemeSwitch } from "@/components/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Role = "admin" | "supervisor" | "operator" | "viewer";
type OrgType = "manufacturer" | "customer";

type NavItem = {
    href: string;
    labelKey: string;
    icon: any;
    roles?: Role[];
    orgTypes?: OrgType[];
};

type MainLayoutProps = {
    children: React.ReactNode;
    profile?: {
        full_name?: string | null;
        role?: Role | null;
    } | null;
    organization?: {
        name?: string | null;
        org_type?: OrgType | null;
    } | null;
    notificationCount?: number;
};

export function MainLayout({
    children,
    profile,
    organization,
    notificationCount = 0,
}: MainLayoutProps) {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();

    const role = (profile?.role ?? "viewer") as Role;
    const orgType = (organization?.org_type ?? "customer") as OrgType;

    const navItems: NavItem[] = useMemo(
        () => [
            { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
            { href: "/equipment", labelKey: "nav.equipment", icon: Factory },
            { href: "/maintenance", labelKey: "nav.maintenance", icon: Wrench },
            { href: "/work-orders", labelKey: "nav.workOrders", icon: ClipboardList },
            { href: "/checklists/templates", labelKey: "nav.checklists", icon: CheckSquare },
            { href: "/scanner", labelKey: "nav.scanner", icon: QrCode },
            { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3, roles: ["admin", "supervisor"] },
            { href: "/compliance", labelKey: "nav.compliance", icon: ShieldCheck },
            { href: "/documents", labelKey: "nav.documents", icon: FileText },
            { href: "/plants", labelKey: "nav.plants", icon: Building2 },
            { href: "/users", labelKey: "nav.users", icon: Users, roles: ["admin", "supervisor"] },
            { href: "/settings", labelKey: "nav.settings", icon: Settings, roles: ["admin"] },
        ],
        []
    );

    const filteredItems = navItems.filter((item) => {
        if (item.roles && !item.roles.includes(role)) return false;
        if (item.orgTypes && !item.orgTypes.includes(orgType)) return false;
        return true;
    });

    const orgTypeLabel =
        orgType === "manufacturer" ? t("org.manufacturer") : t("org.customer");

    const currentPageTitle =
        filteredItems.find((item) => router.pathname.startsWith(item.href))?.labelKey ?? "nav.dashboard";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen">
                <aside className="w-[248px] shrink-0 border-r border-border bg-card">
                    <div className="flex h-full flex-col">
                        <div className="border-b border-border px-4 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-[1.75rem] font-extrabold leading-none tracking-tight text-foreground">
                                        MACHINA
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {orgTypeLabel}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-3 py-4">
                            <div className="surface-panel rounded-2xl p-4">
                                <div className="truncate text-base font-semibold text-foreground">
                                    {organization?.name ?? "Organization"}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {orgTypeLabel} · {profile?.role ?? "viewer"}
                                </div>
                            </div>
                        </div>

                        <nav className="flex-1 space-y-1 px-3 pb-4">
                            {filteredItems.map((item) => {
                                const Icon = item.icon;
                                const active =
                                    item.href === "/dashboard"
                                        ? router.pathname === "/dashboard"
                                        : router.pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                                            active
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span className="truncate">{t(item.labelKey)}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
                        <div className="flex items-center justify-between px-6 py-3">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-bold text-foreground">
                                    {t(currentPageTitle)}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {organization?.name ?? "Organization"} · {orgTypeLabel}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="surface-panel flex items-center gap-2 rounded-2xl px-3 py-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as "it" | "en" | "fr" | "es")}
                                        className="bg-transparent text-sm font-medium text-foreground outline-none"
                                        aria-label={t("common.language")}
                                    >
                                        <option value="it">IT</option>
                                        <option value="en">EN</option>
                                        <option value="fr">FR</option>
                                        <option value="es">ES</option>
                                    </select>
                                </div>

                                <ThemeSwitch />

                                <Link
                                    href="/notifications"
                                    className="surface-panel relative flex h-11 w-11 items-center justify-center rounded-2xl"
                                    aria-label={t("common.notifications")}
                                >
                                    <Bell className="h-5 w-5 text-foreground" />
                                    {notificationCount > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                                            {notificationCount > 99 ? "99+" : notificationCount}
                                        </span>
                                    )}
                                </Link>

                                <div className="surface-panel flex items-center gap-3 rounded-2xl px-3 py-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                                        {profile?.full_name
                                            ? profile.full_name
                                                .split(" ")
                                                .map((p) => p[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()
                                            : "U"}
                                    </div>
                                    <div className="hidden sm:block">
                                        <div className="text-sm font-semibold text-foreground">
                                            {profile?.full_name ?? "User"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {profile?.role ?? "viewer"}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="rounded-2xl"
                                    onClick={() => {
                                        localStorage.removeItem("app-language");
                                        router.push("/login");
                                    }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {t("common.logout")}
                                </Button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-6 py-6">{children}</main>
                </div>
            </div>
        </div>
    );
}