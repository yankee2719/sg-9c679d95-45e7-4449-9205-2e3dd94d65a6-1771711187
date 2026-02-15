import { useState, useEffect } from 'react';
import { documentService, DocumentCategory } from '@/services/documentService';

export interface ComplianceStatus {
    category: DocumentCategory;
    category_label: string;
    mandatory: boolean;
    exists: boolean;
    documentId?: string;
}

const CATEGORY_LABELS: Record<string, { it: string; en: string }> = {
    technical_manual: { it: 'Manuale Tecnico', en: 'Technical Manual' },
    risk_assessment: { it: 'Valutazione dei Rischi', en: 'Risk Assessment' },
    ce_declaration: { it: 'Dichiarazione CE', en: 'CE Declaration' },
    electrical_schema: { it: 'Schema Elettrico', en: 'Electrical Schema' },
    maintenance_manual: { it: 'Manuale di Manutenzione', en: 'Maintenance Manual' },
};

export function useCompliance(organizationId: string, machineId?: string) {
    const [status, setStatus] = useState < ComplianceStatus[] > ([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < Error | null > (null);

    useEffect(() => {
        if (organizationId) {
            loadCompliance();
        }
    }, [organizationId, machineId]);

    async function loadCompliance() {
        setLoading(true);
        setError(null);

        try {
            const result = await documentService.getMandatoryDocumentStatus(
                organizationId,
                machineId
            );

            setStatus(result.map(r => ({
                category: r.category,
                category_label: CATEGORY_LABELS[r.category]?.it || r.category,
                mandatory: true,
                exists: r.exists,
                documentId: r.documentId,
            })));
        } catch (err: any) {
            setError(err);
            console.error('Error loading compliance:', err);
        } finally {
            setLoading(false);
        }
    }

    const compliantCount = status.filter(s => s.exists).length;
    const missingCount = status.filter(s => !s.exists).length;
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
            isFullyCompliant: compliancePercentage === 100
        }
    };
}