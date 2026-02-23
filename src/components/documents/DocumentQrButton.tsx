// src/components/documents/DocumentQrButton.tsx
import { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

export function DocumentQrButton({ documentId }: { documentId: string }) {
    const url = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/documents/${documentId}`;
    }, [documentId]);

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
                    {url ? (
                        <>
                            <QRCodeCanvas value={url} size={260} includeMargin />
                            <div className="text-xs text-muted-foreground break-all text-center">{url}</div>
                            <Button
                                variant="outline"
                                onClick={() => navigator.clipboard.writeText(url)}
                            >
                                Copia link
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