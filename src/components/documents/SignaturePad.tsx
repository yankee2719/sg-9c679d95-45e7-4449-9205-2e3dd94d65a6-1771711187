// src/components/documents/SignaturePad.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
    onConfirm,
}: {
    onConfirm: (dataUrl: string) => void;
}) {
    const canvasRef = useRef < HTMLCanvasElement | null > (null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // hiDPI fix
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        ctx.scale(dpr, dpr);

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
    }, []);

    const getPos = (e: any) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches?.[0]?.clientX ?? e.clientX;
        const clientY = e.touches?.[0]?.clientY ?? e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const move = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const end = () => setIsDrawing(false);

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
    };

    const confirm = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        onConfirm(canvas.toDataURL("image/png"));
    };

    return (
        <div className="space-y-3">
            <div className="border rounded-xl overflow-hidden bg-white">
                <canvas
                    ref={canvasRef}
                    className="w-full h-48 touch-none"
                    onMouseDown={start}
                    onMouseMove={move}
                    onMouseUp={end}
                    onMouseLeave={end}
                    onTouchStart={start}
                    onTouchMove={move}
                    onTouchEnd={end}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={clear}>
                    Pulisci
                </Button>
                <Button onClick={confirm}>Conferma firma</Button>
            </div>
        </div>
    );
}