// src/pages/documents/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET_FALLBACK = "documents"; // cambialo se il tuo bucket ha nome diverso

export default function DocumentRedirectPage() {
    const router = useRouter();
    const id = router.query.id as string | undefined;
    const [error, setError] = useState < string | null > (null);

    useEffect(() => {
        if (!id) return;

        const run = async () => {
            try {
                const { data: doc, error: docErr } = await supabase
                    .from("documents")
                    .select("id, external_url, storage_bucket, storage_path")
                    .eq("id", id)
                    .single();

                if (docErr) throw docErr;

                // 1) External URL
                if (doc?.external_url) {
                    window.location.replace(doc.external_url);
                    return;
                }

                // 2) Storage signed URL
                const bucket = doc?.storage_bucket || BUCKET_FALLBACK;
                const path = doc?.storage_path;

                if (!path) throw new Error("Documento senza external_url e senza storage_path.");

                const { data: signed, error: signErr } = await supabase
                    .storage
                    .from(bucket)
                    .createSignedUrl(path, 60); // 60s

                if (signErr) throw signErr;
                if (!signed?.signedUrl) throw new Error("Signed URL non disponibile.");

                window.location.replace(signed.signedUrl);
            } catch (e: any) {
                setError(e.message ?? "Errore apertura documento");
            }
        };

        run();
    }, [id]);

    if (error) return <div style={{ padding: 24 }}>Errore: {error}</div>;
    return <div style={{ padding: 24 }}>Apertura documento...</div>;
}