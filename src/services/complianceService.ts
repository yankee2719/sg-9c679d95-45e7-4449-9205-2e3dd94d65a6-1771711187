// ============================================================================
// COMPLIANCE SERVICE
// ============================================================================
// Business logic per Compliance Engine
// Machine-derived compliance, not manually declared
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'pending_review' | 'expired';
export type DocumentRequirementType = 'mandatory' | 'recommended' | 'conditional';
export type ComplianceRegulation =
    | 'eu_machinery_2023_1230'
    | 'ce_marking'
    | 'atex'
    | 'iso_9001'
    | 'iso_14001'
    | 'iso_45001'
    | 'ukca'
    | 'osha'
    | 'other';

export interface EquipmentComplianceStatus {
    id: string;
    organization_id: string;
    plant_id?: string;
    equipment_id: string;

    overall_status: ComplianceStatus;
    compliance_score: number; // 0-100

    document_completeness_score: number;
    maintenance_compliance_score: number;
    certification_validity_score: number;

    missing_critical_items: number;
    missing_recommended_items: number;
    total_requirements: number;

    has_valid_ce_marking: boolean;
    has_technical_file: boolean;
    has_risk_assessment: boolean;
    has_user_manual: boolean;
    has_maintenance_manual: boolean;
    has_declaration_of_conformity: boolean;

    next_expiring_document_date?: string;
    expired_documents_count: number;

    last_calculated_at: string;
    calculation_metadata?: any;

    created_at: string;
    updated_at: string;
}

export interface ComplianceRequirement {
    id: string;
    regulation: ComplianceRegulation;
    regulation_version?: string;

    requirement_code: string;
    requirement_title: string;
    requirement_description?: string;

    requirement_type: DocumentRequirementType;
    category?: string;

    applies_to_equipment_types?: string[];
    applies_to_sectors?: string[];

    required_document_categories?: string[];
    required_compliance_tags?: string[];

    validation_rules?: any;
    is_critical: boolean;

    reference_url?: string;
    notes?: string;

    created_at: string;
    updated_at: string;
}

export interface ComplianceCheck {
    id: string;
    equipment_id: string;

    check_type: string;
    performed_by?: string;
    performed_at: string;

    status_before?: ComplianceStatus;
    status_after: ComplianceStatus;
    score_before?: number;
    score_after: number;

    findings?: string;
    recommendations?: string;
    issues_found?: any;

    document_ids?: string[];
    photo_urls?: string[];
    report_url?: string;

    requires_action: boolean;
    action_deadline?: string;
    action_assigned_to?: string;

    metadata?: any;
    created_at: string;
}

export interface InspectorAccessGrant {
    id: string;
    inspector_email: string;
    inspector_name?: string;
    inspector_organization?: string;

    organization_id?: string;
    plant_id?: string;
    equipment_ids?: string[];

    access_type: string;
    can_export: boolean;
    can_download_documents: boolean;

    granted_at: string;
    granted_by: string;
    expires_at: string;

    access_token?: string;

    is_active: boolean;
    revoked_at?: string;
    revoked_by?: string;
    revoke_reason?: string;

    last_accessed_at?: string;
    access_count: number;

    purpose?: string;
    notes?: string;

    created_at: string;
}

