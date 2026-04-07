/**
 * =============================================================================
 * routes/pharmacie/updateStatusPharmacie.ts  —  PATCH /pharmacie/status
 * =============================================================================
 *
 * Change le statut open/close d'une pharmacie.
 *
 * USAGE :
 *  Permet au pharmacien affilié d'ouvrir ou fermer sa pharmacie en temps réel.
 *  Le status est visible publiquement dans la liste des pharmacies.
 *
 * OPÉRATION VIA RPC :
 *  Appelle la fonction SQL SECURITY DEFINER update_status_pharmacy()
 *  qui effectue directement l'UPDATE sur pharmacie.status.
 *
 * POLITIQUE RLS :
 *  - "Pharmacien can update own state pharmacie" FOR UPDATE
 *    USING (EXISTS (SELECT 1 FROM pharmacien WHERE pharmacie_id = pharmacie.pharmacie_id
 *           AND user_id = auth.uid()))
 *    WITH CHECK (status IN ('open', 'close'))
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle "pharmacien" requis
 *  - Vérification d'appartenance à la pharmacie ciblée
 *
 * BODY ATTENDU (JSON) :
 *      pharmacie_id    string  requis — UUID de la pharmacie
 *      status          string  requis — "open" | "close"
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: { pharmacie_id, status } }
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

export async function updateStatusPharmacie(req: Request): Promise<Response> {

    // ── Garde 1 : JWT ────────────────────────────────────────────────────────
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ── Garde 2 : Session active ──────────────────────────────────────────────
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    // ── Garde 3 : Rôle pharmacien ─────────────────────────────────────────────
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    // ── Étape 1 : Lecture du body ─────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const pharmacie_id = typeof body.pharmacie_id === "string" ? body.pharmacie_id.trim() : null;
    const status        = typeof body.status       === "string" ? body.status.trim()       : null;

    if (!pharmacie_id) return errorResponse("Le champ 'pharmacie_id' est obligatoire.", 400);
    if (!status)       return errorResponse("Le champ 'status' est obligatoire.", 400);

    // Validation du status — miroir du ENUM pharmacie_status SQL
    if (!["open", "close"].includes(status)) {
        return errorResponse("Le champ 'status' doit être 'open' ou 'close'.", 400);
    }

    // ── Étape 2 : Vérification d'appartenance ─────────────────────────────────
    // Le pharmacien doit appartenir à la pharmacie ciblée
    const authClient = createAuthenticatedClient(token);

    const { data: membership } = await authClient
        .from("pharmacien")
        .select("pharmacie_id")
        .eq("user_id",      user.id)
        .eq("pharmacie_id", pharmacie_id)
        .single();

    if (!membership) {
        return errorResponse("Vous n'appartenez pas à cette pharmacie.", 403);
    }

    // ── Étape 3 : Appel RPC update_status_pharmacy ────────────────────────────
    // Fonction SQL SECURITY DEFINER — bypass RLS mais vérification faite ci-dessus
    const { error: rpcError } = await authClient.rpc("update_status_pharmacy", {
        p_pharmacie_id: pharmacie_id,
        p_status:       status,
    });

    if (rpcError) {
        return errorResponse("Impossible de modifier le statut.", 500);
    }

    const label = status === "open" ? "ouverte" : "fermée";
    return successResponse(
        { pharmacie_id, status },
        `Pharmacie marquée comme ${label}.`,
        200
    );
}