import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ScanLine, X } from "lucide-react";

type BarcodeDetectorCtor = {
    new (options?: { formats?: string[] }): {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
    };
    getSupportedFormats?: () => Promise<string[]>;
};

interface QRCodeScannerProps {
    onScan: (data: string) => void;
    onClose?: () => void;
}

export function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const lastScanRef = useRef<string | null>(null);

    const [error, setError] = useState("");
    const [status, setStatus] = useState<"idle" | "starting" | "scanning">("idle");
    const [cameraReady, setCameraReady] = useState(false);

    const safeClose = useCallback(() => {
        if (typeof onClose === "function") {
            onClose();
        }
    }, [onClose]);

    const stopCamera = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraReady(false);
        setStatus("idle");
    }, []);

    const startDetection = useCallback(async () => {
        const BarcodeDetectorClass = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        const videoEl = videoRef.current;

        if (!videoEl) {
            setError("Video non disponibile per la scansione.");
            return;
        }

        if (!BarcodeDetectorClass) {
            setError(
                "Questo browser non supporta la lettura QR dalla fotocamera. Usa Chrome/Edge recente oppure inserisci il codice manualmente."
            );
            return;
        }

        try {
            const supportedFormats = BarcodeDetectorClass.getSupportedFormats
                ? await BarcodeDetectorClass.getSupportedFormats()
                : ["qr_code"];

            if (!supportedFormats.includes("qr_code")) {
                setError("La fotocamera è attiva, ma questo browser non supporta i QR code. Usa l'inserimento manuale.");
                return;
            }

            const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });

            const tick = async () => {
                const currentVideo = videoRef.current;

                if (!currentVideo || currentVideo.readyState < 2) {
                    frameRef.current = requestAnimationFrame(tick);
                    return;
                }

                try {
                    const barcodes = await detector.detect(currentVideo);
                    const value = barcodes?.[0]?.rawValue?.trim();

                    if (value && value !== lastScanRef.current) {
                        lastScanRef.current = value;
                        stopCamera();
                        onScan(value);
                        return;
                    }
                } catch (detectError) {
                    console.error("QR detect error:", detectError);
                }

                frameRef.current = requestAnimationFrame(tick);
            };

            setStatus("scanning");
            frameRef.current = requestAnimationFrame(tick);
        } catch (detectorError) {
            console.error("BarcodeDetector init error:", detectorError);
            setError("Impossibile inizializzare la scansione QR. Usa l'inserimento manuale.");
        }
    }, [onScan, stopCamera]);

    const startCamera = useCallback(async () => {
        setError("");
        setStatus("starting");

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setStatus("idle");
                setError("Questo browser non supporta l'accesso alla fotocamera.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraReady(true);
            await startDetection();
        } catch (err) {
            console.error("Camera error:", err);
            setStatus("idle");
            setError("Impossibile accedere alla fotocamera. Verifica i permessi del browser oppure usa l'inserimento manuale.");
        }
    }, [startDetection]);

    useEffect(() => {
        void startCamera();

        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 z-10 rounded-xl bg-background/70 hover:bg-background"
                    onClick={() => {
                        stopCamera();
                        safeClose();
                    }}
                >
                    <X className="h-5 w-5" />
                </Button>

                <div className="border-b border-border bg-gradient-to-r from-primary/90 to-primary p-5 text-primary-foreground">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                        <Camera className="h-5 w-5" />
                        Scansiona codice QR
                    </h3>
                    <p className="mt-1 text-sm text-primary-foreground/85">
                        Inquadra il QR della macchina o del passaporto digitale.
                    </p>
                </div>

                <div className="relative aspect-square bg-black">
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-64 w-64 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]">
                            <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-primary" />
                            <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-primary" />
                            <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-primary" />
                            <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-primary" />
                        </div>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-background/85 px-4 py-2 text-sm font-medium text-foreground shadow-lg">
                            <ScanLine className="h-4 w-4 text-primary" />
                            {status === "starting"
                                ? "Avvio fotocamera..."
                                : cameraReady
                                  ? "Ricerca QR in corso..."
                                  : "In attesa della fotocamera"}
                        </div>
                    </div>
                </div>

                <div className="space-y-3 p-5">
                    {error ? (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                            Posiziona il codice QR all'interno del riquadro e tieni il dispositivo fermo per un istante.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
