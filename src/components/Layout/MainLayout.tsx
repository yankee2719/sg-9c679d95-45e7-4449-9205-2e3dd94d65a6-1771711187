import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import GlobalSearchLauncher from "@/components/search/GlobalSearchLauncher";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/notificationService";
import {
    LayoutDashboard,
    Wrench,
    ClipboardList,
    Settings,
    LogOut,
    Menu,
    Bell,
    Users,
    QrCode,
    BarChart3,
    Building2,
    Factory,
    FileText,
    ShieldCheck,
    CheckSquare,
    Package,
    Layers3,
    X,
    Globe,
} from "lucide-react";

type UserRole = "owner" | "admin" | "supervisor" | "technician" | "operator" | "viewer" | string;
type OrgType = "manufacturer" | "customer" | null;

interface MainLayoutProps {
    children: React.ReactNode;
    userRole?: UserRole;
}

interface NavItem {
    href: string;
    labelKey: string;
    fallbackLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
    orgTypes?: Array<"manufacturer" | "customer">;
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();
    const { profile, organization, membership, user, signOut } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    const tx = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };

    const profileName =
        profile?.display_name?.trim() ||
        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
        user?.email?.split("@")[0] ||
        "Utente";

    const profileRole = (membership?.role as string | null) ?? userRole;
    const orgType = ((organization?.type as OrgType | undefined) ?? null) as OrgType;
    const orgName = organization?.name ?? "Organizzazione";

    useEffect(() => {
        let active = true;
        let channel: any = null;

        const syncUnreadCount = async () => {
            if (!user?.id) {
                if (active) setNotificationCount(0);
                return;
            }

            try {
                const unread = await notificationService.getUnreadCount(user.id);
                if (active) setNotificationCount(unread || 0);
            } catch (error) {
                console.error("MainLayout notification sync error:", error);
            }
        };

        const handleNotificationUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ unreadCount?: number }>;
            if (!active) return;

            if (typeof customEvent.detail?.unreadCount === "number") {
                setNotificationCount(Math.max(0, customEvent.detail.unreadCount));
                return;
            }

            void syncUnreadCount();
        };

        void syncUnreadCount();

        if (user?.id) {
            channel = notificationService.subscribeToMyNotifications(user.id, () => {
                void syncUnreadCount();
            });
        }

        window.addEventListener(
            "machina:notifications-updated",
            handleNotificationUpdate as EventListener
        );

        return () => {
            active = false;
            window.removeEventListener(
                "machina:notifications-updated",
                handleNotificationUpdate as EventListener
            );
            if (channel) notificationService.unsubscribe(channel);
        };
    }, [user?.id]);

    const initials = useMemo(() => {
        const parts = (profileName || "Utente")
            .split(" ")
            .map((p) => p.trim())
            .filter(Boolean);

        if (parts.length === 0) return "U";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }, [profileName]);

    const navItems: NavItem[] = [
        {
            href: "/dashboard",
            labelKey: "nav.dashboard",
            fallbackLabel: "Dashboard",
            icon: LayoutDashboard,
        },
        {
            href: "/equipment",
            labelKey: "nav.equipment",
            fallbackLabel: "Macchine",
            icon: Factory,
        },
        {
            href: "/maintenance",
            labelKey: "nav.maintenance",
            fallbackLabel: "Maintenance",
            icon: Wrench,
        },
        {
            href: "/work-orders",
            labelKey: "nav.workOrders",
            fallbackLabel: "Work Orders",
            icon: ClipboardList,
        },
        {
            href: "/checklists/templates",
            labelKey: "nav.checklists",
            fallbackLabel: "Checklist",
            icon: CheckSquare,
        },
        {
            href: "/scanner",
            labelKey: "nav.scanner",
            fallbackLabel: "Scanner",
            icon: QrCode,
        },
        {
            href: "/analytics",
            labelKey: "nav.analytics",
            fallbackLabel: "Analytics",
            icon: BarChart3,
            roles: ["owner", "admin", "supervisor"],
        },
        {
            href: "/compliance",
            labelKey: "nav.compliance",
            fallbackLabel: "Compliance",
            icon: ShieldCheck,
        },
        {
            href: "/documents",
            labelKey: "nav.documents",
            fallbackLabel: "Documenti",
            icon: FileText,
        },
        {
            href: "/plants",
            labelKey: "nav.plants",
            fallbackLabel: "Stabilimenti",
            icon: Building2,
            roles: ["owner", "admin", "supervisor"],
            orgTypes: ["customer"],
        },
        {
            href: "/users",
            labelKey: "nav.users",
            fallbackLabel: "Utenti",
            icon: Users,
            roles: ["owner", "admin", "supervisor"],
        },
        {
            href: "/customers",
            labelKey: "nav.customers",
            fallbackLabel: "Clienti",
            icon: Building2,
            roles: ["owner", "admin", "supervisor"],
            orgTypes: ["manufacturer"],
        },
        {
            href: "/assignments",
            labelKey: "nav.assignments",
            fallbackLabel: "Assegnazioni",
            icon: Layers3,
            roles: ["owner", "admin", "supervisor"],
            orgTypes: ["manufacturer"],
        },
        {
            href: "/settings/organization",
            labelKey: "nav.activeOrganization",
            fallbackLabel: "Organizzazione attiva",
            icon: Package,
        },
        {
            href: "/settings",
            labelKey: "nav.settings",
            fallbackLabel: "Impostazioni",
            icon: Settings,
        },
    ];

    const filteredNavItems = navItems.filter((item) => {
        const roleOk = !item.roles || item.roles.includes(profileRole);
        const orgOk = !item.orgTypes || (orgType ? item.orgTypes.includes(orgType) : true);
        return roleOk && orgOk;
    });

    const mainItems = filteredNavItems.filter(
        (item) =>
            ![
                "/customers",
                "/assignments",
                "/users",
                "/settings",
                "/settings/organization",
            ].includes(item.href)
    );

    const managementItems = filteredNavItems.filter((item) =>
        ["/customers", "/assignments", "/users"].includes(item.href)
    );

    const settingsItems = filteredNavItems.filter((item) =>
        ["/settings/organization", "/settings"].includes(item.href)
    );

    const handleLogout = async () => {
        try {
            await signOut();
            void router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const isActive = (href: string) =>
        router.pathname === href ||
        (href !== "/dashboard" && router.pathname.startsWith(href));

    const getOrgTypeLabel = () => {
        if (orgType === "manufacturer") return "Costruttore";
        if (orgType === "customer") return "Cliente finale";
        return "Contesto";
    };

    const getCurrentPageLabel = () => {
        const exactMatch = filteredNavItems.find((item) => item.href === router.pathname);
        if (exactMatch) return tx(exactMatch.labelKey, exactMatch.fallbackLabel);

        const startsWithMatch = filteredNavItems.find(
            (item) => item.href !== "/dashboard" && router.pathname.startsWith(item.href)
        );

        return startsWithMatch
            ? tx(startsWithMatch.labelKey, startsWithMatch.fallbackLabel)
            : "Dashboard";
    };

    const NavLink = ({ href, labelKey, fallbackLabel, icon: Icon }: NavItem) => (
        <Link
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-all",
                isActive(href)
                    ? "bg-orange-500 text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.9)]"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{tx(labelKey, fallbackLabel)}</span>
        </Link>
    );

    const SideContent = () => (
        <div className="flex h-full flex-col border-r border-border bg-card text-card-foreground">
            <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 shadow-lg">
                        <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[1.45rem] leading-none font-bold tracking-tight text-foreground">
                            MACHINA
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                            {getOrgTypeLabel()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4">
                <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.2)]">
                    <OrganizationSwitcher />
                </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                    {mainItems.map((item) => (
                        <NavLink key={item.href} {...item} />
                    ))}
                </div>

                {managementItems.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Gestione
                        </div>
                        {managementItems.map((item) => (
                            <NavLink key={item.href} {...item} />
                        ))}
                    </div>
                )}

                {settingsItems.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Sistema
                        </div>
                        {settingsItems.map((item) => (
                            <NavLink key={item.href} {...item} />
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-border p-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground"
                    type="button"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen">
                <aside className="hidden w-[272px] shrink-0 lg:block">
                    <div className="sticky top-0 h-screen">
                        <SideContent />
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
                        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
                            <div className="flex items-center gap-3">
                                <button
                                    className="rounded-xl p-2 text-foreground transition hover:bg-muted lg:hidden"
                                    onClick={() => setSidebarOpen(true)}
                                    type="button"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>

                                <div>
                                    <div className="text-lg font-semibold">
                                        {getCurrentPageLabel()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {orgName} · {getOrgTypeLabel()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden xl:block">
                                    <GlobalSearchLauncher />
                                </div>

                                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)]">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as Language)}
                                        aria-label="Lingua"
                                        className="rounded-md bg-card text-sm font-medium text-foreground outline-none"
                                    >
                                        <option value="it" className="bg-card text-foreground">
                                            IT
                                        </option>
                                        <option value="en" className="bg-card text-foreground">
                                            EN
                                        </option>
                                        <option value="fr" className="bg-card text-foreground">
                                            FR
                                        </option>
                                        <option value="es" className="bg-card text-foreground">
                                            ES
                                        </option>
                                    </select>
                                </div>

                                <ThemeSwitch />

                                <Link
                                    href="/notifications"
                                    className="relative rounded-2xl border border-border bg-card p-2.5 text-foreground shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)] transition hover:bg-muted"
                                    aria-label="Notifiche"
                                >
                                    <Bell className="h-5 w-5" />
                                    {notificationCount > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                                            {notificationCount > 99 ? "99+" : notificationCount}
                                        </span>
                                    )}
                                </Link>

                                <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)] md:flex">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="max-w-[180px] truncate text-sm font-semibold">
                                            {profileName}
                                        </div>
                                        <div className="text-xs capitalize text-muted-foreground">
                                            {profileRole}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 pb-4 xl:hidden lg:px-8">
                            <GlobalSearchLauncher />
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 bg-background">{children}</main>
                </div>
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="absolute inset-y-0 left-0 w-[272px] shadow-2xl">
                        <button
                            className="absolute right-3 top-3 z-10 rounded-xl border border-border bg-card p-2 text-foreground"
                            onClick={() => setSidebarOpen(false)}
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <SideContent />
                    </div>
                </div>
            )}
        </div>
    );
}

export default MainLayout;