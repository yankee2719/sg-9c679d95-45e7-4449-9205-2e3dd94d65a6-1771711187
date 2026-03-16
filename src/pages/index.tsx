import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function FilesIndexRedirect() {
    return (
        <RouteRedirectNotice
            to="/documents"
            title="Archivio documentale"
            description="Il vecchio namespace file è stato unificato nel modulo documenti. Ti stiamo portando alla libreria aggiornata."
            targetLabel="/documents"
            withLayout
            seoTitle="Documenti - MACHINA"
        />
    );
}
