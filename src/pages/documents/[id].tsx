import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Download, ExternalLink, FileText, Tag } from "lucide-react";
import { apiFetch } from "@/services/apiClient";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DocumentDetail {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    machine_id: string | null;
    machine_label: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    created_at: string | null;
    external_url: string | null;
    tags?: string[] | null;
}

type FallbackMap = Record<Language, string>;
const fb = (language: Language, map: FallbackMap) => map[language] || map.en;

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
        return value;
    }
}

function formatBytes(value: number | null | undefined) {
    if (!value || value <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function DocumentDetailPage() {
    const router = useRouter();
    const id = typeof router.query.id === "string" ? router.query.id : "";
    const { membership } = useAuth();
    const { t, language } = useLanguage();
    const tr = (key: string, map: FallbackMap) => {
        const value = t(key);
        return value === key ? fb(language, map) : value;
    };
    const [document, setDocument] = useState < DocumentDetail | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);

    useEffect(() => {
        if (!id) return;
        let mounted = true;
        setLoading(true);
        apiFetch < any > (`/api/documents/${id}`)
            .then((payload) => {
                if (!mounted) return;
                setDocument(payload.document ?? null);
                setError(null);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Error");
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [id]);

    const openDocument = async () => {
        if (!id) return;
        const payload = await apiFetch < any > (`/api/documents/${id}/download?redirect=0`);
        const signedUrl = payload.signedUrl || payload.data?.signedUrl;
        if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
    };

    const downloadDocument = async () => {
        if (!id) return;
        const payload = await apiFetch < any > (`/api/documents/${id}/download?redirect=0&download=1`);
        const signedUrl = payload.signedUrl || payload.data?.signedUrl;
        if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={`${document?.title || tr("documents.title", { it: "Documento", en: "Document", fr: "Document", es: "Documento" })} - MACHINA`} />
                <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-3">
                        <Button variant="ghost" asChild>
                            <Link href="/documents"><ArrowLeft className="mr-2 h-4 w-4" />{tr("common.back", { it: "Indietro", en: "Back", fr: "Retour", es: "Atrás" })}</Link>
                        </Button>
                        {document ? (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={openDocument}><ExternalLink className="mr-2 h-4 w-4" />{tr("documents.open", { it: "Apri", en: "Open", fr: "Ouvrir", es: "Abrir" })}</Button>
                                <Button onClick={downloadDocument}><Download className="mr-2 h-4 w-4" />{tr("documents.download", { it: "Scarica", en: "Download", fr: "Télécharger", es: "Descargar" })}</Button>
                            </div>
                        ) : null}
                    </div>

                    {loading ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">{tr("common.loading", { it: "Caricamento...", en: "Loading...", fr: "Chargement...", es: "Cargando..." })}</CardContent></Card>
                    ) : error ? (
                        <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>
                    ) : !document ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">{tr("documents.noResults", { it: "Documento non trovato", en: "Document not found", fr: "Document introuvable", es: "Documento no encontrado" })}</CardContent></Card>
                    ) : (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                                        <FileText className="h-6 w-6 text-orange-500" />
                                        <span>{document.title || tr("documents.title", { it: "Documento", en: "Document", fr: "Document", es: "Documento" })}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {document.description ? <p className="text-sm text-muted-foreground">{document.description}</p> : null}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">{document.category || "other"}</Badge>
                                        {document.machine_label ? <Badge variant="outline">{document.machine_label}</Badge> : null}
                                        <Badge variant="outline">{tr("documents.versions", { it: "Versioni", en: "Versions", fr: "Versions", es: "Versiones" })}: {document.version_count || 1}</Badge>
                                    </div>
                                    {document.tags?.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {document.tags.map((tag) => (
                                                <span key={tag} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground"><Tag className="h-3 w-3" />{tag}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader><CardTitle className="text-base font-semibold">{tr("documents.details", { it: "Dettagli", en: "Details", fr: "Détails", es: "Detalles" })}</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.language", { it: "Lingua", en: "Language", fr: "Langue", es: "Idioma" })}</span><span>{document.language || "—"}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.size", { it: "Dimensione", en: "Size", fr: "Taille", es: "Tamaño" })}</span><span>{formatBytes(document.file_size)}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.createdAt", { it: "Creato il", en: "Created", fr: "Créé le", es: "Creado el" })}</span><span>{formatDate(document.created_at, language)}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.updatedAt", { it: "Aggiornato il", en: "Updated", fr: "Mis à jour le", es: "Actualizado el" })}</span><span>{formatDate(document.updated_at, language)}</span></div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base font-semibold">{tr("documents.compliance", { it: "Compliance", en: "Compliance", fr: "Conformité", es: "Compliance" })}</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.machine", { it: "Macchina", en: "Machine", fr: "Machine", es: "Máquina" })}</span><span>{document.machine_label || "—"}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{tr("documents.reference", { it: "Riferimento", en: "Reference", fr: "Référence", es: "Referencia" })}</span><span className="text-right">{document.regulatory_reference || "—"}</span></div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
