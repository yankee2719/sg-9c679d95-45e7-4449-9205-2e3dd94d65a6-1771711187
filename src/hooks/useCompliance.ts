import { useEffect, useState } from "react";
import { documentService, type MandatoryDocumentStatus } from "@/services/documentService";

export function useCompliance(organizationId: string, machineId?: string) {
    const [status, setStatus] = useState < MandatoryDocumentStatus[] > ([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < Error | null > (null);

    useEffect(() => {
        if (!organizationId) {
            setStatus([]);
            setLoading(false);
            return;
        }

        void loadCompliance();
    }, [organizationId, machineId]);

    async function loadCompliance() {
        setLoading(true);
        setError(null);

        try {
            const result = await documentService.getMandatoryDocumentStatus(organizationId, machineId);
            setStatus(result);
        } catch (err: any) {
            setError(err instanceof Error ? err : new Error("Failed to load compliance"));
            console.error("Error loading compliance:", err);
        } finally {
            setLoading(false);
        }
    }

    const compliantCount = status.filter((item) => item.exists).length;
    const missingCount = status.filter((item) => !item.exists).length;
    const totalRequired = status.length;
    const compliancePercentage = totalRequired > 0
        ? Math.round((compliantCount / totalRequired) * 100)
        : 0;

    return {
        status,
        loading,
        error,
        refresh: loadCompliance,
        stats: {
            compliantCount,
            missingCount,
            totalRequired,
            compliancePercentage,
            isFullyCompliant: totalRequired > 0 && missingCount === 0,
        },
    };
}
