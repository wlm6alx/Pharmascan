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

// ====================================================================
//  TYPES UTILITAIRES
// ====================================================================

export type MedicamentFilterInput = {
    name?:          string  | null;
    categorie?:     string  | null;
    description?:   string  | null;
    visibility?:    boolean | null;
};

export type PharmacyFilterInput = {
    name?:          string  | null;
    adress?:        string  | null;
    ville?:         string  | null;
    quartier?:      string  | null;
    phone?:         string  | null;
    status?:        string  | null;
    validate?:      boolean | null;
    exist?:         boolean | null;
};

export type StockFilterInput = {
    available?:     boolean | null;
    min_quantity?:  number  | null;
    max_quantity?:  number  | null;
    min_price?:     number  | null;
    max_price?:     number  | null;
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

export async function resolveSingleMedicamentId(filter: MedicamentFilterInput): promise<string> {
    const ids = await resolveMedicamentIds(filter);

    if (ids.length === 0) {
        throw new Error ("Aucun médicament correspondant trouvé.");
    }

    if (ids.length > 1) {
        throw new Error ("p^lusieurs médicaments correspondent. Précisez d'avantage votre recherche.");
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

export async function resolveStockIds(filter: StockFilterInput): Promise<string[]> {
    
}
