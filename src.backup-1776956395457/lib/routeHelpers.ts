// src/lib/routeHelpers.ts
import APP_ROUTES from "@/lib/appRoutes";

export function isEquipmentRoute(pathname: string) {
    return pathname === APP_ROUTES.equipment.index || pathname.startsWith("/equipment/");
}

export function isMachinesAliasRoute(pathname: string) {
    return pathname === APP_ROUTES.machines.index || pathname.startsWith("/machines/");
}

export function isDocumentsRoute(pathname: string) {
    return pathname === APP_ROUTES.documents.index || pathname.startsWith("/documents/");
}

export function isSettingsRoute(pathname: string) {
    return pathname === APP_ROUTES.settings.index || pathname.startsWith("/settings/");
}

const routeHelpers = {
    isEquipmentRoute,
    isMachinesAliasRoute,
    isDocumentsRoute,
    isSettingsRoute,
};

export default routeHelpers;
