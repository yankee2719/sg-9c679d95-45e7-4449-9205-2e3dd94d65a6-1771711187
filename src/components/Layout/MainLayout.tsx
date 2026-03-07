// src/components/Layout/MainLayout.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData, getNotificationCount } from "@/lib/supabaseHelpers";
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
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
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
    CalendarClock,
    Building2,
    Factory,
    Package,
    FileText,
    ShieldCheck,
    CheckSquare,
} from "lucide-react";

type UserRole = "admin" | "supervisor" | "technician" | string;

interface MainLayoutProps {
    children: React.ReactNode;
    userRole?: UserRole;
}

interface NavItem {
    href: string;
    label: string;
    icon: any;
    roles?: string[];
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
    const router = useRouter();

    const [profileName, setProfileName] = useState("User");
    const [profileRole, setProfileRole] = useState < string > (userRole);
    const [notificationCount, setNotificationCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loadingHeader, setLoadingHeader] = useState(true);

    useEffect(() => {
        const loadHeaderData = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setLoadingHeader(false);
                    return;
                }

                const [profile, notifCount] = await Promise.all([
                    getProfileData(user.id),
                    getNotificationCount(user.id),
                ]);

                setProfileName(profile?.full_name || user.email?.split("@")[0] || "User");
                setProfileRole(profile?.role || userRole || "technician");
                setNotificationCount(notifCount || 0);
            } catch (error) {
                console.error("MainLayout load error:", error);
            } finally {
                setLoadingHeader(false);
            }
        };

        loadHeaderData();
    }, [userRole]);

    const initials = useMemo(() => {
        const parts = (profileName || "User")
            .split(" ")
            .map((p) => p.trim())
            .filter(Boolean);

        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }, [profileName]);

    const navItems: NavItem[] = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/equipment", label: "Macchine", icon: Factory },
        { href: "/documents", label: "Documenti", icon: FileText },
        { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
        { href: "/checklists/templates", label: "Checklist", icon: CheckSquare },
        { href: "/plants", label: "Stabilimenti", icon: Building2, roles: ["admin", "supervisor"] },
        { href: "/maintenance", label: "Manutenzione", icon: Wrench },
        { href: "/compliance", label: "Compliance", icon: ShieldCheck },
        { href: "/qr", label: "QR", icon: QrCode },
        { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "supervisor"] },
        { href: "/users", label: "Utenti", icon: Users, roles: ["admin", "supervisor"] },
        { href: "/settings/organization", label: "Organizzazione attiva", icon: Package },
        { href: "/settings", label: "Impostazioni", icon: Settings },
    ];

    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(profileRole);
    });

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const NavContent = () => (
        <div className="flex h-full flex-col">
            <div className="border-b border-border px-4 py-4">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                        <Factory className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">MACHINA</div>
                        <div className="truncate text-xs text-muted-foreground">
                            Industrial asset management
                        </div>
                    </div>
                </Link>
            </div>

            <div className="px-4 py-4">
                <OrganizationSwitcher />
            </div>

            <nav className="flex-1 space-y-1 px-3 pb-4">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                        router.pathname === item.href ||
                        (item.href !== "/dashboard" && router.pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                                active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border p-3">
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start rounded-xl"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Esci
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen">
                <aside className="hidden w-72 border-r border-border bg-card lg:block">
                    <NavContent />
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
                        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
                            <div className="flex items-center gap-3">
                                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="lg:hidden">
                                            <Menu className="h-5 w-5" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-80 p-0">
                                        <NavContent />
                                    </SheetContent>
                                </Sheet>

                                <div>
                                    <div className="text-sm font-semibold">MACHINA</div>
                                    <div className="text-xs text-muted-foreground">
                                        Gestione documentazione e macchine industriali
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    {notificationCount > 0 && (
                                        <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
                                            {notificationCount > 99 ? "99+" : notificationCount}
                                        </Badge>
                                    )}
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="hidden text-left sm:block">
                                                <div className="max-w-[160px] truncate text-sm font-medium">
                                                    {loadingHeader ? "..." : profileName}
                                                </div>
                                                <div className="text-xs capitalize text-muted-foreground">
                                                    {loadingHeader ? "..." : profileRole}
                                                </div>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                        <div className="px-2 py-2">
                                            <div className="text-sm font-medium">{profileName}</div>
                                            <div className="text-xs capitalize text-muted-foreground">
                                                {profileRole}
                                            </div>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/settings/organization">Organizzazione attiva</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/settings">Impostazioni</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Esci
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="min-h-0 flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default MainLayout;
