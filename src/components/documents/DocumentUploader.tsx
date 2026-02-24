import { useState } from "react";
import { uploadDocument } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function DocumentUploader({ orgId, machineId, plantId, onUploaded }: any) {
    const { toast } = useToast();

    const [file, setFile] = useState < File | null > (null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("manual");
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file || !title) {
            toast({ title: "Errore", description: "File e titolo obbligatori", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            await uploadDocument({
                file,
                orgId,
                machineId,
                plantId,
                title,
                category,
            });

            toast({ title: "OK", description: "Documento caricato" });

            setFile(null);
            setTitle("");

            onUploaded?.();
        } catch (e: any) {
            toast({ title: "Errore", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">📂 Carica documento</h3>

            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

            <Input
                placeholder="Titolo documento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md p-2"
            >
                <option value="manual">Manuale</option>
                <option value="drawing">Disegno</option>
                <option value="certificate">Certificato</option>
                <option value="other">Altro</option>
            </select>

            <Button onClick={handleUpload} disabled={loading}>
                {loading ? "Upload..." : "Carica"}
            </Button>
        </div>
    );
}