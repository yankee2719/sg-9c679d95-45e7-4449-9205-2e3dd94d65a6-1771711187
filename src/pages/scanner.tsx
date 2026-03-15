import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Camera, Keyboard, QrCode, Search } from "lucide-react";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

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
            return `/equipment/${normalized}`;
        }
    }

    if (normalized.startsWith("/scan/")) return normalized;
    if (/^EQ-/i.test(normalized)) return `/equipment/${normalized.replace(/^EQ-/i, "")}`;
    if (/^[A-Z0-9]{8}\.[A-Z0-9]{8,}$/i.test(normalized) || normalized.includes(".")) return `/scan/${normalized}`;
    return `/equipment/${normalized}`;
}

const copy = {
    it: {
        title: "Scanner QR",
        subtitle: "Scansiona un QR code macchina oppure inserisci manualmente il codice.",
        scanQR: "Scansione QR",
        manualEntry: "Inserimento manuale",
        frameQR: "Inquadra il QR code",
        positionQR: "Posiziona il codice all’interno dell’area di scansione.",
        frameWell: "Inquadra bene",
        keepCentered: "Mantieni il QR centrato nel riquadro.",
        goodLight: "Buona luce",
        ensureLight: "Assicurati che il codice sia ben illuminato.",
        rightDistance: "Distanza corretta",
        notTooClose: "Non troppo vicino e non troppo lontano.",
        manualEntryTitle: "Ricerca manuale",
        manualEntryDesc: "Inserisci codice macchina, seriale o token QR.",
        equipmentCode: "Codice macchina",
        searchEquipment: "Apri macchina",
        acceptedFormats: "Formati accettati",
        recentScans: "Scansioni recenti",
        noRecentScans: "Nessuna scansione recente.",
        now: "ora",
        ago: "fa",
    },
    en: {
        title: "QR Scanner",
        subtitle: "Scan a machine QR code or enter the code manually.",
        scanQR: "QR scan",
        manualEntry: "Manual entry",
        frameQR: "Frame the QR code",
        positionQR: "Place the code inside the scan area.",
        frameWell: "Frame it well",
        keepCentered: "Keep the QR centered in the frame.",
        goodLight: "Good light",
        ensureLight: "Make sure the code is well lit.",
        rightDistance: "Right distance",
        notTooClose: "Not too close and not too far.",
        manualEntryTitle: "Manual search",
        manualEntryDesc: "Enter machine code, serial number, or QR token.",
        equipmentCode: "Machine code",
        searchEquipment: "Open machine",
        acceptedFormats: "Accepted formats",
        recentScans: "Recent scans",
        noRecentScans: "No recent scans.",
        now: "now",
        ago: "ago",
    },
    fr: {
        title: "Scanner QR",
        subtitle: "Scannez un QR code machine ou saisissez le code manuellement.",
        scanQR: "Scan QR",
        manualEntry: "Saisie manuelle",
        frameQR: "Cadrez le QR code",
        positionQR: "Placez le code dans la zone de lecture.",
        frameWell: "Bien cadrer",
        keepCentered: "Gardez le QR centré dans le cadre.",
        goodLight: "Bonne lumière",
        ensureLight: "Assurez-vous que le code est bien éclairé.",
        rightDistance: "Bonne distance",
        notTooClose: "Ni trop près ni trop loin.",
        manualEntryTitle: "Recherche manuelle",
        manualEntryDesc: "Saisissez le code machine, le numéro de série ou le token QR.",
        equipmentCode: "Code machine",
        searchEquipment: "Ouvrir la machine",
        acceptedFormats: "Formats acceptés",
        recentScans: "Scans récents",
        noRecentScans: "Aucun scan récent.",
        now: "maintenant",
        ago: "il y a",
    },
    es: {
        title: "Escáner QR",
        subtitle: "Escanea un código QR de máquina o introduce el código manualmente.",
        scanQR: "Escaneo QR",
        manualEntry: "Entrada manual",
        frameQR: "Enfoca el código QR",
        positionQR: "Coloca el código dentro del área de lectura.",
        frameWell: "Enfoque correcto",
        keepCentered: "Mantén el QR centrado en el recuadro.",
        goodLight: "Buena luz",
        ensureLight: "Asegúrate de que el código esté bien iluminado.",
        rightDistance: "Distancia correcta",
        notTooClose: "Ni demasiado cerca ni demasiado lejos.",
        manualEntryTitle: "Búsqueda manual",
        manualEntryDesc: "Introduce código de máquina, serie o token QR.",
        equipmentCode: "Código de máquina",
        searchEquipment: "Abrir máquina",
        acceptedFormats: "Formatos aceptados",
        recentScans: "Escaneos recientes",
        noRecentScans: "Sin escaneos recientes.",
        now: "ahora",
        ago: "hace",
    },
} as const;

