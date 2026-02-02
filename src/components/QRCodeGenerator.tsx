import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Copy, Check, Download } from "lucide-react";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  allowCustomLink?: boolean;
  onValueChange?: (value: string) => void;
}

export function QRCodeGenerator({ 
  value, 
  size = 200, 
  allowCustomLink = false,
  onValueChange 
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [customLink, setCustomLink] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDisplayValue(allowCustomLink ? customLink : value);
  }, [value, customLink, allowCustomLink]);

  useEffect(() => {
    if (!canvasRef.current || !displayValue) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Draw QR-like pattern
    const moduleSize = size / 25;
    ctx.fillStyle = "#000000";

    // Draw finder patterns (corners)
    const drawFinderPattern = (x: number, y: number) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(size - moduleSize * 7, 0);
    drawFinderPattern(0, size - moduleSize * 7);

    // Draw data modules based on value
    ctx.fillStyle = "#000000";
    const hash = displayValue.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if ((hash + i * j) % 3 === 0) {
          ctx.fillRect(
            (i + 5) * moduleSize,
            (j + 5) * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

  }, [displayValue, size]);

  const handleApplyLink = () => {
    setDisplayValue(customLink);
    onValueChange?.(customLink);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {allowCustomLink && (
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              placeholder="https://example.com"
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button 
            onClick={handleApplyLink}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            Genera
          </Button>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border-2 border-border rounded-lg"
      />
      
      <p className="text-xs text-muted-foreground font-mono text-center break-all max-w-full px-2">
        {displayValue.length > 50 ? displayValue.substring(0, 50) + "..." : displayValue}
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiato!" : "Copia"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Scarica
        </Button>
      </div>
    </div>
  );
}