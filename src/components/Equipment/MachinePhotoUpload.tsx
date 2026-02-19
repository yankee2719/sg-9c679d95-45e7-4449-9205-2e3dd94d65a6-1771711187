// src/components/Equipment/MachinePhotoUpload.tsx
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MachinePhotoUploadProps {
    machineId: string;
    currentPhotoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
    readonly?: boolean;
}

const BUCKET = "equipment-photos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function MachinePhotoUpload({
    machineId,
    currentPhotoUrl,
    onPhotoChange,
    readonly = false,
}: MachinePhotoUploadProps) {
    const { toast } = useToast();
    const fileRef = useRef < HTMLInputElement > (null);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [preview, setPreview] = useState < string | null > (currentPhotoUrl);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
        if (!ACCEPTED.includes(file.type)) {
            toast({ title: "Formato non supportato", description: "Usa JPG, PNG o WebP", variant: "destructive" });
            return;
        }
        if (file.size > MAX_SIZE) {
            toast({ title: "File troppo grande", description: "Max 5MB", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            // Generate path: machineId/timestamp.ext
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `${machineId}/${Date.now()}.${ext}`;

            // Delete old photo if exists
            if (currentPhotoUrl) {
                const oldPath = extractStoragePath(currentPhotoUrl);
                if (oldPath) {
                    await supabase.storage.from(BUCKET).remove([oldPath]);
                }
            }

            // Upload
            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(path);

            const publicUrl = urlData.publicUrl;

            // Update machine record
            const { error: updateError } = await (supabase as any)
                .from("machines")
                .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
                .eq("id", machineId);

            if (updateError) throw updateError;

            setPreview(publicUrl);
            onPhotoChange(publicUrl);
            toast({ title: "Foto caricata" });
        } catch (err: any) {
            console.error("Upload error:", err);
            toast({ title: "Errore upload", description: err?.message || "Riprova", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleRemove = async () => {
        if (!currentPhotoUrl || !confirm("Rimuovere la foto?")) return;
        setRemoving(true);
        try {
            // Remove from storage
            const storagePath = extractStoragePath(currentPhotoUrl);
            if (storagePath) {
                await supabase.storage.from(BUCKET).remove([storagePath]);
            }

            // Update machine
            await (supabase as any)
                .from("machines")
                .update({ photo_url: null, updated_at: new Date().toISOString() })
                .eq("id", machineId);

            setPreview(null);
            onPhotoChange(null);
            toast({ title: "Foto rimossa" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted/50 border border-border flex items-center justify-center">
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Foto macchina"
                            className="w-full h-full object-cover"
                            onError={() => setPreview(null)}
                        />
                        {!readonly && (
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                                onClick={handleRemove}
                                disabled={removing}
                            >
                                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="text-center text-muted-foreground p-6">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nessuna foto</p>
                    </div>
                )}

                {/* Upload overlay */}
                {uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {/* Upload buttons */}
            {!readonly && (
                <div className="flex gap-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED.join(",")}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento...</>
                            : <><Upload className="w-4 h-4 mr-2" /> {preview ? "Cambia foto" : "Carica foto"}</>
                        }
                    </Button>
                    {/* Camera button for mobile */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (fileRef.current) {
                                fileRef.current.setAttribute("capture", "environment");
                                fileRef.current.click();
                                // Remove capture after click to allow gallery too
                                setTimeout(() => fileRef.current?.removeAttribute("capture"), 500);
                            }
                        }}
                        disabled={uploading}
                    >
                        <Camera className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// Extract storage path from public URL
function extractStoragePath(url: string): string | null {
    try {
        const match = url.match(/equipment-photos\/(.+)$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