export interface ComplianceDashboardItem extends EquipmentComplianceStatus {
    equipment_name: string;
    equipment_model?: string;
    serial_number?: string;
    plant_name?: string;
    organization_name: string;
    days_since_check: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ComplianceService {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    // ==========================================================================
    // COMPLIANCE STATUS
    // ==========================================================================

    async getEquipmentComplianceStatus(equipmentId: string): Promise<EquipmentComplianceStatus | null> {
        const { data, error } = await this.supabase
            .from('equipment_compliance_status')
            .select('*')
            .eq('equipment_id', equipmentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    async recalculateCompliance(equipmentId: string): Promise<void> {
        const { error } = await (this.supabase.rpc as any)('update_equipment_compliance_status', {
            p_equipment_id: equipmentId,
        });

        if (error) throw error;
    }

    async getComplianceDashboard(
        organizationId: string,
        filters?: {
            plantId?: string;
            status?: ComplianceStatus[];
            minScore?: number;
            maxScore?: number;
        }
    ): Promise<ComplianceDashboardItem[]> {
        let query = this.supabase
            .from('compliance_dashboard')
            .select('*')
            .eq('organization_id', organizationId);

        if (filters?.plantId) {
            query = query.eq('plant_id', filters.plantId);
        }

        if (filters?.status) {
            query = query.in('overall_status', filters.status);
        }

        if (filters?.minScore !== undefined) {
            query = query.gte('compliance_score', filters.minScore);
        }

        if (filters?.maxScore !== undefined) {
            query = query.lte('compliance_score', filters.maxScore);
        }

        query = query.order('compliance_score', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async getComplianceReport(equipmentId: string): Promise<{
        status: EquipmentComplianceStatus;
        requirements: ComplianceRequirement[];
        missingDocuments: any[];
        recentChecks: ComplianceCheck[];
    }> {
        // Get status
        const status = await this.getEquipmentComplianceStatus(equipmentId);
        if (!status) throw new Error('Compliance status not found');

        // Get requirements (simplified - would filter by equipment type)
        const { data: requirements } = await this.supabase
            .from('compliance_requirements')
            .select('*')
            .eq('is_critical', true)
            .limit(20);

        // Get recent checks
        const { data: recentChecks } = await this.supabase
            .from('compliance_checks')
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('performed_at', { ascending: false })
            .limit(10);

        // Calculate missing documents (simplified)
        const missingDocuments: any[] = [];
        if (!status.has_technical_file) {
            missingDocuments.push({ category: 'technical_file', title: 'Technical File' });
        }
        if (!status.has_risk_assessment) {
            missingDocuments.push({ category: 'risk_assessment', title: 'Risk Assessment' });
        }
        if (!status.has_user_manual) {
            missingDocuments.push({ category: 'user_manual', title: 'User Manual' });
        }

        return {
            status,
            requirements: requirements || [],
            missingDocuments,
            recentChecks: recentChecks || [],
        };
    }

    // ==========================================================================
    // COMPLIANCE CHECKS
    // ==========================================================================

    async createComplianceCheck(
        equipmentId: string,
        data: {
            check_type: string;
            performed_by: string;
            findings?: string;
            recommendations?: string;
            issues_found?: any;
            document_ids?: string[];
            requires_action?: boolean;
            action_deadline?: string;
        }
    ): Promise<ComplianceCheck> {
        // Get current status
        const statusBefore = await this.getEquipmentComplianceStatus(equipmentId);

        // Recalculate compliance
        await this.recalculateCompliance(equipmentId);

        // Get new status
        const statusAfter = await this.getEquipmentComplianceStatus(equipmentId);

        // Create check record
        const { data: check, error } = await (this.supabase as any)
            .from('compliance_checks')
            .insert({
                equipment_id: equipmentId,
                check_type: data.check_type,
                performed_by: data.performed_by,
                status_before: statusBefore?.overall_status,
                status_after: statusAfter?.overall_status,
                score_before: statusBefore?.compliance_score,
                score_after: statusAfter?.compliance_score || 0,
                findings: data.findings,
                recommendations: data.recommendations,
                issues_found: data.issues_found,
                document_ids: data.document_ids,
                requires_action: data.requires_action || false,
                action_deadline: data.action_deadline,
            })
            .select()
            .single();

        if (error) throw error;
        return check;
    }

    async getComplianceChecks(
        equipmentId: string,
        limit: number = 50
    ): Promise<ComplianceCheck[]> {
        const { data, error } = await (this.supabase as any)
            .from('compliance_checks')
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('performed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []) as ComplianceCheck[];
    }

    // ==========================================================================
    // INSPECTOR ACCESS
    // ==========================================================================

    async grantInspectorAccess(
        data: {
            inspector_email: string;
            inspector_name?: string;
            inspector_organization?: string;
            organization_id?: string;
            plant_id?: string;
            equipment_ids?: string[];
            access_type: string;
            expires_at: string;
            granted_by: string;
            purpose?: string;
            can_export?: boolean;
            can_download_documents?: boolean;
        }
    ): Promise<InspectorAccessGrant> {
        // Generate access token
        const accessToken = this.generateAccessToken();
        const accessTokenHash = await this.hashToken(accessToken);

        const { data: grant, error } = await (this.supabase as any)
            .from('inspector_access_grants')
            .insert({
                ...data,
                access_token_hash: accessTokenHash,
                can_export: data.can_export ?? true,
                can_download_documents: data.can_download_documents ?? true,
            })
            .select()
            .single();

        if (error) throw error;

        // Return grant with cleartext token (only time it's visible)
        return {
            ...(grant as Record<string, any>),
            access_token: accessToken,
        } as InspectorAccessGrant;
    }

    async revokeInspectorAccess(
        grantId: string,
        revokedBy: string,
        reason?: string
    ): Promise<void> {
        const { error } = await (this.supabase as any)
            .from('inspector_access_grants')
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
                revoked_by: revokedBy,
                revoke_reason: reason,
            })
            .eq('id', grantId);

        if (error) throw error;
    }

    async listInspectorAccess(organizationId: string): Promise<InspectorAccessGrant[]> {
        const { data, error } = await this.supabase
            .from('inspector_access_grants')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // ==========================================================================
    // REQUIREMENTS
    // ==========================================================================

    async getComplianceRequirements(
        regulation?: ComplianceRegulation
    ): Promise<ComplianceRequirement[]> {
        let query = this.supabase
            .from('compliance_requirements')
            .select('*');

        if (regulation) {
            query = query.eq('regulation', regulation);
        }

        query = query.order('is_critical', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    // ==========================================================================
    // EXPORTS
    // ==========================================================================

    async exportComplianceReport(
        equipmentId: string,
        format: 'json' | 'pdf' = 'json'
    ): Promise<any> {
        const report = await this.getComplianceReport(equipmentId);

        if (format === 'json') {
            return report;
        }

        // PDF generation would go here
        throw new Error('PDF export not yet implemented');
    }

    // ==========================================================================
    // UTILITIES
    // ==========================================================================

    private generateAccessToken(): string {
        // Generate secure random token
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    private async hashToken(token: string): Promise<string> {
        // Simple hash for demo - use proper crypto in production
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Singleton instance
let complianceServiceInstance: ComplianceService | null = null;

export function getComplianceService(): ComplianceService {
    if (!complianceServiceInstance) {
        complianceServiceInstance = new ComplianceService();
    }
    return complianceServiceInstance;
}