export default function ScannerPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
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

    const handleManualSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (manualCode.trim()) handleScan(manualCode.trim());
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return text.now;
        if (diffMins < 60) return `${diffMins}m ${text.ago}`;
        if (diffHours < 24) return `${diffHours}h ${text.ago}`;
        return past.toLocaleDateString();
    };

    return (
        <>
            <SEO title={`${text.title} - MACHINA`} />

            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold text-foreground">{text.title}</h1>
                        <p className="text-muted-foreground">{text.subtitle}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Button onClick={() => setActiveTab("scanner")} variant={activeTab === "scanner" ? "default" : "outline"} className="h-14 rounded-2xl font-semibold">
                                <QrCode className="mr-2 h-5 w-5" />
                                {text.scanQR}
                            </Button>
                            <Button onClick={() => setActiveTab("manual")} variant={activeTab === "manual" ? "default" : "outline"} className="h-14 rounded-2xl font-semibold">
                                <Keyboard className="mr-2 h-5 w-5" />
                                {text.manualEntry}
                            </Button>
                        </div>

                        {activeTab === "scanner" && (
                            <Card className="mx-auto max-w-2xl rounded-3xl border-border bg-card shadow-sm">
                                <CardContent className="space-y-6 p-8">
                                    <div className="overflow-hidden rounded-3xl border border-border bg-muted/30">
                                        <QRCodeScanner onScan={handleScan} onClose={() => router.push("/dashboard")} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-foreground">{text.frameQR}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{text.positionQR}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Camera className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{text.frameWell}</p>
                                            <p className="text-xs text-muted-foreground">{text.keepCentered}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <QrCode className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{text.goodLight}</p>
                                            <p className="text-xs text-muted-foreground">{text.ensureLight}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Search className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">{text.rightDistance}</p>
                                            <p className="text-xs text-muted-foreground">{text.notTooClose}</p>
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
                                        <h3 className="text-xl font-bold text-foreground">{text.manualEntryTitle}</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">{text.manualEntryDesc}</p>
                                    </div>
                                    <form onSubmit={handleManualSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">{text.equipmentCode}</label>
                                            <Input
                                                value={manualCode}
                                                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                                                placeholder="EQ-001 o QR token"
                                                className="h-14 rounded-2xl border-border bg-background text-center font-mono text-lg text-foreground"
                                                autoFocus
                                            />
                                        </div>
                                        <Button type="submit" disabled={!manualCode.trim()} className="h-14 w-full rounded-2xl font-bold">
                                            <Search className="mr-2 h-5 w-5" />
                                            {text.searchEquipment}
                                        </Button>
                                    </form>
                                    <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
                                        <p className="mb-2 text-xs font-semibold text-foreground">{text.acceptedFormats}:</p>
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
                                    <h3 className="text-lg font-semibold text-foreground">{text.recentScans}</h3>
                                </div>
                                {scanHistory.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{text.noRecentScans}</p>
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
