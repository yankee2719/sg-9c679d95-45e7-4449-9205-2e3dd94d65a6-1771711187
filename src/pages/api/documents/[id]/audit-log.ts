// ============================================================================
// API: GET /api/documents/[id]/audit-log
// ============================================================================
// File: pages/api/documents/[id]/audit-log.ts
// Recupera audit trail completo di tutte le azioni sul documento
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentService } from '@/services/documentService';
import { createClient } from '@supabase/supabase-js';

// Helper per estrarre token
function getAuthToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    const cookies = req.headers.cookie?.split(';') || [];
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sb-access-token' || name.includes('auth-token')) {
            return value;
        }
    }

    return null;
}

// Helper per verificare auth
async function verifyAuth(req: NextApiRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const token = getAuthToken(req);
    if (!token) {
        return { user: null, error: 'No auth token' };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Solo GET method
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['GET']
        });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Document ID is required' });
    }

    try {
        // Auth check
        const { user, error: authError } = await verifyAuth(req);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const docService = getDocumentService();

        // Check view permission
        const hasPermission = await docService.checkUserPermission(
            user.id,
            id,
            'view'
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Access denied - View permission required'
            });
        }

        // Get query parameters
        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : 100;

        const action = req.query.action as string | undefined;

        // Validate limit
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Limit must be between 1 and 1000'
            });
        }

        // Get audit log
        const auditLog = await docService.getAuditLog(id, limit);

        // Filter by action if specified
        const filteredLog = action
            ? auditLog.filter(entry => entry.action === action)
            : auditLog;

        // Calculate stats
        const stats = {
            total: filteredLog.length,
            byAction: {} as Record<string, number>,
            successRate: 0,
            failedCount: 0,
        };

        filteredLog.forEach(entry => {
            // Count by action
            stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;

            // Count failures
            if (!entry.success) {
                stats.failedCount++;
            }
        });

        // Calculate success rate
        stats.successRate = stats.total > 0
            ? ((stats.total - stats.failedCount) / stats.total) * 100
            : 100;

        return res.status(200).json({
            success: true,
            auditLog: filteredLog,
            stats,
            limit,
            hasMore: auditLog.length === limit, // Indica se ci sono più risultati
        });

    } catch (error) {
        console.error('Audit Log API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit log',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}