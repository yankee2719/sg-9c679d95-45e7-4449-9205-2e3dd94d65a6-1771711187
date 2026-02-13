// ============================================================================
// API: GET /api/documents/search
// ============================================================================
// File: pages/api/documents/search.ts
// Ricerca documenti con filtri multipli
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

    try {
        // Auth check
        const { user, error: authError } = await verifyAuth(req);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const docService = getDocumentService();

        // Parse query parameters
        const query = req.query.q as string | undefined; // Full-text search
        const category = req.query.category as string | undefined;
        const equipmentId = req.query.equipmentId as string | undefined;
        const complianceTagsParam = req.query.complianceTags as string | undefined;
        const limitParam = req.query.limit as string | undefined;

        // Parse compliance tags (comma-separated)
        const complianceTags = complianceTagsParam
            ? complianceTagsParam.split(',').map(t => t.trim()).filter(Boolean)
            : undefined;

        // Parse limit (default 50, max 200)
        const limit = limitParam
            ? Math.min(Math.max(parseInt(limitParam), 1), 200)
            : 50;

        // Search documents
        const results = await docService.searchDocuments({
            query,
            category: category as any,
            equipmentId,
            complianceTags,
            limit,
        });

        // Calculate stats
        const stats = {
            total: results.length,
            byCategory: {} as Record<string, number>,
            byCompliance: {} as Record<string, number>,
        };

        results.forEach(doc => {
            // Count by category
            stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;

            // Count by compliance tags
            doc.compliance_tags?.forEach(tag => {
                stats.byCompliance[tag] = (stats.byCompliance[tag] || 0) + 1;
            });
        });

        return res.status(200).json({
            success: true,
            documents: results,
            stats,
            filters: {
                query: query || null,
                category: category || null,
                equipmentId: equipmentId || null,
                complianceTags: complianceTags || null,
                limit,
            },
        });

    } catch (error) {
        console.error('Search API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}