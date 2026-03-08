// src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useState } from "react";

import "@/styles/globals.css";

import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAProvider } from "@/contexts/PWAProvider";
import { OfflineStatusBar } from "@/components/Offline/OfflineStatusBar";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <ThemeProvider>
                <LanguageProvider>
                    <PWAProvider>
                        {mounted ? (
                            <>
                                <OfflineStatusBar />
                                <Component {...pageProps} />
                            </>
                        ) : null}
                        <Toaster />
                    </PWAProvider>
                </LanguageProvider>
            </ThemeProvider>
        </>
    );
}
