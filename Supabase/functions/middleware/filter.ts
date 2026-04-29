/**
 * ====================================================================
 *  middleware/filter.ts
 * ====================================================================
 * 
 *  Helpers de résolution interne UUID via onctions SQL de filtre
 * 
 * --------------------------------------------------------------------
 * Objectif :
 *  -   Le frontend / user n'envoie jamais d'UUID
 *  -   Ce backend API résout les UUID en interne via .rpc()
 *  -   Travail propre entre DB et handlers
 *  -   Backend, frontend et users peuvent faire des recherches/filtres dans la DB 
 * ====================================================================
*/

import { supabase }                         from "@/supabaseClient.ts";
import { UserRole }                         from "@/middleware/auth.ts";
import { getAdminClient } from "../supabaseAdminClient.ts";

// ====================================================================
//  TYPES UTILITAIRES
// ====================================================================

export type MedicamentFilterInput = {
    name?:          string      | null;
    categorie?:     string      | null;
    description?:   string      | null;
    visibility?:    boolean     | null;
};

export type PharmacyFilterInput = {
    name?:          string      | null;
    adress?:        string      | null;
    ville?:         string      | null;
    quartier?:      string      | null;
    phone?:         string      | null;
    status?:        string      | null;
    validate?:      boolean     | null;
    exist?:         boolean     | null;
};

export type StockFilterInput = {
    available?:     boolean     | null;
    min_quantity?:  number      | null;
    max_quantity?:  number      | null;
    min_price?:     number      | null;
    max_price?:     number      | null;
};

export type UserFilterInput = {
    username?:      string      | null;
    name?:          string      | null;
    surname?:       string      | null;
    email?:         string      | null;
    phone?:         string      | null;
    role?:          UserRole    | null;
    userState?:     boolean     | null;
};

export type PatientFilterInput = {
    gender?:        string      | null;
    birthDate?:     Date        | null;
    urgence_phone?: string      | null;
    adress?:        string      | null;
};

export type PharmacienFilterInput = {
    responsability?:    string  | null;
    hasPharmacy?:       boolean | null;
};

export type JustifPharmacienFilterInput = {
    documentPath?:  string      | null;
};

export type JustifPharmacieFilterInput = {
    documentPath?:      string  | null;
    validate?:          boolean | null;
};

// ====================================================================
//  OUTILS PRIVES
// ====================================================================

function normalizeText(value: unknown): string | null {
    return typeof value === "string"    &&  value.trim().length > 0
        ? value.trim()
        :null;
}

function normalizeBoolean(value: unknown): boolean | null {
    return typeof value === "boolean"   ?   value : null;
}

function normalizeNumber(value: unknown): number | null {
    return typeof value === "number"    &&  Number.isFinite(value) ? value : null;
}

// ====================================================================
//  MEDICAMENT
// ====================================================================
export async function resolveMedicamentIds(filter: MedicamentFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterMedicament", {
        m_name:         normalizeText(filter.name),
        m_categorie:    normalizeText(filter.categorie),
        m_description:  normalizeText(filter.description),
        m_visibility:   normalizeBoolean(filter.visibility),
    });
    
    if (error) {
        throw new Error(`Filtrage médicament impossible : ${error.message}`);
    }

    return (data ?? []).map((row: {medicament_id: string}) => row.medicament_id);
}

export async function resolveSingleMedicamentId(filter: MedicamentFilterInput): Promise<string> {
    const ids = await resolveMedicamentIds(filter);

    if (ids.length === 0) {
        throw new Error ("Aucun médicament correspondant trouvé.");
    }

    if (ids.length > 1) {
        throw new Error ("plusieurs médicaments correspondent. Précisez d'avantage votre recherche.");
    }

    return ids[0];
}

// ====================================================================
//  PHARMACIE
// ====================================================================

export async function resolvePharmacyIds(filter: PharmacyFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterpharmacy", {
        p_name:         normalizeText(filter.name),
        p_adress:       normalizeText(filter.adress),
        p_ville:        normalizeText(filter.ville),
        p_quartier:     normalizeText(filter.quartier),
        p_phone:        normalizeText(filter.phone),
        p_status:       normalizeText(filter.status),
        p_validate:     normalizeBoolean(filter.validate),
        p_exist:        normalizeBoolean(filter.exist),
    });

    if (error) {
        throw new Error(`Filtrage pharmacie imposible : ${error.message}`);
    }

    return (data ?? []).map((row: { pharmacie_id: string }) => row.pharmacie_id);
}

export async function resolveSinglePharmacyId(filter: PharmacyFilterInput): Promise<string> {
    const ids = await resolvePharmacyIds(filter);

    if (ids.length === 0) {
        throw new Error("Aucune pharmacie correspondante trouvée.");
    }

    if (ids.length > 1) {
        throw new Error("Plusieurs pharmacies correspondent. précisez d'avantages votre recherche.")
    }

    return ids[0];
} 

// =====================================================================
//  STOCK
// =====================================================================

/**
 *  A chaque fois qu'il est appelé, il faut faire la jointure avec 
 * resolvePharmacy et resolveMedicament pour avoir tous les éléments de la
 * table stockMedicament (stockMedicament d'une pharmacie)
 */
export async function resolveStockIds(filter: StockFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterStockMedicament", {
        s_available:        normalizeBoolean(filter.available),
        s_min_quantity:     normalizeNumber(filter.min_quantity),
        s_max_quantity:     normalizeNumber(filter.max_quantity),
        s_min_price:        normalizeNumber(filter.min_price),
        s_max_price:        normalizeNumber(filter.max_price),
    });

    if (error) {
        throw new Error(`Filtrage stocks impossible.`);
    }

    return (data ?? []).map((row: { stock_id: string }) => row.stock_id);
}

// =====================================================================
//  USER
// =====================================================================

export async function resolveUserIds(filter: UserFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterUsers", {
        u_email:            normalizeText(filter.email),
        u_username:         normalizeText(filter.username),
        u_role:             normalizeText(filter.role),
        u_userState:        normalizeBoolean(filter.userState)
    });

    if (error) {
        throw new Error(`Filtrage user impossible.`);
    }

    return (data ?? []).map((row: { user_id: string }) => row.user_id);
}

// =====================================================================
//  PATIENT
// =====================================================================

export async function resolvePatientIds(filter: PatientFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterPatients", {
        p_gender:           normalizeText(filter.gender),
        p_birthDate:        filter.birthDate,
        p_urgence_phone:    normalizeText(filter.urgence_phone),
        p_adress:           normalizeText(filter.adress)
    });

    if (error) {
        throw new Error (`Filtrage patient impossible.`);
    }

    return (data ?? []).map((row: { user_id: string }) => row.user_id);
}

// =====================================================================
//  PHARMACIEN
// =====================================================================

export async function resolvePharmacienIds(filter: PharmacienFilterInput): Promise<string[]> {
    const { data, error } = await supabase.rpc("filterPharmacien", {
        p_responsability:   normalizeText(filter.responsability),
        p_has_pharmacy:     normalizeBoolean(filter.hasPharmacy)
    });

    if (error) {
        throw new Error (`Filtrage pharmacien impossible.`);
    }

    return (data ?? []).map((row: { user_id: string }) => row.user_id);
}

// =====================================================================
//  JUSTIFPHARMACE
// =====================================================================


// =====================================================================
//  JUSTIFPHARMACIEN
// =====================================================================


// =====================================================================
//
// =====================================================================