import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import { OfflineStatusBar } from "@/components/Offline/OfflineStatusBar";
import { Toaster } from "@/components/ui/toaster";
import { MfaGuard } from "@/components/mfa/MfaGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PWAProvider } from "@/contexts/PWAProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";

const themeBootstrapScript = `
(function() {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = theme;
    root.setAttribute('data-theme', theme);
  } catch (e) {}
})();`;

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <Script id="machina-theme-bootstrap" strategy="beforeInteractive">
                {themeBootstrapScript}
            </Script>

            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <PWAProvider>
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
                                {mounted ? <OfflineStatusBar /> : null}
                                <Component {...pageProps} />
                            </MfaGuard>
                            {mounted ? <Toaster /> : null}
                        </PWAProvider>
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </>
    );
}
