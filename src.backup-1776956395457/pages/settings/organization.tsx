import { useEffect, useMemo, useState } from "react";
import { Building2, Factory, ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function OrgIcon({ type }: { type: "manufacturer" | "customer" | null }) {
    const Icon = type === "manufacturer" ? Factory : Building2;
    return <Icon className="h-4 w-4" />;
}

const copy = {
    it: {
        seo: "Organizzazione attiva - MACHINA",
        title: "Organizzazione attiva",
        description:
            "Seleziona il contesto reale della web app. Tutte le viste devono leggere questa organizzazione come contesto attivo.",
        currentMembership: "Contesto corrente",
        membershipsTitle: "Membership attive",
        membershipsDescription:
            "Controlla rapidamente in quali organizzazioni sei attivo e con quale ruolo.",
        noMemberships: "Nessuna membership attiva trovata.",
        active: "Attiva",
        fallback: "organizzazione",
        reload: "Ricarica",
        loading: "Caricamento organizzazioni...",
        logoTitle: "Logo organizzazione",
        logoDescription: "Carica un logo opzionale. Verrà mostrato in sidebar e header solo se presente.",
        chooseFile: "Seleziona logo",
        saveLogo: "Salva logo",
        removeLogo: "Rimuovi logo",
        selectedFile: "File selezionato",
        noLogo: "Nessun logo caricato.",
        logoTooLarge: "Il file è troppo grande. Tieni il logo sotto 1 MB.",
        logoInvalidType: "Carica un file immagine PNG, JPG, JPEG, SVG o WEBP.",
        saveSuccess: "Logo organizzazione aggiornato.",
        removeSuccess: "Logo organizzazione rimosso.",
        saveError: "Errore salvataggio logo organizzazione.",
        preview: "Anteprima",
        activeOrg: "Organizzazione attiva",
    },
    en: {
        seo: "Active organization - MACHINA",
        title: "Active organization",
        description:
            "Select the real app context. All views should read this organization as the active context.",
        currentMembership: "Current context",
        membershipsTitle: "Active memberships",
        membershipsDescription:
            "Quickly check which organizations you are active in and with which role.",
        noMemberships: "No active memberships found.",
        active: "Active",
        fallback: "organization",
        reload: "Reload",
        loading: "Loading organizations...",
        logoTitle: "Organization logo",
        logoDescription: "Upload an optional logo. It will appear in the sidebar and header only when available.",
        chooseFile: "Choose logo",
        saveLogo: "Save logo",
        removeLogo: "Remove logo",
        selectedFile: "Selected file",
        noLogo: "No logo uploaded.",
        logoTooLarge: "The file is too large. Keep the logo under 1 MB.",
        logoInvalidType: "Upload a PNG, JPG, JPEG, SVG or WEBP image.",
        saveSuccess: "Organization logo updated.",
        removeSuccess: "Organization logo removed.",
        saveError: "Error saving organization logo.",
        preview: "Preview",
        activeOrg: "Active organization",
    },
    fr: {
        seo: "Organisation active - MACHINA",
        title: "Organisation active",
        description:
            "Sélectionnez le vrai contexte de l’application. Toutes les vues doivent lire cette organisation comme contexte actif.",
        currentMembership: "Contexte actuel",
        membershipsTitle: "Adhésions actives",
        membershipsDescription:
            "Vérifiez rapidement dans quelles organisations vous êtes actif et avec quel rôle.",
        noMemberships: "Aucune adhésion active trouvée.",
        active: "Active",
        fallback: "organisation",
        reload: "Recharger",
        loading: "Chargement des organisations...",
        logoTitle: "Logo de l'organisation",
        logoDescription: "Téléversez un logo optionnel. Il sera visible dans la barre latérale et l'en-tête uniquement s'il est présent.",
        chooseFile: "Choisir le logo",
        saveLogo: "Enregistrer le logo",
        removeLogo: "Supprimer le logo",
        selectedFile: "Fichier sélectionné",
        noLogo: "Aucun logo téléversé.",
        logoTooLarge: "Le fichier est trop volumineux. Gardez le logo sous 1 Mo.",
        logoInvalidType: "Téléversez une image PNG, JPG, JPEG, SVG ou WEBP.",
        saveSuccess: "Logo de l'organisation mis à jour.",
        removeSuccess: "Logo de l'organisation supprimé.",
        saveError: "Erreur lors de l'enregistrement du logo.",
        preview: "Aperçu",
        activeOrg: "Organisation active",
    },
    es: {
        seo: "Organización activa - MACHINA",
        title: "Organización activa",
        description:
            "Selecciona el contexto real de la aplicación. Todas las vistas deben leer esta organización como contexto activo.",
        currentMembership: "Contexto actual",
        membershipsTitle: "Membresías activas",
        membershipsDescription:
            "Comprueba rápidamente en qué organizaciones estás activo y con qué rol.",
        noMemberships: "No se encontraron membresías activas.",
        active: "Activa",
        fallback: "organización",
        reload: "Recargar",
        loading: "Cargando organizaciones...",
        logoTitle: "Logo de la organización",
        logoDescription: "Carga un logo opcional. Solo se mostrará en la barra lateral y en el encabezado si existe.",
        chooseFile: "Seleccionar logo",
        saveLogo: "Guardar logo",
        removeLogo: "Quitar logo",
        selectedFile: "Archivo seleccionado",
        noLogo: "No hay logo cargado.",
        logoTooLarge: "El archivo es demasiado grande. Mantén el logo por debajo de 1 MB.",
        logoInvalidType: "Carga una imagen PNG, JPG, JPEG, SVG o WEBP.",
        saveSuccess: "Logo de la organización actualizado.",
        removeSuccess: "Logo de la organización eliminado.",
        saveError: "Error al guardar el logo de la organización.",
        preview: "Vista previa",
        activeOrg: "Organización activa",
    },
} as const;

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("read_error"));
        reader.readAsDataURL(file);
    });
}

