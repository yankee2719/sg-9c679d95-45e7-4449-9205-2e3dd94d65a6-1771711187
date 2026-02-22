import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="it" suppressHydrationWarning>
      <Head />
      <body suppressHydrationWarning>
        {/* 
          Inline script: runs BEFORE React hydrates.
          Reads localStorage and applies theme class immediately,
          so server HTML and client HTML always match.
          No flash, no hydration mismatch.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    localStorage.setItem('theme', theme);
                  }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
