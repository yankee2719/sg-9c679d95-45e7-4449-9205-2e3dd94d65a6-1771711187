import { useEffect } from "react";
import { initAuthContextCacheListener } from "@/lib/supabaseHelpers";

useEffect(() => {
    initAuthContextCacheListener();
}, []);
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useState } from "react";

import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAProvider } from "@/contexts/PWAProvider";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
    // IMPORTANT: prevent hydration mismatch by rendering the app only on client
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#FF6B35" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="MACHINA" />
                <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
            </Head>

            {/* Server + first client render: identical */}
            {!mounted ? null : (
                <ThemeProvider>
                    <LanguageProvider>
                        <PWAProvider>
                            <Component {...pageProps} />
                            <Toaster />
                        </PWAProvider>
                    </LanguageProvider>
                </ThemeProvider>
            )}
        </>
    );
}