export default function OrganizationSettingsPage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const { toast } = useToast();
    const {
        memberships,
        activeOrgId,
        activeOrgType,
        activeRole,
        loading,
        saving,
        reload,
        error,
    } = useActiveOrganization();

    const [logoUrl, setLogoUrl] = useState < string | null > (null);
    const [draftLogoUrl, setDraftLogoUrl] = useState < string | null > (null);
    const [selectedFileName, setSelectedFileName] = useState < string | null > (null);
    const [logoBusy, setLogoBusy] = useState(false);

    const currentMembership = useMemo(
        () => memberships.find((membership) => membership.organization_id === activeOrgId) ?? null,
        [memberships, activeOrgId]
    );

    useEffect(() => {
        let cancelled = false;

        const loadLogo = async () => {
            if (!activeOrgId) {
                setLogoUrl(null);
                setDraftLogoUrl(null);
                setSelectedFileName(null);
                return;
            }

            const { data, error } = await supabase
                .from("organizations")
                .select("logo_url")
                .eq("id", activeOrgId)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                console.error("Organization settings logo load error:", error);
                return;
            }

            const currentLogo = data?.logo_url ?? null;
            setLogoUrl(currentLogo);
            setDraftLogoUrl(currentLogo);
            setSelectedFileName(null);
        };

        void loadLogo();

        return () => {
            cancelled = true;
        };
    }, [activeOrgId]);

    const handleLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
        if (!allowed.includes(file.type)) {
            toast({ title: text.logoInvalidType, variant: "destructive" });
            event.target.value = "";
            return;
        }

        if (file.size > 1024 * 1024) {
            toast({ title: text.logoTooLarge, variant: "destructive" });
            event.target.value = "";
            return;
        }

        try {
            const dataUrl = await fileToDataUrl(file);
            setDraftLogoUrl(dataUrl);
            setSelectedFileName(file.name);
        } catch (error) {
            console.error(error);
            toast({ title: text.saveError, variant: "destructive" });
        }
    };

    const broadcastLogoChange = (nextLogoUrl: string | null) => {
        if (typeof window === "undefined" || !activeOrgId) return;
        window.dispatchEvent(new CustomEvent("machina:organization-logo-updated", {
            detail: {
                organizationId: activeOrgId,
                logoUrl: nextLogoUrl,
            },
        }));
    };

    const saveLogo = async () => {
        if (!activeOrgId) return;

        setLogoBusy(true);
        try {
            const { error } = await supabase
                .from("organizations")
                .update({ logo_url: draftLogoUrl ?? null })
                .eq("id", activeOrgId);

            if (error) throw error;

            setLogoUrl(draftLogoUrl ?? null);
            setSelectedFileName(null);
            broadcastLogoChange(draftLogoUrl ?? null);
            toast({ title: text.saveSuccess });
        } catch (error) {
            console.error("Organization settings logo save error:", error);
            toast({ title: text.saveError, variant: "destructive" });
        } finally {
            setLogoBusy(false);
        }
    };

    const removeLogo = async () => {
        if (!activeOrgId) return;

        setLogoBusy(true);
        try {
            const { error } = await supabase
                .from("organizations")
                .update({ logo_url: null })
                .eq("id", activeOrgId);

            if (error) throw error;

            setLogoUrl(null);
            setDraftLogoUrl(null);
            setSelectedFileName(null);
            broadcastLogoChange(null);
            toast({ title: text.removeSuccess });
        } catch (error) {
            console.error("Organization settings logo remove error:", error);
            toast({ title: text.saveError, variant: "destructive" });
        } finally {
            setLogoBusy(false);
        }
    };

    return (
        <MainLayout userRole={(activeRole as string) ?? "technician"}>
            <SEO title={text.seo} />

            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>{text.title}</CardTitle>
                                <CardDescription>{text.description}</CardDescription>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => void reload()}
                                disabled={loading || saving || logoBusy}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading || saving || logoBusy ? "animate-spin" : ""}`} />
                                {text.reload}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <OrganizationSwitcher />

                        {loading && (
                            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                {text.loading}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {currentMembership && (
                            <div className="rounded-xl border border-border bg-muted/30 p-4">
                                <div className="mb-2 text-sm font-medium text-muted-foreground">
                                    {text.currentMembership}
                                </div>
                                <div className="mb-2 flex items-center gap-2">
                                    <OrgIcon type={activeOrgType} />
                                    <div className="font-medium">
                                        {currentMembership.organization?.name}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        {activeOrgType ?? text.fallback}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">
                                        {activeRole ?? "technician"}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {!loading && memberships.length === 0 && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                                {text.noMemberships}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.logoTitle}</CardTitle>
                        <CardDescription>{text.logoDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="rounded-2xl border border-dashed border-border bg-muted/25 p-4">
                            <div className="mb-3 text-sm font-medium text-muted-foreground">{text.preview}</div>
                            {draftLogoUrl ? (
                                <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={draftLogoUrl} alt={text.activeOrg} className="max-h-full max-w-full object-contain" />
                                </div>
                            ) : (
                                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-border bg-card text-center text-sm text-muted-foreground">
                                    <ImagePlus className="mb-2 h-8 w-8" />
                                    {text.noLogo}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="organization-logo">{text.chooseFile}</Label>
                                <Input id="organization-logo" type="file" accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoFile} />
                                <div className="text-xs text-muted-foreground">
                                    {selectedFileName ? `${text.selectedFile}: ${selectedFileName}` : text.noLogo}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button onClick={() => void saveLogo()} disabled={logoBusy || !activeOrgId || draftLogoUrl === logoUrl}>
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {text.saveLogo}
                                </Button>
                                <Button variant="outline" onClick={() => void removeLogo()} disabled={logoBusy || !activeOrgId || !logoUrl}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {text.removeLogo}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.membershipsTitle}</CardTitle>
                        <CardDescription>{text.membershipsDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {memberships.map((membership) => (
                            <div
                                key={membership.organization_id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <OrgIcon type={membership.organization?.type ?? null} />
                                        <div className="truncate font-medium">
                                            {membership.organization?.name ?? membership.organization_id}
                                        </div>
                                    </div>
                                    <div className="text-sm capitalize text-muted-foreground">
                                        {membership.organization?.type ?? text.fallback} · {membership.role}
                                    </div>
                                </div>
                                {membership.organization_id === activeOrgId && (
                                    <Badge className="capitalize">{text.active}</Badge>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
