import { useEffect, useState } from "react";
import { getMachineDocuments } from "@/services/documentService";

export function DocumentList({ machineId }: { machineId: string }) {
    const [docs, setDocs] = useState<any[]>([]);

    useEffect(() => {
        load();
    }, [machineId]);

    const load = async () => {
        const data = await getMachineDocuments(machineId);
        setDocs(data || []);
    };

    return (
        <div className="space-y-2">
            <h3 className="font-semibold">📄 Documenti</h3>

            {docs.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-3">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">
                        Versioni: {doc.version_count}
                    </div>
                </div>
            ))}
        </div>
    );
}