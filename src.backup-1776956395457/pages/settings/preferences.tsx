import { useMemo } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";

export default function SettingsPreferencesPage() {
    const { language, setLanguage } = useLanguage() as any;
    const { theme, setTheme } = useTheme() as any;

    const activeTheme = useMemo(() => theme ?? "light", [theme]);

    return (
        <>
            <SEO title="Preferenze" />
            <MainLayout>
                <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Preferenze</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <h2 className="text-sm font-medium">Tema</h2>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant={activeTheme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Chiaro</Button>
                                    <Button variant={activeTheme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Scuro</Button>
                                    <Button variant={activeTheme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>Sistema</Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-medium">Lingua</h2>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant={language === "it" ? "default" : "outline"} onClick={() => setLanguage("it")}>Italiano</Button>
                                    <Button variant={language === "en" ? "default" : "outline"} onClick={() => setLanguage("en")}>English</Button>
                                    <Button variant={language === "es" ? "default" : "outline"} onClick={() => setLanguage("es")}>Español</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </>
    );
}
