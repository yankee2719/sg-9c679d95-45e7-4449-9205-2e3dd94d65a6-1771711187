/**
 * Calcola SHA-256 checksum di un file
 */
export async function calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica integrità file dopo download
 */
export async function verifyFileIntegrity(
    file: Blob,
    expectedChecksum: string
): Promise<boolean> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const actualChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return actualChecksum === expectedChecksum;
}

/**
 * Formatta dimensione file in modo leggibile
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Ottieni estensione file
 */
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Valida tipo MIME
 */
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/zip'
] as const;

export function isAllowedMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Valida dimensione file (max 100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function isValidFileSize(size: number): boolean {
    return size > 0 && size <= MAX_FILE_SIZE;
}