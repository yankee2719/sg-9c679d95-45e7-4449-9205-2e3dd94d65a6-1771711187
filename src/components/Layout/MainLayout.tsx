import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData, getNotificationCount } from "@/lib/supabaseHelpers";
import { OfflineStatusBar } from "@/components/Offline/OfflineStatusBar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
    ChevronDown,
    BarChart3,
    ShieldCheck,
    CalendarClock,
    Building2,
    Package,
    ClipboardCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type UserRole = "admin" | "supervisor" | "technician";

interface MainLayoutProps {
    children: React.ReactNode;
    userRole?: UserRole;
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
    const router = useRouter();
    const { t } = useLanguage();
    // Translation helper: if i18n key is missing, return the provided fallback
    const tr = (key: string, fallback: string) => {
        const value = t(key);
        return !value || value === key ? fallback : value;
    };
    const [user, setUser] = useState < { id: string; email?: string } | null > (null);
    const [profile, setProfile] = useState < { full_name?: string; role?: string } | null > (null);
    const [orgType, setOrgType] = useState < string | null > (null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;

                setUser({ id: authUser.id, email: authUser.email });

                const profileData = await getProfileData(authUser.id);
                if (profileData) {
                    setProfile({
                        full_name: profileData.full_name || undefined,
                        role: profileData.role || undefined
                    });

                    // Fetch org type
                    if (profileData.tenant_id) {
                        const { data: org } = await supabase
                            .from("organizations")
                            .select("type")
                            .eq("id", profileData.tenant_id)
                            .single();
                        if (org?.type) setOrgType(org.type);
                    }
                }

                const count = await getNotificationCount(authUser.id);
                setUnreadNotifications(count);

                // Realtime subscription for new notifications
                const channel = supabase
                    .channel(`layout-notif-${authUser.id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "notifications",
                            filter: `user_id=eq.${authUser.id}`,
                        },
                        () => {
                            setUnreadNotifications(prev => prev + 1);
                        }
                    )
                    .subscribe();

                // Cleanup on unmount
                return () => { supabase.removeChannel(channel); };
            } catch (error) {
                console.error("Error loading user:", error);
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    // Navigation items based on role
    const resolveRole = (): UserRole => {
        const raw = (profile?.role as UserRole) || userRole;
        return raw === "admin" || raw === "supervisor" || raw === "technician" ? raw : "technician";
    };

    type NavItemConfig = {
        labelKey?: string;
        fallback: string;
        href: string;
        icon: any;
        roles: UserRole[];
        orgTypes?: Array<"manufacturer" | "customer">;
    };

    const buildNav = (items: NavItemConfig[], role: UserRole, type: string | null) => {
        const org = (type === "manufacturer" || type === "customer") ? type : null;
        return items
            .filter((item) => item.roles.includes(role))
            .filter((item) => !item.orgTypes || (org ? item.orgTypes.includes(org) : false))
            .map((item) => ({
                name: item.labelKey ? tr(item.labelKey, item.fallback) : item.fallback,
                href: item.href,
                icon: item.icon,
            }));
    };

    const currentRole = resolveRole();

    const baseNavConfig: NavItemConfig[] = [
        { labelKey: "nav.dashboard", fallback: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor", "technician"] },
        { labelKey: "nav.equipment", fallback: "Macchine", href: "/equipment", icon: Wrench, roles: ["admin", "supervisor", "technician"] },
        { labelKey: "nav.maintenance", fallback: "Manutenzione", href: "/maintenance", icon: CalendarClock, roles: ["admin", "supervisor", "technician"] },
        { labelKey: "nav.workOrders", fallback: "Ordini di lavoro", href: "/work-orders", icon: ClipboardCheck, roles: ["admin", "supervisor", "technician"] },
        { labelKey: "nav.checklists", fallback: "Checklist", href: "/checklists", icon: ClipboardList, roles: ["admin", "supervisor"] },
        { labelKey: "nav.scanner", fallback: "Scanner", href: "/scanner", icon: QrCode, roles: ["admin", "supervisor", "technician"] },
        { labelKey: "nav.analytics", fallback: "Analytics", href: "/analytics/checklist-executions", icon: BarChart3, roles: ["admin", "supervisor"] },
        { fallback: "Compliance", href: "/compliance", icon: ShieldCheck, roles: ["admin", "supervisor"] },
    ];

    const adminNavConfig: NavItemConfig[] = [
        // Manufacturer org
        { fallback: "Clienti", href: "/customers", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },
        { fallback: "Assegnazioni", href: "/assignments", icon: Package, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },

        // Customer org
        { fallback: "Stabilimenti", href: "/plants", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["customer"] },

        // Shared
        { labelKey: "nav.users", fallback: "Utenti", href: "/admin/users", icon: Users, roles: ["admin", "supervisor"], orgTypes: ["manufacturer", "customer"] },
    ];

    const navigation = buildNav(baseNavConfig, currentRole, orgType);

    const adminNavigation = buildNav(adminNavConfig, currentRole, orgType);
const isActive = (href: string) => {
        if (href === "/dashboard") return router.pathname === "/dashboard";
        return router.pathname.startsWith(href);
    };

    const canAccessAdmin = () => currentRole === "admin" || currentRole === "supervisor";

    const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
        <nav className={`flex ${mobile ? "flex-col" : "flex-col"} gap-1`}>
            {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => mobile && setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </Link>
                );
            })}

            {canAccessAdmin() && (
                <>
                    <div className="my-3 px-4">
                        <div className="h-px bg-border" />
                    </div>
                    <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Gestione
                    </p>
                    {adminNavigation.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => mobile && setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </>
            )}
        </nav>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 hidden lg:flex flex-col border-r border-border/60 bg-card shadow-sm">
                {/* Logo */}
                <div className="p-6 border-b border-border">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                            <Wrench className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-bold text-foreground text-lg">MACHINA</h1>
                            <p className="text-xs text-muted-foreground">{t("nav.maintenance")}</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <NavLinks />
                </div>

                {/* User Section */}
                <div className="p-4 border-t border-border">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
                                <Avatar className="w-10 h-10 bg-primary">
                                    <AvatarFallback className="text-primary-foreground font-semibold">
                                        {getInitials(profile?.full_name || user?.email || "")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {profile?.full_name || user?.email?.split("@")[0] || "User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">{profile?.role || userRole}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/settings" className="flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    {t("nav.settings")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                {t("nav.logout")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-card border-b border-border flex items-center justify-between px-4">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0 bg-card border-border">
                        {/* Mobile Logo */}
                        <div className="p-6 border-b border-border">
                            <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                    <Wrench className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-foreground text-lg">MACHINA</h1>
                                    <p className="text-xs text-muted-foreground">{t("nav.maintenance")}</p>
                                </div>
                            </Link>
                        </div>

                        {/* Mobile Navigation */}
                        <div className="p-4">
                            <NavLinks mobile />
                        </div>

                        {/* Mobile User Section */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="w-10 h-10 bg-primary">
                                    <AvatarFallback className="text-primary-foreground font-semibold">
                                        {getInitials(profile?.full_name || user?.email || "")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {profile?.full_name || user?.email?.split("@")[0] || "User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">{profile?.role || userRole}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push("/settings");
                                    }}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t("nav.settings")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Mobile Logo */}
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-foreground">MACHINA</span>
                </Link>

                {/* Mobile Actions */}
                <div className="flex items-center gap-2">
                    <ThemeSwitch />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground relative"
                        onClick={() => router.push("/notifications")}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadNotifications > 0 && (
                            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </Badge>
                        )}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen">
                {/* Desktop Top Bar */}
                <header className="hidden lg:flex h-16 items-center justify-end gap-4 px-6 border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
                    <ThemeSwitch />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground relative"
                        onClick={() => router.push("/notifications")}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadNotifications > 0 && (
                            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </Badge>
                        )}
                    </Button>
                </header>

                {/* Offline/Sync Status Bar */}
                <OfflineStatusBar />

                {/* Page Content */}
                <div className="p-4 lg:p-8 pt-20 lg:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
