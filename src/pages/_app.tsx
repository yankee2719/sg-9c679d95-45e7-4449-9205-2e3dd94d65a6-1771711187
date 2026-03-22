import { useState, useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import { OfflineStatusBar } from "@/components/Offline/OfflineStatusBar";
import { Toaster } from "@/components/ui/toaster";
import { MfaGuard } from "@/components/mfa/MfaGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAProvider } from "@/contexts/PWAProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";

export default function App({ Component, pageProps }: AppProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return (
        <>
            <Head>
                <title>MACHINA</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <ThemeProvider>
                <LanguageProvider>
                    <PWAProvider>
                        <AuthProvider>
                            <MfaGuard>
                                <OfflineStatusBar />
                                <Component {...pageProps} />
                                <Toaster />
                            </MfaGuard>
                        </AuthProvider>
                    </PWAProvider>
                </LanguageProvider>
            </ThemeProvider>
        </>
    );
}