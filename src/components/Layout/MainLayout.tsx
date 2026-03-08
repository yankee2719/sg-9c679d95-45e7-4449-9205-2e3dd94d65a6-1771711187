import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getNotificationCount, getUserContext } from "@/lib/supabaseHelpers";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { ThemeSwitch } from "@/components/ThemeSwitch";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type UserRole = "admin" | "supervisor" | "technician" | string;
type OrgType = "manufacturer" | "customer" | null;

interface MainLayoutProps {
    children: React.ReactNode;
    userRole?: UserRole;
}

interface NavItem {
    href: string;
    label: string;
    icon: any;
    roles?: string[];
    orgTypes?: Array<"manufacturer" | "customer">;
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileName, setProfileName] = useState("Utente");
    const [profileRole, setProfileRole] = useState<string>(userRole);
    const [orgType, setOrgType] = useState<OrgType>(null);
    const [orgName, setOrgName] = useState("Organizzazione");
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const loadHeader = async () => {
            try {
                const ctx = await getUserContext();
                if (ctx?.displayName) setProfileName(ctx.displayName);
                if (ctx?.role) setProfileRole(ctx.role);
                if (ctx?.orgType) setOrgType(ctx.orgType as OrgType);

                if (ctx?.orgId) {
                    const { data: org } = await supabase.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle();
                    setOrgName((org as any)?.name ?? "Organizzazione");
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const notif = await getNotificationCount(user.id);
                    setNotificationCount(notif || 0);
                }
            } catch (error) {
                console.error("MainLayout loadHeader error:", error);
            }
        };

        loadHeader();
    }, [userRole, router.asPath]);

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
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/equipment", label: "Macchine", icon: Factory },
        { href: "/maintenance", label: "Manutenzione", icon: Wrench },
        { href: "/work-orders", label: "Ordini di lavoro", icon: ClipboardList },
        { href: "/checklists/templates", label: "Checklist", icon: CheckSquare },
        { href: "/scanner", label: "Scanner QR", icon: QrCode },
        { href: "/analytics", label: "Analisi", icon: BarChart3, roles: ["admin", "supervisor"] },
        { href: "/compliance", label: "Compliance", icon: ShieldCheck },
        { href: "/documents", label: "Documenti", icon: FileText },
        { href: "/plants", label: "Stabilimenti", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["customer"] },
        { href: "/users", label: "Utenti", icon: Users, roles: ["admin", "supervisor"] },
        { href: "/customers", label: "Clienti", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },
        { href: "/assignments", label: "Assegnazioni", icon: Layers3, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },
        { href: "/settings/organization", label: "Organizzazione attiva", icon: Package },
        { href: "/settings", label: "Impostazioni", icon: Settings },
    ];

    const filteredNavItems = navItems.filter((item) => {
        const roleOk = !item.roles || item.roles.includes(profileRole);
        const orgOk = !item.orgTypes || (orgType ? item.orgTypes.includes(orgType) : true);
        return roleOk && orgOk;
    });

    const mainItems = filteredNavItems.filter((item) => !["/customers", "/assignments", "/users", "/settings", "/settings/organization"].includes(item.href));
    const managementItems = filteredNavItems.filter((item) => ["/customers", "/assignments", "/users"].includes(item.href));
    const settingsItems = filteredNavItems.filter((item) => ["/settings/organization", "/settings"].includes(item.href));

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const isActive = (href: string) => router.pathname === href || (href !== "/dashboard" && router.pathname.startsWith(href));

    const NavLink = ({ href, label, icon: Icon }: NavItem) => (
        <Link
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-all",
                isActive(href) ? "bg-orange-500 text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.9)]" : "text-foreground/75 hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
        </Link>
    );

    const SideContent = () => (
        <div className="flex h-full flex-col border-r border-border bg-card text-card-foreground">
            <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-lg">
                        <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[1.7rem] leading-none font-bold tracking-[-0.03em]">MACHINA</div>
                        <div className="truncate text-sm text-muted-foreground">
                            {orgType === "manufacturer" ? "Costruttore" : orgType === "customer" ? "Utilizzatore finale" : "Piattaforma"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4">
                <div className="rounded-2xl border border-border bg-muted/35 p-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)]">
                    <OrganizationSwitcher />
                </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">{mainItems.map((item) => <NavLink key={item.href} {...item} />)}</div>

                {managementItems.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gestione</div>
                        {managementItems.map((item) => <NavLink key={item.href} {...item} />)}
                    </div>
                )}

                {settingsItems.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sistema</div>
                        {settingsItems.map((item) => <NavLink key={item.href} {...item} />)}
                    </div>
                )}
            </div>

            <div className="border-t border-border p-4">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground">
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span>Esci</span>
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
                                <button className="rounded-xl p-2 text-foreground transition hover:bg-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
                                    <Menu className="h-5 w-5" />
                                </button>
                                <div>
                                    <div className="text-[15px] font-semibold text-foreground">{router.pathname === "/dashboard" ? "Dashboard" : orgName}</div>
                                    <div className="text-sm text-muted-foreground">{orgName}{orgType ? ` · ${orgType === "manufacturer" ? "Costruttore" : "Customer"}` : ""}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <ThemeSwitch />

                                <Link href="/notifications" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)] transition hover:bg-muted">
                                    <Bell className="h-5 w-5" />
                                    {notificationCount > 0 && (
                                        <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-orange-500 px-1 text-[10px] text-white hover:bg-orange-500">
                                            {notificationCount > 99 ? "99+" : notificationCount}
                                        </Badge>
                                    )}
                                </Link>

                                <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.24)] md:flex">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted font-semibold text-foreground">{initials}</div>
                                    <div className="max-w-[180px] min-w-0">
                                        <div className="truncate text-[15px] font-semibold text-foreground">{profileName}</div>
                                        <div className="truncate text-sm text-muted-foreground">{profileRole}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1">{children}</main>
                </div>
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/45" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-[272px] bg-card shadow-2xl">
                        <button className="absolute right-3 top-3 rounded-xl p-2 text-foreground transition hover:bg-muted" onClick={() => setSidebarOpen(false)}>
                            <X className="h-5 w-5" />
                        </button>
                        <SideContent />
                    </div>
                </div>
            )}
        </div>
    );
}

export default MainLayout;
