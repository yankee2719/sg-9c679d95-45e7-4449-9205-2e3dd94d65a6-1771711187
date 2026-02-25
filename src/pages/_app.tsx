// src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useState } from "react";

import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";

// Se hai un file di global css, lascialo (altrimenti rimuovi questa riga)
// import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  // Gate client-only per evitare mismatch/hydration quando Theme/Language leggono localStorage/window
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
          {/* Evita hydration mismatch su pagine che dipendono da localStorage/session */}
          {mounted ? <Component {...pageProps} /> : null}
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}