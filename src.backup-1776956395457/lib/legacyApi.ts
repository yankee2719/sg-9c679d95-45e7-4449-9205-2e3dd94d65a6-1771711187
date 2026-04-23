// src/lib/legacyApi.ts
/**
 * Legacy compatibility layer.
 *
 * Nuova regola del progetto:
 * - niente CRUD business tramite API custom legacy
 * - usare Supabase diretto + RLS
 * - tenere questo file solo come protezione temporanea contro import vecchi
 */

import type { NextApiRequest, NextApiResponse } from "next";

function deprecated(functionName: string): never {
    throw new Error(
        `[legacyApi] "${functionName}" non è più supportata. Usa Supabase diretto o gli helper di dominio in src/lib/domain/*.`
    );
}

/**
 * Returns 410 Gone for deprecated API routes.
 * Used as handler for routes that have been migrated to Supabase direct / RLS.
 */
export function legacyGone(_req: NextApiRequest, res: NextApiResponse) {
    return res.status(410).json({
        error: "Gone",
        message: "This API endpoint has been deprecated. Use Supabase direct access instead.",
    });
}

export async function getEquipmentList() {
    deprecated("getEquipmentList");
}

export async function getEquipmentById() {
    deprecated("getEquipmentById");
}

export async function createEquipment() {
    deprecated("createEquipment");
}

export async function updateEquipment() {
    deprecated("updateEquipment");
}

export async function deleteEquipment() {
    deprecated("deleteEquipment");
}

export async function getMaintenancePlans() {
    deprecated("getMaintenancePlans");
}

export async function createMaintenancePlan() {
    deprecated("createMaintenancePlan");
}

export async function updateMaintenancePlan() {
    deprecated("updateMaintenancePlan");
}

export async function deleteMaintenancePlan() {
    deprecated("deleteMaintenancePlan");
}

const legacyApi = {
    getEquipmentList,
    getEquipmentById,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    getMaintenancePlans,
    createMaintenancePlan,
    updateMaintenancePlan,
    deleteMaintenancePlan,
};

export default legacyApi;

