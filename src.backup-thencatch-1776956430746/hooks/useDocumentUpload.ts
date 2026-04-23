import { useState } from 'react';
import { documentService, UploadDocumentParams } from '@/services/documentService';

export interface UploadProgress {
    stage: 'checksum' | 'uploading' | 'saving' | 'complete';
    progress: number;
    message: string;
}

export function useDocumentUpload() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<Error | null>(null);

    async function upload(params: UploadDocumentParams) {
        setUploading(true);
        setError(null);
        setProgress({ stage: 'checksum', progress: 10, message: 'Calcolo checksum...' });

        try {
            setProgress({ stage: 'uploading', progress: 40, message: 'Upload file...' });

            const result = await documentService.uploadDocument(params);

            if (!result) {
                throw new Error('Upload fallito');
            }

            setProgress({ stage: 'complete', progress: 100, message: 'Completato' });
            return result;
        } catch (err: any) {
            setError(err);
            throw err;
        } finally {
            setUploading(false);
        }
    }

    function reset() {
        setUploading(false);
        setProgress(null);
        setError(null);
    }

    return {
        upload,
        uploading,
        progress,
        error,
        reset
    };
}