import { Badge } from "@/components/ui/badge";

interface WorkOrderStatusBadgeProps {
    status: string | null | undefined;
}

function getStatusClasses(status: string | null | undefined) {
    switch (String(status || "").toLowerCase()) {
        case "draft":
            return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";
        case "scheduled":
            return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";
        case "in_progress":
        case "in-progress":
            return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300";
        case "pending_review":
            return "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300";
        case "completed":
        case "closed":
            return "border-green-300 bg-green-100 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300";
        case "cancelled":
            return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";
        default:
            return "border-border bg-muted text-foreground";
    }
}

function normalizeStatusLabel(status: string | null | undefined) {
    const key = String(status || "").toLowerCase();

    switch (key) {
        case "draft":
            return "Draft";
        case "scheduled":
            return "Scheduled";
        case "in_progress":
        case "in-progress":
            return "In progress";
        case "pending_review":
            return "Pending review";
        case "completed":
            return "Completed";
        case "closed":
            return "Closed";
        case "cancelled":
            return "Cancelled";
        default:
            return status || "Unknown";
    }
}

export default function WorkOrderStatusBadge({
    status,
}: WorkOrderStatusBadgeProps) {
    return (
        <Badge className={`border ${getStatusClasses(status)}`}>
            {normalizeStatusLabel(status)}
        </Badge>
    );
}