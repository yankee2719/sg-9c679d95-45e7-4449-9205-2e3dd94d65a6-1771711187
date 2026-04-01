import { useMemo, useState } from "react";
import { Moon, SlidersHorizontal, Sun } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const copy = {
    it: {
        seo: "Preferenze - MACHINA",
        title: "Preferenze",
        description: "Gestisci lingua e tema della tua interfaccia personale.",
        language: "Lingua applicazione",
        theme: "Tema interfaccia",
        themeHint: "Il tema scelto resta salvato localmente e viene riapplicato ai prossimi accessi.",
        dark: "Scuro",
        light: "Chiaro",
        save: "Applica preferenze",
        saved: "Preferenze aggiornate.",
    },
    en: {
        seo: "Preferences - MACHINA",
        title: "Preferences",
        description: "Manage language and theme of your personal interface.",
        language: "App language",
        theme: "Interface theme",
        themeHint: "The selected theme is stored locally and reapplied on next access.",
        dark: "Dark",
        light: "Light",
        save: "Apply preferences",
        saved: "Preferences updated.",
    },
    fr: {
        seo: "Préférences - MACHINA",
        title: "Préférences",
        description: "Gérez la langue et le thème de votre interface.",
        language: "Langue de l’application",
        theme: "Thème d’interface",
        themeHint: "Le thème choisi reste enregistré localement.",
        dark: "Sombre",
        light: "Clair",
        save: "Appliquer",
        saved: "Préférences mises à jour.",
    },
    es: {
        seo: "Preferencias - MACHINA",
        title: "Preferencias",
        description: "Gestiona idioma y tema de tu interfaz personal.",
        language: "Idioma de la aplicación",
        theme: "Tema de interfaz",
        themeHint: "El tema elegido se guarda localmente y se reaplica al volver a entrar.",
        dark: "Oscuro",
        light: "Claro",
        save: "Aplicar preferencias",
        saved: "Preferencias actualizadas.",
    },
} as const;

export default function PreferencesSettingsPage() {
    const { membership } = useAuth();
    const { language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const text = useMemo(() => copy[language], [language]);
    const { toast } = useToast();

    const [selectedLanguage, setSelectedLanguage] = useState < Language > (language);
    const [selectedTheme, setSelectedTheme] = useState < "light" | "dark" > (theme);

    const applyPreferences = () => {
        if (selectedLanguage !== language) setLanguage(selectedLanguage);
        if (selectedTheme !== theme) toggleTheme();
        toast({ title: text.saved });
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
                                <SlidersHorizontal className="h-5 w-5" />
                                {text.title}
                            </CardTitle>
                            <CardDescription>{text.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>{text.language}</Label>
                                <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="it">Italiano</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="fr">Français</SelectItem>
                                        <SelectItem value="es">Español</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>{text.theme}</Label>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTheme("dark")}
                                        className={`rounded-2xl border p-4 text-left transition ${selectedTheme === "dark" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                                    >
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            <Moon className="h-4 w-4" />
                                            {text.dark}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTheme("light")}
                                        className={`rounded-2xl border p-4 text-left transition ${selectedTheme === "light" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                                    >
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            <Sun className="h-4 w-4" />
                                            {text.light}
                                        </div>
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground">{text.themeHint}</p>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={applyPreferences}>{text.save}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
