import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import { OfflineStatusBar } from "@/components/Offline/OfflineStatusBar";
import { Toaster } from "@/components/ui/toaster";
import { MfaGuard } from "@/components/mfa/MfaGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAProvider } from "@/contexts/PWAProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";

function AppShell({ Component, pageProps }: AppProps) {
    const router = useRouter();

    return (
<MfaGuard
    currentPath={router.pathname}
    excludePaths={[
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/offline",
        "/settings/security",
    ]}
>
    <OfflineStatusBar />
    <Component {...pageProps} />
</MfaGuard>
            <Component {...pageProps} />
        </MfaGuard>
    );
}

export default function App(props: AppProps) {
    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <PWAProvider>
                            <AppShell {...props} />
                            <Toaster />
                        </PWAProvider>
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </>
    );
}
