// src/pages/500.tsx
import AppErrorFallback from "@/components/app/AppErrorFallback";

export default function InternalServerErrorPage() {
    return (
        <AppErrorFallback
            title="Errore interno applicazione"
            message="Si è verificato un errore imprevisto lato applicazione. Torna alla dashboard oppure ricarica la pagina."
            onRetry={() => window.location.reload()}
        />
    );
}
