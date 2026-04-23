import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { createPlant, getPlantDetail, updatePlant } from "@/services/plantService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasMinimumRole, normalizeRole } from "@/lib/roles";

type OrgType = "manufacturer" | "customer" | null;

interface PlantEditorPageProps {
    mode: "create" | "edit";
    plantId?: string | null;
}

const copy = {
    it: {
        createTitle: "Nuovo stabilimento",
        editTitle: "Modifica stabilimento",
        createSubtitle: "Crea uno stabilimento nel contesto cliente attivo.",
        editSubtitle: "Aggiorna i dati principali dello stabilimento.",
        loading: "Caricamento stabilimento...",
        forbidden: "Questa pagina è disponibile solo nel contesto cliente finale con permessi di modifica.",
        mainData: "Dati principali",
        name: "Nome stabilimento *",
        code: "Codice",
        namePlaceholder: "Es. Stabilimento Nord",
        codePlaceholder: "Es. PLT-NORD-01",
        createSuccess: "Stabilimento creato",
        updateSuccess: "Stabilimento aggiornato",
        genericError: "Errore durante il salvataggio dello stabilimento",
        back: "Torna a Stabilimenti",
        saveCreate: "Crea stabilimento",
        saveEdit: "Salva modifiche",
    },
    en: {
        createTitle: "New plant",
        editTitle: "Edit plant",
        createSubtitle: "Create a plant in the active customer context.",
        editSubtitle: "Update the main plant data.",
        loading: "Loading plant...",
        forbidden: "This page is only available in the final customer context with edit permissions.",
        mainData: "Main data",
        name: "Plant name *",
        code: "Code",
        namePlaceholder: "e.g. North Plant",
        codePlaceholder: "e.g. PLT-NORTH-01",
        createSuccess: "Plant created",
        updateSuccess: "Plant updated",
        genericError: "Error while saving plant",
        back: "Back to Plants",
        saveCreate: "Create plant",
        saveEdit: "Save changes",
    },
    fr: {
        createTitle: "Nouvelle usine",
        editTitle: "Modifier usine",
        createSubtitle: "Créez une usine dans le contexte client actif.",
        editSubtitle: "Mettez à jour les données principales de l’usine.",
        loading: "Chargement de l’usine...",
        forbidden: "Cette page est disponible uniquement dans le contexte client final avec droits de modification.",
        mainData: "Données principales",
        name: "Nom de l’usine *",
        code: "Code",
        namePlaceholder: "Ex. Usine Nord",
        codePlaceholder: "Ex. PLT-NORD-01",
        createSuccess: "Usine créée",
        updateSuccess: "Usine mise à jour",
        genericError: "Erreur lors de l’enregistrement de l’usine",
        back: "Retour aux usines",
        saveCreate: "Créer l’usine",
        saveEdit: "Enregistrer",
    },
    es: {
        createTitle: "Nueva planta",
        editTitle: "Editar planta",
        createSubtitle: "Crea una planta en el contexto activo del cliente final.",
        editSubtitle: "Actualiza los datos principales de la planta.",
        loading: "Cargando planta...",
        forbidden: "Esta página solo está disponible en el contexto del cliente final con permisos de edición.",
        mainData: "Datos principales",
        name: "Nombre de planta *",
        code: "Código",
        namePlaceholder: "Ej. Planta Norte",
        codePlaceholder: "Ej. PLT-NORTE-01",
        createSuccess: "Planta creada",
        updateSuccess: "Planta actualizada",
        genericError: "Error al guardar la planta",
        back: "Volver a Plantas",
        saveCreate: "Crear planta",
        saveEdit: "Guardar cambios",
    },
} as const;

export default function PlantEditorPage({ mode, plantId = null }: PlantEditorPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", code: "" });

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = normalizeRole(membership?.role ?? null);
    const canEdit = hasMinimumRole(userRole, "supervisor");

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (mode !== "edit" || !plantId || orgType !== "customer" || !canEdit) {
                if (active) setLoading(false);
                return;
            }

            try {
                const data = await getPlantDetail(plantId);
                if (!active) return;

                if (!data?.plant) {
                    void router.replace("/plants");
                    return;
                }

                setForm({
                    name: data.plant.name ?? "",
                    code: data.plant.code ?? "",
                });
            } catch (error) {
                console.error("Plant editor load error:", error);
                void router.replace("/plants");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, canEdit, mode, orgType, plantId, router]);

    const pageTitle = mode === "create" ? text.createTitle : text.editTitle;
    const pageSubtitle = mode === "create" ? text.createSubtitle : text.editSubtitle;

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast({
                title: "Error",
                description: text.name,
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            if (mode === "create") {
                const plant = await createPlant({
                    name: form.name.trim(),
                    code: form.code.trim() || null,
                });
                toast({ title: text.createSuccess, description: plant.name ?? form.name.trim() });
                void router.push(`/plants/${plant.id}`);
                return;
            }

            if (!plantId) return;

            await updatePlant(plantId, {
                name: form.name.trim(),
                code: form.code.trim() || null,
            });
            toast({ title: text.updateSuccess, description: form.name.trim() });
            void router.push(`/plants/${plantId}`);
        } catch (error: any) {
            console.error("Plant save error:", error);
            toast({
                title: "Error",
                description: error?.message || text.genericError,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${pageTitle} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {text.loading}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (orgType !== "customer" || !canEdit) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${pageTitle} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {text.forbidden}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href={mode === "edit" && plantId ? `/plants/${plantId}` : "/plants"}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{pageTitle}</h1>
                            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5" />
                                {text.mainData}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.name}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={text.namePlaceholder}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.code}</Label>
                                <Input
                                    value={form.code}
                                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                                    placeholder={text.codePlaceholder}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href={mode === "edit" && plantId ? `/plants/${plantId}` : "/plants"}>
                            <Button variant="outline">{text.back}</Button>
                        </Link>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {mode === "create" ? text.saveCreate : text.saveEdit}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
