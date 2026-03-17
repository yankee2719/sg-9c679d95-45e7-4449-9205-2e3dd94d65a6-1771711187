import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createAuditLog } from "@/services/auditService";
import { machineEventsService, EVENT_TYPES } from "@/services/machineEventsService";

interface MachinePhotoUploadProps {
    machineId: string;
    currentPhotoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
    readonly?: boolean;
}

const BUCKET = "equipment-photos";
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function MachinePhotoUpload({
    machineId,
    currentPhotoUrl,
    onPhotoChange,
    readonly = false,
}: MachinePhotoUploadProps) {
    const { toast } = useToast();
    const { user, organization } = useAuth();

    const fileRef = useRef < HTMLInputElement > (null);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [preview, setPreview] = useState < string | null > (currentPhotoUrl);

    useEffect(() => {
        setPreview(currentPhotoUrl);
    }, [currentPhotoUrl]);

    const updateMachinePhoto = async (photoUrl: string | null) => {
        const { error } = await supabase
            .from("machines")
            .update({
                photo_url: photoUrl,
                updated_at: new Date().toISOString(),
            } as any)
            .eq("id", machineId);

        if (error) throw error;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ACCEPTED.includes(file.type)) {
            toast({
                title: "Formato non supportato",
                description: "Usa JPG, PNG o WebP.",
                variant: "destructive",
            });
            return;
        }

        if (file.size > MAX_SIZE) {
            toast({
                title: "File troppo grande",
                description: "Dimensione massima 5MB.",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `${machineId}/${Date.now()}.${ext}`;

            if (currentPhotoUrl) {
                const oldPath = extractStoragePath(currentPhotoUrl);
                if (oldPath) {
                    await supabase.storage.from(BUCKET).remove([oldPath]);
                }
            }

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
            const publicUrl = urlData.publicUrl;

            await updateMachinePhoto(publicUrl);

            if (organization?.id) {
                await createAuditLog({
                    organizationId: organization.id,
                    actorUserId: user?.id ?? null,
                    entityType: "machine",
                    entityId: machineId,
                    action: "photo_update",
                    machineId,
                    newData: { photo_url: publicUrl },
                    metadata: {
                        source: "MachinePhotoUpload.upload",
                        storage_path: path,
                    },
                }).catch((err) => console.error("Audit photo upload failed:", err));

                await machineEventsService.recordEvent({
                    machineId,
                    organizationId: organization.id,
                    eventType: EVENT_TYPES.PHOTO_ADDED,
                    payload: {
                        photo_url: publicUrl,
                        storage_path: path,
                    },
                    actorType: "user",
                });
            }

            setPreview(publicUrl);
            onPhotoChange(publicUrl);

            toast({
                title: "Foto caricata",
                description: "Immagine aggiornata correttamente.",
            });
        } catch (err: any) {
            console.error("Upload error:", err);
            toast({
                title: "Errore upload",
                description: err?.message || "Riprova.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleRemove = async () => {
        if (!currentPhotoUrl || !confirm("Rimuovere la foto?")) return;

        setRemoving(true);
        try {
            const storagePath = extractStoragePath(currentPhotoUrl);
            if (storagePath) {
                await supabase.storage.from(BUCKET).remove([storagePath]);
            }

            await updateMachinePhoto(null);

            if (organization?.id) {
                await createAuditLog({
                    organizationId: organization.id,
                    actorUserId: user?.id ?? null,
                    entityType: "machine",
                    entityId: machineId,
                    action: "photo_update",
                    machineId,
                    oldData: { photo_url: currentPhotoUrl },
                    newData: { photo_url: null },
                    metadata: {
                        source: "MachinePhotoUpload.remove",
                    },
                }).catch((err) => console.error("Audit photo remove failed:", err));
            }

            setPreview(null);
            onPhotoChange(null);

            toast({
                title: "Foto rimossa",
                description: "Immagine eliminata correttamente.",
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Riprova.",
                variant: "destructive",
            });
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/50">
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Foto macchina"
                            className="h-full w-full object-cover"
                            onError={() => setPreview(null)}
                        />

                        {!readonly && (
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-85 hover:opacity-100"
                                onClick={handleRemove}
                                disabled={removing || uploading}
                            >
                                {removing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="p-6 text-center text-muted-foreground">
                            <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-40" />
                            <p className="text-sm">Nessuna foto</p>
                        </div>
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>

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
                        disabled={uploading || removing}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Caricamento...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                {preview ? "Cambia foto" : "Carica foto"}
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading || removing}
                        onClick={() => {
                            if (!fileRef.current) return;
                            fileRef.current.setAttribute("capture", "environment");
                            fileRef.current.click();
                            setTimeout(() => fileRef.current?.removeAttribute("capture"), 500);
                        }}
                    >
                        <Camera className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

function extractStoragePath(url: string): string | null {
    try {
        const match = url.match(/equipment-photos\/(.+)$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

export default MachinePhotoUpload;