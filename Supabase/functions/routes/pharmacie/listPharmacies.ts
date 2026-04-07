/**
 * =============================================================================
 * routes/pharmacie/listPharmacies.ts  —  GET /pharmacie
 * =============================================================================
 *
 * Liste publique des pharmacies visibles.
 *
 * POLITIQUE RLS :
 *  - "Read valid pharmacie" FOR SELECT USING (validate = true AND exist = true)
 *    → Seules les pharmacies validées ET existantes sont retournées
 *  - Client ANON suffisant — pas d'authentification requise
 *
 * FILTRES DISPONIBLES (query params) :
 *      ?ville=<string>     filtre par ville (insensible à la casse)
 *      ?quartier=<string>  filtre par quartier (insensible à la casse)
 *      ?status=open|close  filtre par statut
 *
 * ACCÈS : Public — pas de JWT requis.
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: [ { pharmacie_id, name, adress, ville, quartier, phone, status }, ... ] }
 *
 * =============================================================================
 */

import { supabase }                          from "@/supabaseClient.ts";
import { successResponse, errorResponse }    from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

export async function listPharmacies(req: Request): Promise<Response> {

    // Extraction des filtres depuis les query params
    const url      = new URL(req.url);
    const ville    = url.searchParams.get("ville")?.trim()    ?? null;
    const quartier = url.searchParams.get("quartier")?.trim() ?? null;
    const status   = url.searchParams.get("status")?.trim()   ?? null;

    // Validation du filtre status — miroir du ENUM pharmacie_status SQL
    if (status !== null && !["open", "close"].includes(status)) {
        return errorResponse("Le paramètre 'status' doit être 'open' ou 'close'.", 400);
    }

    // ── Construction de la requête ─────────────────────────────────────────────
    // Client ANON — la RLS "Read valid pharmacie" filtre automatiquement
    // sur validate = true AND exist = true
    let query = supabase
        .from("pharmacie")
        .select("pharmacie_id, name, adress, ville, quartier, phone, status")
        .order("name", { ascending: true });

    // Application des filtres optionnels (ilike = insensible à la casse)
    if (ville)    query = query.ilike("ville",    `%${ville}%`);
    if (quartier) query = query.ilike("quartier", `%${quartier}%`);
    if (status)   query = query.eq("status",      status);

    const { data: pharmacies, error } = await query;

    if (error) {
        return errorResponse("Impossible de récupérer la liste des pharmacies.", 500);
    }

    return successResponse(
        pharmacies ?? [],
        `${pharmacies?.length ?? 0} pharmacie(s) trouvée(s).`,
        200
    );
}