import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export type AllowedRole = "admin" | "supervisor" | "technician";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = "/dashboard" 
}: RoleGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!user?.role) {
      setIsAuthorized(false);
      return;
    }

    const hasPermission = allowedRoles.includes(user.role as AllowedRole);
    setIsAuthorized(hasPermission);

    if (!hasPermission) {
      router.replace(fallbackPath);
    }
  }, [user, loading, isAuthenticated, allowedRoles, fallbackPath, router]);

  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-400">Verifica autorizzazioni...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Accesso Negato</h1>
          <p className="text-slate-400">Non hai i permessi per accedere a questa pagina.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}