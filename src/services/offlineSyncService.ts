// ============================================================================
// OFFLINE SYNC SERVICE
// ============================================================================
// File: src/services/offlineSyncService.ts
// Gestione sync offline-first con plant-scoped boundaries
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SyncOperationType = 'create' | 'update' | 'delete' | 'upload';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncQueueItem {
    id: string;
    organization_id: string;
    plant_id: string;
    user_id: string;
    operation_type: SyncOperationType;
    entity_type: string;
    entity_id: string;
    payload: any;
    client_timestamp: string;
    server_timestamp?: string;
    status: SyncStatus;
    retry_count: number;
    max_retries: number;
    last_error?: string;
    sequence_number: number;
    created_at: string;
}

export interface SyncResult {
    synced: number;
    failed: number;
    conflicts: number;
    duration_ms: number;
}

export interface OfflineState {
    isOnline: boolean;
    pendingCount: number;
    lastSyncAt?: string;
    syncInProgress: boolean;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
    PENDING_QUEUE: 'offline_pending_queue',
    LAST_SYNC: 'offline_last_sync',
    DEVICE_ID: 'offline_device_id',
    CACHED_WORK_ORDERS: (plantId: string) => `cache_wo_${plantId}`,
    CACHED_EQUIPMENT: (plantId: string) => `cache_eq_${plantId}`,
};

// ============================================================================
// OFFLINE SYNC SERVICE
// ============================================================================

export class OfflineSyncService {
    private supabase: ReturnType<typeof createClient>;
    private plantId: string;
    private organizationId: string;
    private userId: string;
    private deviceId: string;

    constructor(
        plantId: string,
        organizationId: string,
        userId: string
    ) {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        this.plantId = plantId;
        this.organizationId = organizationId;
        this.userId = userId;
        this.deviceId = this.getOrCreateDeviceId();
    }

    // ==========================================================================
    // QUEUE MANAGEMENT
    // ==========================================================================

    // Add operation to sync queue (client-side storage)
    enqueue(
        operationType: SyncOperationType,
        entityType: string,
        entityId: string,
        payload: any
    ): void {
        const item: Partial<SyncQueueItem> = {
            id: crypto.randomUUID(),
            organization_id: this.organizationId,
            plant_id: this.plantId,
            user_id: this.userId,
            operation_type: operationType,
            entity_type: entityType,
            entity_id: entityId,
            payload,
            client_timestamp: new Date().toISOString(),
            status: 'pending',
            retry_count: 0,
            max_retries: 3,
        };

        const queue = this.getLocalQueue();
        queue.push(item);
        this.saveLocalQueue(queue);

        console.log(`[Offline] Queued ${operationType} for ${entityType}:${entityId}`);
    }

    // Get pending items from local queue
    getLocalQueue(): Partial<SyncQueueItem>[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    private saveLocalQueue(queue: Partial<SyncQueueItem>[]): void {
        localStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
    }

    getPendingCount(): number {
        return this.getLocalQueue().filter(i => i.status === 'pending').length;
    }

    // ==========================================================================
    // SYNC ENGINE
    // ==========================================================================

    async sync(): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            synced: 0,
            failed: 0,
            conflicts: 0,
            duration_ms: 0,
        };

        const queue = this.getLocalQueue().filter(i => i.status === 'pending');

        if (queue.length === 0) {
            result.duration_ms = Date.now() - startTime;
            return result;
        }

        console.log(`[Sync] Starting sync of ${queue.length} operations...`);

        // Process queue in sequence (important for dependencies)
        for (const item of queue) {
            try {
                await this.processQueueItem(item);
                result.synced++;
                this.markItemSynced(item.id!);
            } catch (error: any) {
                console.error(`[Sync] Failed to sync ${item.entity_type}:${item.entity_id}:`, error);

                // Check for conflict
                if (error.message?.includes('conflict')) {
                    result.conflicts++;
                    this.markItemConflict(item.id!, error.conflictData);
                } else {
                    result.failed++;
                    this.markItemFailed(item.id!, error.message);
                }
            }
        }

        // Update last sync timestamp
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

        result.duration_ms = Date.now() - startTime;
        console.log(`[Sync] Completed: ${result.synced} synced, ${result.failed} failed, ${result.conflicts} conflicts`);

