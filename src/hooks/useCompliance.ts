import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ComplianceStatus {
    category_code: string;
    category_name_it: string;
    category_name_en: string;
    mandatory_for_ce: boolean;
    active_count: number;
    compliance_status: 'compliant' | 'missing' | 'optional';
    last_updated: string | null;
}

export function useCompliance(organizationId: string) {
    const [status, setStatus] = useState < ComplianceStatus[] > ([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < Error | null > (null);

    useEffect(() => {
        if (organizationId) {
            loadCompliance();
        }
    }, [organizationId]);

    async function loadCompliance() {
        setLoading(true);
        setError(null);

        try {
            const { data, error: queryError } = await supabase
                .from('document_compliance_status')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('mandatory_for_ce', true)
                .order('category_code');

            if (queryError) throw queryError;

            setStatus(data || []);
        } catch (err: any) {
            setError(err);
            console.error('Error loading compliance:', err);
        } finally {
            setLoading(false);
        }
    }

    const compliantCount = status.filter(s => s.compliance_status === 'compliant').length;
    const missingCount = status.filter(s => s.compliance_status === 'missing').length;
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