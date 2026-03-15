import { useMemo } from "react";
import { LoginForm } from "@/components/Auth/LoginForm";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        title: "Login - MACHINA",
        description: "Accesso alla piattaforma MACHINA.",
    },
    en: {
        title: "Login - MACHINA",
        description: "Access to the MACHINA platform.",
    },
    fr: {
        title: "Connexion - MACHINA",
        description: "Accès à la plateforme MACHINA.",
    },
    es: {
        title: "Acceso - MACHINA",
        description: "Acceso a la plataforma MACHINA.",
    },
} as const;

export default function LoginPage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    return (
        <>
            <SEO title={text.title} description={text.description} />
            <LoginForm />
        </>
    );
}
