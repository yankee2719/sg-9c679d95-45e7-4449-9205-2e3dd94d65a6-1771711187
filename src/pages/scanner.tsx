import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AlertTriangle, ArrowLeft, Camera, Keyboard, Play, QrCode, Search } from "lucide-react";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { SEO } from "@/components/SEO";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

interface ScanHistory {
    id: string;
    code: string;
    equipmentName: string;
    timestamp: string;
}

type ResolvedTarget =
    | { kind: "scan"; href: string }
    | { kind: "equipment"; href: string }
    | { kind: "invalid"; reason: string };

function resolveScanTarget(code: string): ResolvedTarget {
    const normalized = code.trim();
    if (!normalized) return { kind: "invalid", reason: "QR vuoto o non leggibile." };

    if (/^https?:\/\//i.test(normalized)) {
        try {
            const url = new URL(normalized);
            const tokenMatch = url.pathname.match(/\/scan\/([^/]+)$/i);
            if (tokenMatch?.[1]) return { kind: "scan", href: `/scan/${tokenMatch[1]}` };
            return { kind: "invalid", reason: "Il QR letto non è un QR macchina MACHINA." };
        } catch {
            return { kind: "invalid", reason: "QR non valido." };
        }
    }

    if (normalized.startsWith("/scan/")) return { kind: "scan", href: normalized };
    if (/^EQ-/i.test(normalized)) return { kind: "equipment", href: `/equipment/${normalized.replace(/^EQ-/i, "")}` };
    if (/^[A-Z0-9]{8}\.[A-Z0-9]{8,}$/i.test(normalized)) return { kind: "scan", href: `/scan/${normalized}` };
    if (/^[A-Z0-9_-]{3,}$/i.test(normalized)) return { kind: "equipment", href: `/equipment/${normalized}` };

    return { kind: "invalid", reason: "Il QR letto non corrisponde a una macchina o a un token QR valido." };
}

const copy = {
    it: {
        title: "Scanner QR",
        subtitle: "Scansiona un QR code macchina oppure inserisci manualmente il codice.",
        back: "Indietro",
        scanQR: "Scansione QR",
        manualEntry: "Inserimento manuale",
        frameQR: "Inquadra il QR code",
        positionQR: "Avvia la fotocamera solo quando sei pronto a leggere un QR macchina.",
        startScanner: "Avvia scanner",
        stopScanner: "Chiudi scanner",
        manualEntryTitle: "Ricerca manuale",
        manualEntryDesc: "Inserisci codice macchina, seriale o token QR.",
        equipmentCode: "Codice macchina",
        searchEquipment: "Apri macchina",
        acceptedFormats: "Formati accettati",
        recentScans: "Scansioni recenti",
        noRecentScans: "Nessuna scansione recente.",
        invalidQr: "QR non valido",
        now: "ora",
        ago: "fa",
    },
    en: {
        title: "QR Scanner",
        subtitle: "Scan a machine QR code or enter the code manually.",
        back: "Back",
        scanQR: "QR scan",
        manualEntry: "Manual entry",
        frameQR: "Frame the QR code",
        positionQR: "Start the camera only when you are ready to read a MACHINA QR.",
        startScanner: "Start scanner",
        stopScanner: "Close scanner",
        manualEntryTitle: "Manual search",
        manualEntryDesc: "Enter machine code, serial number, or QR token.",
        equipmentCode: "Machine code",
        searchEquipment: "Open machine",
        acceptedFormats: "Accepted formats",
        recentScans: "Recent scans",
        noRecentScans: "No recent scans.",
        invalidQr: "Invalid QR",
        now: "now",
        ago: "ago",
    },
    fr: {
        title: "Scanner QR",
        subtitle: "Scannez un QR code machine ou saisissez le code manuellement.",
        back: "Retour",
        scanQR: "Scan QR",
        manualEntry: "Saisie manuelle",
        frameQR: "Cadrez le QR code",
        positionQR: "N'activez la caméra que lorsque vous êtes prêt à lire un QR MACHINA.",
        startScanner: "Démarrer le scanner",
        stopScanner: "Fermer le scanner",
        manualEntryTitle: "Recherche manuelle",
        manualEntryDesc: "Saisissez le code machine, le numéro de série ou le token QR.",
        equipmentCode: "Code machine",
        searchEquipment: "Ouvrir machine",
        acceptedFormats: "Formats acceptés",
        recentScans: "Scans récents",
        noRecentScans: "Aucun scan récent.",
        invalidQr: "QR invalide",
        now: "maintenant",
        ago: "il y a",
    },
    es: {
        title: "Escáner QR",
        subtitle: "Escanea un código QR de máquina o introduce el código manualmente.",
        back: "Volver",
        scanQR: "Escaneo QR",
        manualEntry: "Entrada manual",
        frameQR: "Enfoca el código QR",
        positionQR: "Activa la cámara solo cuando estés listo para leer un QR MACHINA.",
        startScanner: "Iniciar escáner",
        stopScanner: "Cerrar escáner",
        manualEntryTitle: "Búsqueda manual",
        manualEntryDesc: "Introduce código de máquina, serie o token QR.",
        equipmentCode: "Código de máquina",
        searchEquipment: "Abrir máquina",
        acceptedFormats: "Formatos aceptados",
        recentScans: "Escaneos recientes",
        noRecentScans: "Sin escaneos recientes.",
        invalidQr: "QR no válido",
        now: "ahora",
        ago: "hace",
    },
} as const;

