import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authService } from "@/services/authService";

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
                const session = await authService.getCurrentSession();
                if (!session) throw new Error("Not authenticated");

                const response = await fetch(`/api/documents/${id}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const text = await response.text();
                const payload = text ? JSON.parse(text) : null;

                if (!response.ok) throw new Error(payload?.error || payload?.message || `API error ${response.status}`);

                const doc = payload?.data;
                if (!doc) throw new Error(t("documents.errorOpen") || "Errore apertura documento");

                if (doc.external_url) {
                    window.location.replace(doc.external_url);
                    return;
                }

                const bucket = doc.storage_bucket || BUCKET_FALLBACK;
                const path = doc.storage_path;
                if (!path) throw new Error(t("documents.errorNoPath") || "Documento senza URL e senza storage path.");

                const encodedPath = encodeURIComponent(path);
                const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodedPath}`;
                const signResponse = await fetch(publicUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ expiresIn: 60 }),
                });

                const signText = await signResponse.text();
                const signPayload = signText ? JSON.parse(signText) : null;
                if (!signResponse.ok) throw new Error(signPayload?.error || signPayload?.message || "Signed URL non disponibile.");

                const signedUrl = signPayload?.signedURL || signPayload?.signedUrl;
                if (!signedUrl) throw new Error(t("documents.errorNoSignedUrl") || "Signed URL non disponibile.");

                const absoluteUrl = signedUrl.startsWith("http")
                    ? signedUrl
                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${signedUrl}`;

                window.location.replace(absoluteUrl);
            } catch (e: any) {
                setError(e?.message ?? t("documents.errorOpen") || "Errore apertura documento");
            }
        };

        void run();
    }, [id, t]);

    if (error) return <div style={{ padding: 24 }}>{t("common.error") || "Errore"}: {error}</div>;
    return <div style={{ padding: 24 }}>{t("documents.opening") || "Apertura documento..."}</div>;
}

