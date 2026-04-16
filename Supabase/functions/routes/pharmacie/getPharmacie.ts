/**
 * =============================================================================
 * routes/pharmacie/getPharmacie.ts  —  GET /pharmacie/detail
 * =============================================================================
 *
 * Détails d'une pharmacie spécifique.
 *
 * NIVEAUX D'ACCÈS :
 *  - Public (non connecté) : voit uniquement les pharmacies validate=true AND exist=true
 *    → RLS "Read valid pharmacie" appliquée via client ANON
 *  - Pharmacien de la pharmacie : voit sa propre pharmacie même si non validée
 *    → RLS "Pharmacien read own pharmacie" via client authentifié
 *  - Admin : voit toutes les pharmacies sans restriction
 *    → RLS "admin read all pharmacies" via client authentifié
 *
 * QUERY PARAMS :
 *      ?pharmacie_id=<uuid>    requis — UUID de la pharmacie
 *
 * ACCÈS : Public pour les pharmacies validées. JWT requis pour les autres cas.
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: { pharmacie_id, name, adress, ville, quartier, phone, status, validate, exist, created_at } }
 *
 * =============================================================================
 */

import { supabase, createAuthenticatedClient } from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

export async function getPharmacie(req: Request): Promise<Response> {

    // ── Extraction du paramètre requis ────────────────────────────────────────
    const url          = new URL(req.url);
    const pharmacie_id = url.searchParams.get("pharmacie_id")?.trim() ?? null;

    if (!pharmacie_id) {
        return errorResponse("Le paramètre 'pharmacie_id' est obligatoire.", 400);
    }

    // ── Sélection du client selon l'authentification ──────────────────────────
    // Si un JWT est présent → client authentifié (RLS pharmacien/admin actives)
    // Sinon → client ANON (RLS "Read valid pharmacie" uniquement)
    const token = extractToken(req);

    let client = supabase;  // ANON par défaut

    if (token) {
        // Validation du JWT — si invalide on continue avec le client ANON
        const authResult = await getAuthenticatedUser(token);
        if (!("error" in authResult)) {
            // JWT valide → client authentifié pour accéder aux RLS pharmacien/admin
            client = createAuthenticatedClient(token);
        }
    }

    // ── Requête vers public.pharmacie ─────────────────────────────────────────
    // Les RLS filtrent automatiquement selon le client utilisé :
    //   - ANON     → uniquement validate=true AND exist=true
    //   - Pharmacien → + sa propre pharmacie même non validée
    //   - Admin    → toutes les pharmacies
    const { data: pharmacie, error } = await client
        .from("pharmacie")
        .select("pharmacie_id, name, adress, ville, quartier, phone, status, validate, exist, created_at")
        .eq("pharmacie_id", pharmacie_id)
        .single();

    if (error || !pharmacie) {
        return errorResponse("Pharmacie introuvable ou accès refusé.", 404);
    }

    return successResponse(pharmacie, "Détails de la pharmacie récupérés.", 200);
}