export default function ScannerPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const { membership } = useAuth();
    const text = useMemo(() => copy[(language as keyof typeof copy) || "it"] ?? copy.it, [language]);

    const [activeTab, setActiveTab] = useState < "scanner" | "manual" > ("scanner");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [scanHistory, setScanHistory] = useState < ScanHistory[] > ([]);
    const [scanError, setScanError] = useState("");

    const handleResolvedScan = (code: string) => {
        const result = resolveScanTarget(code);
        if (result.kind === "invalid") {
            setScanError(result.reason);
            return;
        }

        const newScan: ScanHistory = {
            id: Date.now().toString(),
            code,
            equipmentName: code,
            timestamp: new Date().toISOString(),
        };

        setScanError("");
        setScanHistory((prev) => [newScan, ...prev].slice(0, 10));
        setScannerOpen(false);
        void router.push(result.href);
    };

    const handleManualSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!manualCode.trim()) return;
        handleResolvedScan(manualCode.trim());
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
            <MainLayout userRole={membership?.role ?? "technician"}>
                <div className="mx-auto max-w-5xl p-4 sm:p-6">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{text.title}</h1>
                            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{text.subtitle}</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                                if (window.history.length > 1) {
                                    router.back();
                                    return;
                                }
                                void router.push("/dashboard");
                            }}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {text.back}
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Button
                                type="button"
                                onClick={() => setActiveTab("scanner")}
                                variant={activeTab === "scanner" ? "default" : "outline"}
                                className="h-14 rounded-2xl font-semibold"
                            >
                                <QrCode className="mr-2 h-5 w-5" />
                                {text.scanQR}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setActiveTab("manual")}
                                variant={activeTab === "manual" ? "default" : "outline"}
                                className="h-14 rounded-2xl font-semibold"
                            >
                                <Keyboard className="mr-2 h-5 w-5" />
                                {text.manualEntry}
                            </Button>
                        </div>

                        {activeTab === "scanner" && (
                            <Card className="mx-auto max-w-2xl rounded-3xl border-border bg-card shadow-sm">
                                <CardContent className="space-y-6 p-6 sm:p-8">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-foreground">{text.frameQR}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{text.positionQR}</p>
                                    </div>

                                    {scanError && (
                                        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                <span>{scanError}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-center">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setScanError("");
                                                setScannerOpen((prev) => !prev);
                                            }}
                                            className="h-14 rounded-2xl px-6 font-bold"
                                        >
                                            {scannerOpen ? <Camera className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                                            {scannerOpen ? text.stopScanner : text.startScanner}
                                        </Button>
                                    </div>

                                    {scannerOpen && (
                                        <div className="overflow-hidden rounded-3xl border border-border bg-background p-3">
                                            <QRCodeScanner onScan={handleResolvedScan} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "manual" && (
                            <Card className="mx-auto max-w-2xl rounded-3xl border-border bg-card shadow-sm">
                                <CardContent className="space-y-5 p-6 sm:p-8">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">{text.manualEntryTitle}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">{text.manualEntryDesc}</p>
                                    </div>

                                    <form onSubmit={handleManualSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">{text.equipmentCode}</label>
                                            <Input
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value)}
                                                placeholder="EQ-HMS140 / ABCD1234.XYZ98765 / /scan/token"
                                                className="h-12"
                                            />
                                        </div>
                                        <Button type="submit" className="h-12 rounded-2xl px-6 font-semibold">
                                            <Search className="mr-2 h-4 w-4" />
                                            {text.searchEquipment}
                                        </Button>
                                    </form>

                                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                        <div className="mb-2 text-sm font-semibold text-foreground">{text.acceptedFormats}</div>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li>• EQ-HMS140</li>
                                            <li>• /scan/ABCD1234.XYZ98765</li>
                                            <li>• https://.../scan/ABCD1234.XYZ98765</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-3xl border-border bg-card shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <QrCode className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-foreground">{text.recentScans}</h2>
                                </div>

                                {scanHistory.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{text.noRecentScans}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {scanHistory.map((scan) => (
                                            <div key={scan.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-foreground">{scan.equipmentName}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{scan.code}</div>
                                                </div>
                                                <div className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(scan.timestamp)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </>
    );
}
