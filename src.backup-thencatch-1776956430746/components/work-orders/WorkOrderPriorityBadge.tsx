import { Badge } from "@/components/ui/badge";

interface WorkOrderPriorityBadgeProps {
    priority: string | null | undefined;
}

function getPriorityClasses(priority: string | null | undefined) {
    switch (String(priority || "").toLowerCase()) {
        case "low":
            return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";
        case "medium":
            return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";
        case "high":
            return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300";
        case "critical":
            return "border-red-300 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300";
        default:
            return "border-border bg-muted text-foreground";
    }
}

function normalizePriorityLabel(priority: string | null | undefined) {
    const key = String(priority || "").toLowerCase();

    switch (key) {
        case "low":
            return "Low";
        case "medium":
            return "Medium";
        case "high":
            return "High";
        case "critical":
            return "Critical";
        default:
            return priority || "Unknown";
    }
}

export default function WorkOrderPriorityBadge({
    priority,
}: WorkOrderPriorityBadgeProps) {
    return (
        <Badge className={`border ${getPriorityClasses(priority)}`}>
            {normalizePriorityLabel(priority)}
        </Badge>
    );
}