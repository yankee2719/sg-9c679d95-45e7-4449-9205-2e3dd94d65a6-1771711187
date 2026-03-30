import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AlertTriangle, Camera, Keyboard, Play, QrCode, Search } from "lucide-react";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { SEO } from "@/components/SEO";
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

type ResolvedTarget =
    | { kind: "scan"; href: string }
    | { kind: "equipment"; href: string }
    | { kind: "invalid"; reason: string };

function resolveScanTarget(code: string): ResolvedTarget {
    const normalized = code.trim();
    if (!normalized) {
        return { kind: "invalid", reason: "QR vuoto o non leggibile." };
    }

    if (/^https?:\/\//i.test(normalized)) {
        try {
            const url = new URL(normalized);
            const tokenMatch = url.pathname.match(/\/scan\/([^/]+)$/i);
            if (tokenMatch?.[1]) {
                return { kind: "scan", href: `/scan/${tokenMatch[1]}` };
            }
            return {
                kind: "invalid",
                reason: "Il QR letto non è un QR macchina MACHINA.",
            };
        } catch {
            return { kind: "invalid", reason: "QR non valido." };
        }
    }

    if (normalized.startsWith("/scan/")) {
        return { kind: "scan", href: normalized };
    }

    if (/^EQ-/i.test(normalized)) {
        return { kind: "equipment", href: `/equipment/${normalized.replace(/^EQ-/i, "")}` };
    }

    if (/^[A-Z0-9]{8}\.[A-Z0-9]{8,}$/i.test(normalized)) {
        return { kind: "scan", href: `/scan/${normalized}` };
    }

    if (/^[A-Z0-9_-]{3,}$/i.test(normalized)) {
        return { kind: "equipment", href: `/equipment/${normalized}` };
    }

    return {
        kind: "invalid",
        reason: "Il QR letto non corrisponde a una macchina o a un token QR valido.",
    };
}

const copy = {
    it: {
        title: "Scanner QR",
        subtitle: "Scansiona un QR code macchina oppure inserisci manualmente il codice.",
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
    const text = useMemo(() => copy[language], [language]);

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

            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold text-foreground">{text.title}</h1>
                        <p className="text-muted-foreground">{text.subtitle}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Button
                                onClick={() => setActiveTab("scanner")}
                                variant={activeTab === "scanner" ? "default" : "outline"}
                                className="h-14 rounded-2xl font-semibold"
                            >
                                <QrCode className="mr-2 h-5 w-5" />
                                {text.scanQR}
                            </Button>
                            <Button
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
                                <CardContent className="space-y-6 p-8">
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
                                            onClick={() => {
                                                setScanError("");
                                                setScannerOpen(true);
                                            }}
                                            className="h-14 rounded-2xl px-6 font-bold"
                                        >
                                            <Play className="mr-2 h-5 w-5" />
                                            {text.startScanner}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Camera className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">QR macchina</p>
                                            <p className="text-xs text-muted-foreground">Leggi solo QR di macchine o token MACHINA.</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <QrCode className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">No QR generici</p>
                                            <p className="text-xs text-muted-foreground">Link esterni o QR non macchina vengono bloccati.</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                                <Search className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-foreground">Alternativa manuale</p>
                                            <p className="text-xs text-muted-foreground">Puoi sempre aprire la macchina inserendo il codice.</p>
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
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-3xl border-border bg-card shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <h2 className="text-lg font-semibold text-foreground">{text.recentScans}</h2>
                                    <div className="text-xs text-muted-foreground">{text.acceptedFormats}: EQ-001, /scan/TOKEN, URL /scan/TOKEN</div>
                                </div>
                                {scanHistory.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">{text.noRecentScans}</div>
                                ) : (
                                    <div className="space-y-3">
                                        {scanHistory.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-foreground">{item.equipmentName}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{item.code}</div>
                                                </div>
                                                <div className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {scannerOpen && (
                <QRCodeScanner
                    onScan={handleResolvedScan}
                    onClose={() => setScannerOpen(false)}
                />
            )}
        </>
    );
}