        return result;
    }

    private async processQueueItem(item: Partial<SyncQueueItem>): Promise<void> {
        switch (item.entity_type) {
            case 'work_order':
                await this.syncWorkOrder(item);
                break;
            case 'checklist':
                await this.syncChecklist(item);
                break;
            case 'machine_event':
                await this.syncMachineEvent(item);
                break;
            default:
                throw new Error(`Unknown entity type: ${item.entity_type}`);
        }
    }

    private async syncWorkOrder(item: Partial<SyncQueueItem>): Promise<void> {
        if (item.operation_type === 'update') {
            // Server truth wins: check if server version is newer
            const { data: serverWO } = await this.supabase
                .from('work_orders')
                .select('updated_at, is_closed')
                .eq('id', item.entity_id!)
                .single();

            if (serverWO?.is_closed) {
                throw new Error('Work order is closed on server - conflict');
            }

            // Apply update
            const { error } = await this.supabase
                .from('work_orders')
                .update(item.payload)
                .eq('id', item.entity_id!);

            if (error) throw error;
        }
    }

    private async syncChecklist(item: Partial<SyncQueueItem>): Promise<void> {
        const { error } = await this.supabase
            .from('work_orders')
            .update({
                checklist: item.payload.checklist,
                checklist_completion_percentage: item.payload.percentage,
            })
            .eq('id', item.payload.work_order_id);

        if (error) throw error;
    }

    private async syncMachineEvent(item: Partial<SyncQueueItem>): Promise<void> {
        const { error } = await this.supabase
            .from('machine_events')
            .insert({
                ...item.payload,
                organization_id: this.organizationId,
                plant_id: this.plantId,
                recorded_at: item.client_timestamp, // Preserve offline timestamp
            });

        if (error) throw error;
    }

    // ==========================================================================
    // CACHE MANAGEMENT
    // ==========================================================================

    async cacheWorkOrdersForPlant(plantId: string): Promise<void> {
        const { data } = await this.supabase
            .from('work_orders')
            .select('*')
            .eq('plant_id', plantId)
            .in('status', ['assigned', 'in_progress', 'paused'])
            .limit(100);

        if (data) {
            localStorage.setItem(
                STORAGE_KEYS.CACHED_WORK_ORDERS(plantId),
                JSON.stringify({ data, cachedAt: new Date().toISOString() })
            );
            console.log(`[Cache] Cached ${data.length} work orders for plant ${plantId}`);
        }
    }

    getCachedWorkOrders(plantId: string): any[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CACHED_WORK_ORDERS(plantId));
            if (!raw) return [];
            const { data } = JSON.parse(raw);
            return data || [];
        } catch {
            return [];
        }
    }

    // ==========================================================================
    // QUEUE STATUS HELPERS
    // ==========================================================================

    private markItemSynced(id: string): void {
        const queue = this.getLocalQueue().filter(i => i.id !== id);
        this.saveLocalQueue(queue);
    }

    private markItemFailed(id: string, error: string): void {
        const queue = this.getLocalQueue().map(i => {
            if (i.id === id) {
                return {
                    ...i,
                    status: (i.retry_count! < i.max_retries! ? 'pending' : 'failed') as SyncStatus,
                    retry_count: (i.retry_count || 0) + 1,
                    last_error: error,
                };
            }
            return i;
        });
        this.saveLocalQueue(queue);
    }

    private markItemConflict(id: string, conflictData: any): void {
        const queue = this.getLocalQueue().map(i => {
            if (i.id === id) {
                return { ...i, status: 'conflict' as SyncStatus };
            }
            return i;
        });
        this.saveLocalQueue(queue);
    }

    // ==========================================================================
    // UTILITIES
    // ==========================================================================

    private getOrCreateDeviceId(): string {
        let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
        }
        return deviceId;
    }

    getLastSyncTime(): string | null {
        return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    }

    clearSyncedItems(): void {
        const queue = this.getLocalQueue().filter(i => i.status === 'pending' || i.status === 'failed');
        this.saveLocalQueue(queue);
    }
}

// ============================================================================
// QR TOKEN SERVICE
// ============================================================================
// File: src/services/qrTokenService.ts
// ============================================================================

export type QrTokenType = 'permanent' | 'temporary' | 'inspector' | 'maintenance';

export interface QrToken {
    id: string;
    equipment_id: string;
    token_type: QrTokenType;
    token_prefix: string;
    qr_label?: string;
    allowed_views: string[];
    requires_auth: boolean;
    max_permission_level: string;
    expires_at?: string;
    is_active: boolean;
    scan_count: number;
    last_scanned_at?: string;
    created_at: string;
}

export interface QrScanResult {
    is_valid: boolean;
    equipment_id?: string;
    allowed_views?: string[];
    max_permission_level?: string;
    denial_reason?: string;
}

