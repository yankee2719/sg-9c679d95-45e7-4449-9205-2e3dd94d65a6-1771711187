import { Badge } from "@/components/ui/badge";

interface UserRoleBadgeProps {
    role: string | null | undefined;
}

function normalizeRole(role: string | null | undefined) {
    switch (String(role || "").toLowerCase()) {
        case "owner":
            return "admin";
        case "plant_manager":
            return "supervisor";
        case "viewer":
            return "technician";
        case "admin":
        case "supervisor":
        case "technician":
            return String(role).toLowerCase();
        default:
            return String(role || "").toLowerCase();
    }
}

function getRoleClasses(role: string | null | undefined) {
    switch (normalizeRole(role)) {
        case "admin":
            return "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300";
        case "supervisor":
            return "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300";
        case "technician":
            return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";
        default:
            return "border-border bg-muted text-foreground";
    }
}

function normalizeRoleLabel(role: string | null | undefined) {
    switch (normalizeRole(role)) {
        case "admin":
            return "Admin";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
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

