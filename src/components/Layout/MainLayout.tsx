import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
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
  CalendarClock
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type UserRole = "admin" | "supervisor" | "technician";

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

interface ProfileData {
  full_name: string | null;
  role: string | null;
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string; role?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        
        setUser({ id: authUser.id, email: authUser.email });
        
        // Use raw query with explicit type casting to avoid deep type instantiation
        const profileResult = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", authUser.id)
          .maybeSingle() as unknown as { data: ProfileData | null; error: Error | null };
        
        if (!profileResult.error && profileResult.data) {
          setProfile({
            full_name: profileResult.data.full_name || undefined,
            role: profileResult.data.role || undefined
          });
        }

        // Get unread notifications count with explicit type casting
        const notifResult = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("read", false) as unknown as { count: number | null };
        
        setUnreadNotifications(notifResult.count || 0);
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

  const navigation = [
    { name: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("nav.equipment"), href: "/equipment", icon: Wrench },
    { name: t("nav.maintenance"), href: "/maintenance", icon: CalendarClock },
    { name: t("nav.checklists"), href: "/checklists", icon: ClipboardList },
    { name: t("nav.scanner"), href: "/scanner", icon: QrCode },
    { name: t("nav.analytics"), href: "/analytics/checklist-executions", icon: BarChart3 },
  ];

  const adminNavigation = [
    { name: t("nav.users"), href: "/admin/users", icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return router.pathname === "/dashboard";
    return router.pathname.startsWith(href);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={`flex ${mobile ? "flex-col" : "flex-col"} gap-1`}>
      {navigation.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-[#FF6B35] text-white shadow-lg shadow-orange-500/25"
                : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        );
      })}

      {(userRole === "admin" || userRole === "supervisor") && (
        <>
          <div className="my-3 px-4">
            <div className="h-px bg-slate-700/50" />
          </div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t("nav.users")}
          </p>
          {adminNavigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => mobile && setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#FF6B35] text-white shadow-lg shadow-orange-500/25"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 hidden lg:flex flex-col border-r border-slate-800/50 bg-slate-900/95 backdrop-blur-xl">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/50">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#FF8C61] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Maint Ops</h1>
              <p className="text-xs text-slate-500">{t("nav.maintenance")}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600">
                  <AvatarFallback className="text-white font-semibold">
                    {getInitials(profile?.full_name || user?.email || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{profile?.role || userRole}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
              <DropdownMenuItem asChild className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer">
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {t("nav.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-slate-800">
            {/* Mobile Logo */}
            <div className="p-6 border-b border-slate-800/50">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#FF8C61] rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-white text-lg">Maint Ops</h1>
                  <p className="text-xs text-slate-500">{t("nav.maintenance")}</p>
                </div>
              </Link>
            </div>

            {/* Mobile Navigation */}
            <div className="p-4">
              <NavLinks mobile />
            </div>

            {/* Mobile User Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/50">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600">
                  <AvatarFallback className="text-white font-semibold">
                    {getInitials(profile?.full_name || user?.email || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{profile?.role || userRole}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
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
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
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
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FF8C61] rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Maint Ops</span>
        </Link>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-300 hover:text-white hover:bg-slate-800 relative"
            onClick={() => router.push("/notifications")}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-16 items-center justify-end gap-4 px-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-30">
          <ThemeSwitch />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-300 hover:text-white hover:bg-slate-800 relative"
            onClick={() => router.push("/notifications")}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Badge>
            )}
          </Button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}