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

    const role = userRole ?? membership?.role ?? "viewer";
    const orgType = organization?.type ?? null;

    const navItems = useMemo < NavItem[] > (() => {
        const base: NavItem[] = [
            { href: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
            { href: "/equipment", label: "Macchine", icon: <Factory className="h-4 w-4" /> },
            { href: "/documents", label: "Documenti", icon: <FileText className="h-4 w-4" /> },
            { href: "/work-orders", label: "Work Orders", icon: <ClipboardList className="h-4 w-4" /> },
            { href: "/users", label: "Utenti", icon: <Users className="h-4 w-4" /> },
        ];

        if (orgType === "manufacturer") {
            base.splice(2, 0, {
                href: "/customers",
                label: "Clienti",
                icon: <Building2 className="h-4 w-4" />,
            });
            base.push({
                href: "/assignments",
                label: "Assegnazioni",
                icon: <Layers3 className="h-4 w-4" />,
            });
        }

        if (orgType === "customer") {
            base.splice(2, 0, {
                href: "/plants",
                label: "Stabilimenti",
                icon: <Building2 className="h-4 w-4" />,
            });
        }

        if (["owner", "admin", "supervisor"].includes(role)) {
            base.push({
                href: "/settings",
                label: "Impostazioni",
                icon: <Settings className="h-4 w-4" />,
            });
            base.push({
                href: "/settings/security",
                label: "Sicurezza",
                icon: <Shield className="h-4 w-4" />,
            });
        }

        return base;
    }, [orgType, role]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Caricamento layout...
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
                                {organization?.name || "Nessuna organizzazione"}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                                {organization?.type || "—"} · {role}
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
                                Esci
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
                                    {organization?.type || "—"} · {role}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                Layout leggero
                            </div>
                        </div>
                    </header>

                    <div className="min-w-0">{children}</div>
                </main>
            </div>
        </div>
    );
}