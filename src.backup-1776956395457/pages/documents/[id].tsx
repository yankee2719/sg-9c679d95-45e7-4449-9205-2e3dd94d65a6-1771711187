import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Download, ExternalLink, FileText, HardDriveDownload, Trash2, Tag } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/services/apiClient";
import {
    cacheDocumentForOffline,
    downloadCachedDocument,
    getCachedDocumentEntry,
    openCachedDocument,
    removeCachedDocument,
} from "@/lib/offlineDocumentCache";

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
    mime_type?: string | null;
    tags?: string[] | null;
}

const I18N: Record<Language, Record<string, string>> = {
    it: {
        title: "Documento",
        back: "Indietro",
        open: "Apri",
        download: "Scarica",
        saveOffline: "Salva offline",
        removeOffline: "Rimuovi offline",
        offlineReady: "Disponibile offline",
        loading: "Caricamento...",
        notFound: "Documento non trovato",
        details: "Dettagli",
        language: "Lingua",
        size: "Dimensione",
        createdAt: "Creato il",
        updatedAt: "Aggiornato il",
        machine: "Macchina",
        reference: "Riferimento",
        versions: "Versioni",
        cachedNotice: "Stai vedendo una copia locale del documento.",
    },
    en: {
        title: "Document",
        back: "Back",
        open: "Open",
        download: "Download",
        saveOffline: "Save offline",
        removeOffline: "Remove offline",
        offlineReady: "Available offline",
        loading: "Loading...",
        notFound: "Document not found",
        details: "Details",
        language: "Language",
        size: "Size",
        createdAt: "Created on",
        updatedAt: "Updated on",
        machine: "Machine",
        reference: "Reference",
        versions: "Version history",
        cachedNotice: "You are viewing a local cached copy.",
    },
    fr: {
        title: "Document",
        back: "Retour",
        open: "Ouvrir",
        download: "Télécharger",
        saveOffline: "Enregistrer hors ligne",
        removeOffline: "Supprimer hors ligne",
        offlineReady: "Disponible hors ligne",
        loading: "Chargement...",
        notFound: "Document introuvable",
        details: "Détails",
        language: "Langue",
        size: "Taille",
        createdAt: "Créé le",
        updatedAt: "Mis à jour le",
        machine: "Machine",
        reference: "Référence",
        versions: "Versions",
        cachedNotice: "Vous consultez une copie locale en cache.",
    },
    es: {
        title: "Documento",
        back: "Atrás",
        open: "Abrir",
        download: "Descargar",
        saveOffline: "Guardar offline",
        removeOffline: "Quitar offline",
        offlineReady: "Disponible offline",
        loading: "Cargando...",
        notFound: "Documento no encontrado",
        details: "Detalles",
        language: "Idioma",
        size: "Tamaño",
        createdAt: "Creado el",
        updatedAt: "Actualizado el",
        machine: "Máquina",
        reference: "Referencia",
        versions: "Versiones",
        cachedNotice: "Estás viendo una copia local en caché.",
    },
};

