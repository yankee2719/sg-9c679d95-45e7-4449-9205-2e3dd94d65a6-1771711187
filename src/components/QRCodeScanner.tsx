import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        scanQRCode();
      }
    } catch (err) {
      setError("Impossibile accedere alla fotocamera. Verifica i permessi.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const scanQRCode = () => {
    // In production, use a QR code scanning library like 'jsqr' or 'html5-qrcode'
    // This is a placeholder that simulates scanning
    const interval = setInterval(() => {
      // Simulate QR code detection
      if (Math.random() > 0.95) {
        const mockQRData = "EQUIP:MAC-001";
        onScan(mockQRData);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md mx-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6 text-white" />
        </Button>

        <div className="bg-white rounded-lg overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scansiona Codice QR
            </h3>
            <p className="text-sm opacity-90 mt-1">
              Inquadra il codice QR della macchina
            </p>
          </div>

          <div className="relative aspect-square bg-gray-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-white rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>

            {scanning && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm">
                  Ricerca in corso...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 text-center text-sm text-muted-foreground">
            Posiziona il codice QR all'interno del riquadro
          </div>
        </div>
      </div>
    </div>
  );
}