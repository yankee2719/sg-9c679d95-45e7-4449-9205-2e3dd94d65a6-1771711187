import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplianceStatusCardProps {
    title?: string;
    value?: string | number;
    description?: string;
}

export default function ComplianceStatusCard({
    title = "Compliance status",
    value = "N/D",
    description = "Modulo temporaneamente semplificato. Da rifinire dopo il consolidamento build/runtime.",
}: ComplianceStatusCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold">{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
