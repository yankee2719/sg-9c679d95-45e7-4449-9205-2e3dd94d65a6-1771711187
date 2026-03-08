import { useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Camera, Keyboard, QrCode, Search } from "lucide-react";

interface ScanHistory {
    id: string;
    code: string;
    equipmentName: string;
    timestamp: string;
}

function resolveScanTarget(code: string): string {
    const normalized = code.trim();

    if (/^https?:\/\//i.test(normalized)) {
        try {
            const url = new URL(normalized);
            const tokenMatch = url.pathname.match(/\/scan\/([^/]+)$/i);
            if (tokenMatch?.[1]) return `/scan/${tokenMatch[1]}`;
        } catch {
            // Fall through to direct parsing.
        }
    }

    if (normalized.startsWith("/scan/")) {
        return normalized;
    }

    if (/^EQ-/i.test(normalized)) {
        return `/equipment/${normalized.replace(/^EQ-/i, "")}`;
    }

    if (/^[A-Z0-9]{8}\.[A-Z0-9]{8,}$/i.test(normalized) || normalized.includes(".")) {
        return `/scan/${normalized}`;
    }

    return `/equipment/${normalized}`;
}

export default function ScannerPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState < "scanner" | "manual" > ("scanner");
    const [manualCode, setManualCode] = useState("");
    const [scanHistory, setScanHistory] = useState < ScanHistory[] > ([]);

    const handleScan = (code: string) => {
        const target = resolveScanTarget(code);

        const newScan: ScanHistory = {
            id: Date.now().toString(),
            code,
            equipmentName: code,
            timestamp: new Date().toISOString(),
        };

        setScanHistory((prev) => [newScan, ...prev].slice(0, 10));
        router.push(target);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) handleScan(manualCode.trim());
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return t("scanner.now");
        if (diffMins < 60) return `${diffMins}m ${t("common.ago")}`;
        if (diffHours < 24) return `${diffHours}h ${t("common.ago")}`;
        return past.toLocaleDateString();
    };

    const pageTitle = t("scanner.title");
    const pageSubtitle = t("scanner.subtitle");
    const scanQRText = t("scanner.scanQR");
    const manualEntryText = t("scanner.manualEntry");
    const frameQRText = t("scanner.frameQR");
    const positionQRText = t("scanner.positionQR");
    const frameWellText = t("scanner.frameWell");
    const keepCenteredText = t("scanner.keepCentered");
    const goodLightText = t("scanner.goodLight");
    const ensureLightText = t("scanner.ensureLight");
    const rightDistanceText = t("scanner.rightDistance");
    const notTooCloseText = t("scanner.notTooClose");
    const manualEntryTitle = t("scanner.manualEntryTitle");
    const manualEntryDesc = t("scanner.manualEntryDesc");
    const equipmentCodeLabel = t("scanner.equipmentCode");
    const searchEquipmentText = t("scanner.searchEquipment");
    const acceptedFormatsText = t("scanner.acceptedFormats");
    const recentScansText = t("scanner.recentScans");
    const noRecentScansText = t("scanner.noRecentScans");

    return (
        <>
            <SEO title={`${pageTitle} - Maint Ops`} />

            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold text-foreground">{pageTitle}</h1>
                        <p className="text-muted-foreground">{pageSubtitle}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Button
                                onClick={() => setActiveTab("scanner")}
                                variant={activeTab === "scanner" ? "default" : "outline"}
                                className="h-14 rounded-2xl font-semibold"
                            >
                                <QrCode className="mr-2 h-5 w-5" />
                                {scanQRText}
                            </Button>

                            <Button
                                onClick={() => setActiveTab("manual")}
                                variant={activeTab === "manual" ? "default" : "outline"}
                                className="h-14 rounded-2xl font-semibold"
                            >
                                <Keyboard className="mr-2 h-5 w-5" />
                                {manualEntryText}
                            </Button>
                        </div>

                        {activeTab === "scanner" && (
                            <Card className="mx-auto max-w-2xl rounded-3xl border-border bg-card shadow-sm">
                                <CardContent className="space-y-6 p-8">
                                    <div className="overflow-hidden rounded-3xl border border-border bg-muted/30">
                                        <QRCodeScanner onScan={handleScan} onClose={() => router.push("/dashboard")} />
                                    </div>

                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-foreground">{frameQRText}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{positionQRText}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Camera className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{frameWellText}</p>
                                            <p className="text-xs text-muted-foreground">{keepCenteredText}</p>
                                        </div>

                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <QrCode className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{goodLightText}</p>
                                            <p className="text-xs text-muted-foreground">{ensureLightText}</p>
                                        </div>

                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Search className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{rightDistanceText}</p>
                                            <p className="text-xs text-muted-foreground">{notTooCloseText}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "manual" && (
                            <Card className="rounded-3xl border-border bg-card shadow-sm">
                                <CardContent className="p-8">
                                    <div className="mb-6 text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                            <Keyboard className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground">{manualEntryTitle}</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">{manualEntryDesc}</p>
                                    </div>

                                    <form onSubmit={handleManualSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">{equipmentCodeLabel}</label>
                                            <Input
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                                placeholder="EQ-001 o token QR"
                                                className="h-14 rounded-2xl border-border bg-background text-center font-mono text-lg text-foreground"
                                                autoFocus
                                            />
                                        </div>

                                        <Button type="submit" disabled={!manualCode.trim()} className="h-14 w-full rounded-2xl font-bold">
                                            <Search className="mr-2 h-5 w-5" />
                                            {searchEquipmentText}
                                        </Button>
                                    </form>

                                    <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
                                        <p className="mb-2 text-xs font-semibold text-foreground">{acceptedFormatsText}:</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="secondary" className="font-mono">EQ-001</Badge>
                                            <Badge variant="secondary" className="font-mono">EQ-123</Badge>
                                            <Badge variant="secondary" className="font-mono">AB12CD34.EF56GH78</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-3xl border-border bg-card shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <QrCode className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">{recentScansText}</h3>
                                </div>

                                {scanHistory.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{noRecentScansText}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {scanHistory.map((scan) => (
                                            <div key={scan.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
                                                <div>
                                                    <div className="font-medium text-foreground">{scan.code}</div>
                                                    <div className="text-sm text-muted-foreground">{scan.equipmentName}</div>
                                                </div>
                                                <div className="text-xs text-muted-foreground">{formatRelativeTime(scan.timestamp)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
