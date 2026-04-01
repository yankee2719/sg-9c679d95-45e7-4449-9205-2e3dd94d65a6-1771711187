import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, Save, UserCircle2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = {
    it: {
        seo: "Profilo - MACHINA",
        title: "Profilo",
        description: "Aggiorna i dati base del tuo account operativo.",
        firstName: "Nome",
        lastName: "Cognome",
        displayName: "Nome visualizzato",
        email: "Email",
        emailHint: "L’email è gestita dall’autenticazione e qui resta in sola lettura.",
        save: "Salva profilo",
        saving: "Salvataggio...",
        saved: "Profilo aggiornato correttamente.",
        error: "Errore durante il salvataggio del profilo.",
        identity: "Identità account",
        identityDesc: "Dati visibili nelle schermate operative e nei contesti interni.",
    },
    en: {
        seo: "Profile - MACHINA",
        title: "Profile",
        description: "Update the base data of your operational account.",
        firstName: "First name",
        lastName: "Last name",
        displayName: "Display name",
        email: "Email",
        emailHint: "Email is managed by authentication and remains read-only here.",
        save: "Save profile",
        saving: "Saving...",
        saved: "Profile updated successfully.",
        error: "Error while saving the profile.",
        identity: "Account identity",
        identityDesc: "Data shown in operational screens and internal contexts.",
    },
    fr: {
        seo: "Profil - MACHINA",
        title: "Profil",
        description: "Mettez à jour les données de base de votre compte.",
        firstName: "Prénom",
        lastName: "Nom",
        displayName: "Nom affiché",
        email: "Email",
        emailHint: "L’email est géré par l’authentification et reste ici en lecture seule.",
        save: "Enregistrer le profil",
        saving: "Enregistrement...",
        saved: "Profil mis à jour.",
        error: "Erreur lors de l’enregistrement du profil.",
        identity: "Identité du compte",
        identityDesc: "Données visibles dans les écrans opérationnels.",
    },
    es: {
        seo: "Perfil - MACHINA",
        title: "Perfil",
        description: "Actualiza los datos básicos de tu cuenta operativa.",
        firstName: "Nombre",
        lastName: "Apellido",
        displayName: "Nombre visible",
        email: "Email",
        emailHint: "El email lo gestiona la autenticación y aquí es solo lectura.",
        save: "Guardar perfil",
        saving: "Guardando...",
        saved: "Perfil actualizado correctamente.",
        error: "Error al guardar el perfil.",
        identity: "Identidad de la cuenta",
        identityDesc: "Datos visibles en pantallas operativas y contextos internos.",
    },
} as const;

export default function ProfileSettingsPage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const { profile, membership, refresh } = useAuth();
    const { toast } = useToast();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFirstName(profile?.first_name ?? "");
        setLastName(profile?.last_name ?? "");
        setDisplayName(profile?.display_name ?? "");
    }, [profile]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!profile?.id) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                    display_name: displayName.trim() || null,
                })
                .eq("id", profile.id);

            if (error) throw error;
            await refresh();
            toast({ title: text.saved });
        } catch (error) {
            console.error("Profile save error:", error);
            toast({ title: text.error, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={text.seo} />

                <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            {text.title}
                        </h1>
                        <p className="text-muted-foreground">{text.description}</p>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCircle2 className="h-5 w-5" />
                                {text.identity}
                            </CardTitle>
                            <CardDescription>{text.identityDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">{text.firstName}</Label>
                                        <Input
                                            id="first_name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">{text.lastName}</Label>
                                        <Input
                                            id="last_name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="display_name">{text.displayName}</Label>
                                    <Input
                                        id="display_name"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">{text.email}</Label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            className="pl-9"
                                            value={profile?.email ?? ""}
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">{text.emailHint}</p>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={saving}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {saving ? text.saving : text.save}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
