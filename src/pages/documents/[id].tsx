import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const BUCKET_FALLBACK = "documents";

export default function DocumentRedirectPage() {
    const router = useRouter();
    const id = router.query.id as string | undefined;
    const { t } = useLanguage();
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

                if (doc?.external_url) {
                    window.location.replace(doc.external_url);
                    return;
                }

                const bucket = doc?.storage_bucket || BUCKET_FALLBACK;
                const path = doc?.storage_path;

                if (!path) throw new Error(t("documents.errorNoPath") || "Documento senza URL e senza storage path.");

                const { data: signed, error: signErr } = await supabase
                    .storage
                    .from(bucket)
                    .createSignedUrl(path, 60);

                if (signErr) throw signErr;
                if (!signed?.signedUrl) throw new Error(t("documents.errorNoSignedUrl") || "Signed URL non disponibile.");

                window.location.replace(signed.signedUrl);
            } catch (e: any) {
                setError(e.message ?? t("documents.errorOpen") || "Errore apertura documento");
            }
        };

        run();
    }, [id, t]);

    if (error) return <div style={{ padding: 24 }}>{t("common.error") || "Errore"}: {error}</div>;
    return <div style={{ padding: 24 }}>{t("documents.opening") || "Apertura documento..."}</div>;
}
