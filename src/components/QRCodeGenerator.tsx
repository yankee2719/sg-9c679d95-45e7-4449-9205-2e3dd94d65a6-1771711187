import { useEffect, useRef } from "react";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

export function QRCodeGenerator({ value, size = 200 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Simple QR code generation using Canvas
    // In production, use a library like 'qrcode' or 'qrcode.react'
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Draw simple QR-like pattern (placeholder)
    // This is a simplified version - use a proper QR library in production
    const moduleSize = size / 25;
    ctx.fillStyle = "#000000";

    // Draw finder patterns (corners)
    const drawFinderPattern = (x: number, y: number) => {
      ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(size - moduleSize * 7, 0);
    drawFinderPattern(0, size - moduleSize * 7);

    // Draw data modules (simplified pattern based on value)
    const hash = value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
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

    // Add value text below QR code
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(value.substring(0, 20), size / 2, size - 5);

  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border-2 border-gray-200 rounded"
      />
      <p className="text-xs text-muted-foreground font-mono">{value}</p>
    </div>
  );
}