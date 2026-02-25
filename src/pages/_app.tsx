// src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useState } from "react";

import "@/styles/globals.css"; // <-- CAMBIA QUI se il path è diverso

import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <ThemeProvider>
        <LanguageProvider>
          {mounted ? <Component {...pageProps} /> : null}
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}