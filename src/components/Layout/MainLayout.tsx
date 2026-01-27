import { ReactNode } from "react";
import { useRouter } from "next/router";
import { 
  LayoutDashboard, 
  QrCode, 
  Wrench, 
  ClipboardList,
  Bell,
  Moon,
  Sun,
  LogOut,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { useTheme } from "@/contexts/ThemeProvider";

interface MainLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "supervisor" | "technician";
}

export function MainLayout({ children, userRole = "admin" }: MainLayoutProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: router.pathname === "/dashboard" },
    { name: "Scanner QR", href: "/scanner", icon: QrCode, active: router.pathname === "/scanner" },
    { name: "Equipaggiamenti", href: "/equipment", icon: Wrench, active: router.pathname.startsWith("/equipment") },
    { name: "Attività", href: "/maintenance", icon: ClipboardList, active: router.pathname.startsWith("/maintenance") },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-80 bg-muted/30 border-r border-border flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Maint Ops</h1>
              <p className="text-xs text-muted-foreground">Sistema Manutenzione</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-primary/10">
              <AvatarFallback className="text-primary font-semibold">MR</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">Marco Rossi</p>
              <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`sidebar-item w-full ${item.active ? "sidebar-item-active" : ""}`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
                {item.active && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5" />
                <span>Tema Chiaro</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                <span>Tema Scuro</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-error hover:text-error hover:bg-error/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Esci</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between p-6">
              <h2 className="text-2xl font-bold text-foreground">
                {navigation.find(n => n.active)?.name || "Dashboard"}
              </h2>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-error text-white text-xs">
                    3
                  </Badge>
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}