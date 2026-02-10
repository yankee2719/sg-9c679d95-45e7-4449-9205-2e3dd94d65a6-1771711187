import { useState } from 'react';
import { uploadDocument, UploadDocumentParams, UploadProgress } from '@/lib/documentApi';

export function useDocumentUpload() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState < UploadProgress | null > (null);
    const [error, setError] = useState < Error | null > (null);

    async function upload(params: UploadDocumentParams) {
        setUploading(true);
        setError(null);
        setProgress(null);

        try {
            const result = await uploadDocument(params, (prog) => {
                setProgress(prog);
            });

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
