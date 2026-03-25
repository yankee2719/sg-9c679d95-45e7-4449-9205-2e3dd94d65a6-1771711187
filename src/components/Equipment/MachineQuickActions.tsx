import Link from "next/link";
import {
    ClipboardList,
    FileText,
    QrCode,
    Settings2,
    ShieldCheck,
    Wrench,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MachineQuickActionsProps {
    machineId: string;
    canEdit?: boolean;
}

export default function MachineQuickActions({
    machineId,
    canEdit = false,
}: MachineQuickActionsProps) {
    const { t } = useLanguage();

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>{t("equipment.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Button variant="outline" asChild className="justify-start">
                    <Link href={`/equipment/${machineId}/maintenance`}>
                        <Wrench className="mr-2 h-4 w-4" />
                        {t("equipment.openMaintenance")}
                    </Link>
                </Button>

                <Button variant="outline" asChild className="justify-start">
                    <a href="#machine-documents">
                        <FileText className="mr-2 h-4 w-4" />
                        {t("equipment.openDocuments")}
                    </a>
                </Button>

                <Button variant="outline" asChild className="justify-start">
                    <a href="#machine-timeline">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        {t("equipment.openTimeline")}
                    </a>
                </Button>

                <Button variant="outline" asChild className="justify-start">
                    <Link href="/scanner">
                        <QrCode className="mr-2 h-4 w-4" />
                        {t("equipment.qrScanner")}
                    </Link>
                </Button>

                {canEdit && (
                    <>
                        <Button variant="outline" asChild className="justify-start">
                            <Link href="/settings/security">
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                {t("equipment.checkSecurity")}
                            </Link>
                        </Button>

                        <Button variant="outline" asChild className="justify-start">
                            <Link href="/equipment">
                                <Settings2 className="mr-2 h-4 w-4" />
                                {t("equipment.manageList")}
                            </Link>
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
