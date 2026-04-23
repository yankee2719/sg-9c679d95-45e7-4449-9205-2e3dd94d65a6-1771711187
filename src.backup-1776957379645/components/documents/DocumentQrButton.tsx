import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function DocumentQrButton({ documentId }: { documentId: string }) {
    const url = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/documents/${documentId}`;
    }, [documentId]);

    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

    useEffect(() => {
        let cancelled = false;

        async function buildQr() {
            if (!url) {
                setQrDataUrl("");
                return;
            }

            try {
                const dataUrl = await QRCode.toDataURL(url, {
                    width: 260,
                    margin: 2,
                });
                if (!cancelled) {
                    setQrDataUrl(dataUrl);
                }
            } catch (error) {
                console.error("Failed to generate document QR", error);
                if (!cancelled) {
                    setQrDataUrl("");
                }
            }
        }

        void buildQr();

        return () => {
            cancelled = true;
        };
    }, [url]);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopyState("copied");
            window.setTimeout(() => setCopyState("idle"), 1500);
        } catch (error) {
            console.error("Failed to copy document URL", error);
            setCopyState("error");
            window.setTimeout(() => setCopyState("idle"), 1500);
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">QR</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>QR Code documento</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3 py-2">
                    {qrDataUrl ? (
                        <>
                            <img
                                src={qrDataUrl}
                                alt="QR code documento"
                                width={260}
                                height={260}
                                className="rounded-md border bg-white p-2"
                            />
                            <div className="text-xs text-muted-foreground break-all text-center">{url}</div>
                            <Button variant="outline" onClick={handleCopy}>
                                {copyState === "copied"
                                    ? "Link copiato"
                                    : copyState === "error"
                                        ? "Errore copia"
                                        : "Copia link"}
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-muted-foreground">Caricamento...</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