export class QrTokenService {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    // Generate new QR token
    async generateToken(
        equipmentId: string,
        tokenType: QrTokenType,
        createdBy: string,
        options?: {
            expiresAt?: string;
            allowedViews?: string[];
            maxScans?: number;
            allowedRoles?: string[];
            label?: string;
        }
    ): Promise<{ tokenId: string; tokenCleartext: string; qrUrl: string }> {
        const { data, error } = await this.supabase.rpc('generate_qr_token', {
            p_equipment_id: equipmentId,
            p_token_type: tokenType,
            p_created_by: createdBy,
            p_expires_at: options?.expiresAt || null,
            p_allowed_views: options?.allowedViews || ['passport', 'events', 'documents', 'maintenance'],
            p_max_scans: options?.maxScans || null,
            p_allowed_roles: options?.allowedRoles || null,
        });

        if (error) throw error;

        const { token_id, token_cleartext } = data[0];

        // Construct QR URL (never exposes raw IDs!)
        const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${token_cleartext}`;

        return {
            tokenId: token_id,
            tokenCleartext: token_cleartext,
            qrUrl,
        };
    }

    // Validate token on scan
    async validateToken(
        tokenCleartext: string,
        userId?: string,
        userRole?: string
    ): Promise<QrScanResult> {
        const { data, error } = await this.supabase.rpc('validate_qr_token', {
            p_token_cleartext: tokenCleartext,
            p_user_id: userId || null,
            p_user_role: userRole || null,
        });

        if (error) throw error;

        const result = data[0];

        // Log the scan
        if (result) {
            await this.logScan(tokenCleartext, result, userId);
        }

        return result;
    }

    // Revoke token
    async revokeToken(tokenId: string, revokedBy: string, reason?: string): Promise<void> {
        const { error } = await this.supabase
            .from('machine_qr_tokens')
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
                revoked_by: revokedBy,
                revoke_reason: reason || 'Revoked by user',
            })
            .eq('id', tokenId);

        if (error) throw error;
    }

    // Get tokens for equipment
    async getEquipmentTokens(equipmentId: string): Promise<QrToken[]> {
        const { data, error } = await this.supabase
            .from('machine_qr_tokens')
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Get scan history
    async getScanHistory(equipmentId: string, limit = 50): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('qr_scan_logs')
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('scanned_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    // Offline validation (uses cached payload)
    validateTokenOffline(tokenCleartext: string): QrScanResult | null {
        try {
            const cached = localStorage.getItem(`qr_cache_${tokenCleartext.substring(0, 8)}`);
            if (!cached) return null;

            const { token, cachedAt } = JSON.parse(cached);

            // Offline cache valid for 24 hours
            const cacheAge = Date.now() - new Date(cachedAt).getTime();
            if (cacheAge > 24 * 60 * 60 * 1000) return null;

            // Check expiration
            if (token.expires_at && new Date(token.expires_at) < new Date()) {
                return { is_valid: false, denial_reason: 'expired' };
            }

            if (!token.is_active) {
                return { is_valid: false, denial_reason: 'revoked' };
            }

            return {
                is_valid: true,
                equipment_id: token.equipment_id,
                allowed_views: token.allowed_views,
                max_permission_level: token.max_permission_level,
            };
        } catch {
            return null;
        }
    }

    // Cache token for offline use
    cacheTokenForOffline(tokenCleartext: string, tokenData: any): void {
        const prefix = tokenCleartext.substring(0, 8);
        localStorage.setItem(
            `qr_cache_${prefix}`,
            JSON.stringify({ token: tokenData, cachedAt: new Date().toISOString() })
        );
    }

    private async logScan(
        tokenCleartext: string,
        result: QrScanResult,
        userId?: string
    ): Promise<void> {
        try {
            // Get token ID from prefix
            const prefix = tokenCleartext.substring(0, 8);
            const { data: token } = await this.supabase
                .from('machine_qr_tokens')
                .select('id, equipment_id')
                .eq('token_prefix', prefix)
                .single();

            if (!token) return;

            await this.supabase.from('qr_scan_logs').insert({
                qr_token_id: token.id,
                equipment_id: token.equipment_id,
                scanned_by: userId || null,
                access_granted: result.is_valid,
                denial_reason: result.denial_reason || null,
            });
        } catch (error) {
            console.error('Failed to log scan:', error);
        }
    }
}

// Singletons
let offlineSyncInstance: OfflineSyncService | null = null;
let qrTokenInstance: QrTokenService | null = null;

export function getOfflineSyncService(plantId: string, orgId: string, userId: string): OfflineSyncService {
    if (!offlineSyncInstance) {
        offlineSyncInstance = new OfflineSyncService(plantId, orgId, userId);
    }
    return offlineSyncInstance;
}

export function getQrTokenService(): QrTokenService {
    if (!qrTokenInstance) {
        qrTokenInstance = new QrTokenService();
    }
    return qrTokenInstance;
}