function formatDate(value: string | null | undefined, lang: Language) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
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
    const id = useMemo(() => (typeof router.query.id === "string" ? router.query.id : ""), [router.query.id]);
    const { membership } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const L = I18N[language] || I18N.en;

    const [document, setDocument] = useState < DocumentDetail | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);
    const [isCached, setIsCached] = useState(false);
    const [usingCachedMetadata, setUsingCachedMetadata] = useState(false);
    const [savingOffline, setSavingOffline] = useState(false);

    useEffect(() => {
        if (!id) return;
        let mounted = true;

        async function load() {
            setLoading(true);
            setError(null);
            setIsCached(!!getCachedDocumentEntry(id));
            try {
                const payload = await apiFetch < any > (`/api/documents/${id}`);
                if (!mounted) return;
                setDocument(payload.document ?? null);
                setUsingCachedMetadata(false);
            } catch (err: any) {
                const cached = getCachedDocumentEntry(id);
                if (!mounted) return;
                if (cached) {
                    setDocument({
                        id: cached.id,
                        title: cached.title,
                        description: null,
                        category: cached.category ?? null,
                        language: null,
                        regulatory_reference: null,
                        machine_id: cached.machineId ?? null,
                        machine_label: cached.machineLabel ?? null,
                        version_count: null,
                        file_size: cached.fileSize ?? null,
                        updated_at: cached.savedAt,
                        created_at: null,
                        external_url: null,
                        mime_type: cached.mimeType,
                        tags: null,
                    });
                    setUsingCachedMetadata(true);
                    setError(null);
                } else {
                    setError(err?.message || "Error");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void load();
        return () => {
            mounted = false;
        };
    }, [id]);

    const openDocument = async () => {
        if (!id) return;
        if (!navigator.onLine) {
            await openCachedDocument(id);
            return;
        }
        const payload = await apiFetch < any > (`/api/documents/${id}/download?redirect=0`);
        const signedUrl = payload.signedUrl || payload.data?.signedUrl;
        if (signedUrl) {
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
    };

    const downloadDocument = async () => {
        if (!id) return;
        if (!navigator.onLine) {
            await downloadCachedDocument(id);
            return;
        }
        const payload = await apiFetch < any > (`/api/documents/${id}/download?redirect=0&download=1`);
        const signedUrl = payload.signedUrl || payload.data?.signedUrl;
        if (signedUrl) {
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
    };

    const handleSaveOffline = async () => {
        if (!id) return;
        setSavingOffline(true);
        try {
            await cacheDocumentForOffline(id);
            setIsCached(true);
            toast({ title: L.offlineReady, description: document?.title || L.title });
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Offline save failed", variant: "destructive" });
        } finally {
            setSavingOffline(false);
        }
    };

    const handleRemoveOffline = async () => {
        if (!id) return;
        try {
            await removeCachedDocument(id);
            setIsCached(false);
            toast({ title: L.removeOffline, description: document?.title || L.title });
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Remove offline failed", variant: "destructive" });
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={`${document?.title || L.title} - MACHINA`} />
                <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-3">
                        <Button variant="ghost" asChild>
                            <Link href="/documents"><ArrowLeft className="mr-2 h-4 w-4" />{L.back}</Link>
                        </Button>
                        {document ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" onClick={() => void openDocument()}><ExternalLink className="mr-2 h-4 w-4" />{L.open}</Button>
                                <Button onClick={() => void downloadDocument()}><Download className="mr-2 h-4 w-4" />{L.download}</Button>
                                {isCached ? (
                                    <Button variant="outline" onClick={() => void handleRemoveOffline()}><Trash2 className="mr-2 h-4 w-4" />{L.removeOffline}</Button>
                                ) : (
                                    <Button variant="outline" disabled={savingOffline || !navigator.onLine} onClick={() => void handleSaveOffline()}>
                                        <HardDriveDownload className="mr-2 h-4 w-4" />{L.saveOffline}
                                    </Button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {usingCachedMetadata ? (
                        <Card className="border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10">
                            <CardContent className="p-4 text-sm text-orange-700 dark:text-orange-300">{L.cachedNotice}</CardContent>
                        </Card>
                    ) : null}

                    {loading ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">{L.loading}</CardContent></Card>
                    ) : error ? (
                        <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>
                    ) : !document ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">{L.notFound}</CardContent></Card>
                    ) : (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                                        <FileText className="h-6 w-6 text-orange-500" />
                                        <span>{document.title || L.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {document.description ? <p className="text-sm text-muted-foreground">{document.description}</p> : null}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">{document.category || "other"}</Badge>
                                        {document.machine_label ? <Badge variant="outline">{document.machine_label}</Badge> : null}
                                        <Badge variant="outline">{L.versions}: {document.version_count || 1}</Badge>
                                        {isCached ? <Badge className="bg-green-600 text-white hover:bg-green-600">{L.offlineReady}</Badge> : null}
                                    </div>
                                    {document.tags?.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {document.tags.map((tag) => (
                                                <span key={tag} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                                    <Tag className="h-3 w-3" />{tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader><CardTitle className="text-base font-semibold">{L.details}</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.language}</span><span>{document.language || "—"}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.size}</span><span>{formatBytes(document.file_size)}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.createdAt}</span><span>{formatDate(document.created_at, language)}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.updatedAt}</span><span>{formatDate(document.updated_at, language)}</span></div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base font-semibold">{L.reference}</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.machine}</span><span>{document.machine_label || "—"}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">{L.reference}</span><span>{document.regulatory_reference || "—"}</span></div>
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
