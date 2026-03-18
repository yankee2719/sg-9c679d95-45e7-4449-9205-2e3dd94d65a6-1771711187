import { Badge } from "@/components/ui/badge";

interface UserRoleBadgeProps {
    role: string | null | undefined;
}

function getRoleClasses(role: string | null | undefined) {
    switch (String(role || "").toLowerCase()) {
        case "owner":
            return "border-red-300 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300";
        case "admin":
            return "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300";
        case "supervisor":
            return "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300";
        case "technician":
            return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";
        case "operator":
            return "border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300";
        case "viewer":
            return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";
        default:
            return "border-border bg-muted text-foreground";
    }
}

function normalizeRoleLabel(role: string | null | undefined) {
    const key = String(role || "").toLowerCase();

    switch (key) {
        case "owner":
            return "Owner";
        case "admin":
            return "Admin";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
        case "operator":
            return "Operator";
        case "viewer":
            return "Viewer";
        default:
            return role || "Unknown";
    }
}

export default function UserRoleBadge({ role }: UserRoleBadgeProps) {
    return (
        <Badge className={`border ${getRoleClasses(role)}`}>
            {normalizeRoleLabel(role)}
        </Badge>
    );
}