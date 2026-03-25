import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { createPlant, getPlant, updatePlant } from "@/services/plantService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgType = "manufacturer" | "customer" | null;

interface PlantEditorPageProps {
    mode: "create" | "edit";
    plantId?: string | null;
}

type FormState = {
    name: string;
    code: string;
};

export default function PlantEditorPage({
    mode,
    plantId = null,
}: PlantEditorPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, organization, membership } = useAuth();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState < FormState > ({
        name: "",
        code: "",
    });

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    const resolvedPlantId = useMemo(
        () => (typeof plantId === "string" ? plantId : null),
        [plantId]
    );

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (mode !== "edit") return;
            if (!resolvedPlantId || authLoading) return;

            try {
                const data = await getPlant(resolvedPlantId);
                if (!active) return;

                setForm({
                    name: data.plant.name ?? "",
                    code: data.plant.code ?? "",
                });
            } catch (error) {
                console.error("Plant load error:", error);
                void router.replace("/plants");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, mode, resolvedPlantId, router]);

    const handleSave = async () => {
        if (!canEdit) return;

        const name = form.name.trim();
        if (!name) {
            toast({
                title: t("common.error") || "Errore",
                description:
                    t("plants.errorNameRequired") || "Inserisci il nome dello stabilimento.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            if (mode === "create") {
                const created = await createPlant({
                    name,
                    code: form.code.trim() || null,
                });

                toast({
                    title: t("plants.created") || "Stabilimento creato",
                    description: created.name || name,
                });

                void router.push(`/plants/${created.id}`);
                return;
            }

            if (!resolvedPlantId) {
                throw new Error("Missing plant id");
            }

            const updated = await updatePlant(resolvedPlantId, {
                name,
                code: form.code.trim() || null,
            });

            toast({
                title: t("plants.updated") || "Stabilimento aggiornato",
                description: updated.name || name,
            });

            void router.push(`/plants/${resolvedPlantId}`);
        } catch (error: any) {
            console.error("Plant save error:", error);
            toast({
                title: t("common.error") || "Errore",
                description:
                    error?.message ||
                    (mode === "create"
                        ? t("plants.errorCreate") || "Errore creazione stabilimento"
                        : t("plants.errorUpdate") || "Errore aggiornamento stabilimento"),
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
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {t("plants.loading")}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (orgType !== "customer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("plants.customerOnly") ||
                                    "La gestione stabilimenti è disponibile solo nel contesto cliente finale."}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!canEdit) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("plants.accessDenied") || "Accesso negato."}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    const isCreate = mode === "create";
    const pageTitle =
        isCreate
            ? t("plants.new") || "Nuovo stabilimento"
            : t("plants.edit") || "Modifica stabilimento";

    const pageSubtitle =
        isCreate
            ? t("plants.formSubtitleCreate") ||
            "Crea uno stabilimento nel contesto cliente attivo."
            : t("plants.formSubtitleEdit") ||
            "Aggiorna i dati principali dello stabilimento.";

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href={isCreate ? "/plants" : `/plants/${resolvedPlantId || ""}`}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>

                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {pageTitle}
                            </h1>
                            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                {t("plants.detail") || "Dati stabilimento"}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("plants.nameLabel") || "Nome stabilimento *"}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder={
                                        t("plants.namePlaceholder") ||
                                        "Es. Stabilimento Chioggia"
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("plants.code") || "Codice"}</Label>
                                <Input
                                    value={form.code}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            code: event.target.value,
                                        }))
                                    }
                                    placeholder="Es. PLT-CHI-01"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href={isCreate ? "/plants" : `/plants/${resolvedPlantId || ""}`}>
                            <Button variant="outline">
                                {t("common.cancel") || "Annulla"}
                            </Button>
                        </Link>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {saving
                                ? t("common.saving") || "Salvataggio..."
                                : isCreate
                                    ? t("plants.savePlant") || "Salva stabilimento"
                                    : t("common.save") || "Salva"}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
