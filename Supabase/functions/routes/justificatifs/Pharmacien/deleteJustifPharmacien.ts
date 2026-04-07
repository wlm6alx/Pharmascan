/**
 * =============================================================================
 * routes/justificatifs/Pharmacien/deleteJustifPharmacien.ts
 * DELETE /justificatifs/pharmacien
 * =============================================================================
 *
 * Suppression du document justificatif d'un pharmacien.
 *
 * AVERTISSEMENT MÉTIER :
 *  Supprimer le justificatif alors que le pharmacien est déjà affilié à une
 *  pharmacie n'a pas d'effet immédiat sur l'affiliation existante.
 *  En revanche, si le rôle du compte est mis à jour ultérieurement,
 *  le trigger trg_enforce_pharmacien_role bloquera sans justificatif présent.
 *
 * POLITIQUE RLS :
 *  - "Pharmacien manage own justificatif" FOR ALL USING (user_id = auth.uid())
 *    → couvre le DELETE
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle "pharmacien" requis
 *  - Filtre explicite .eq("user_id", user.id) — double protection RLS
 *
 * BODY : Aucun — l'utilisateur est identifié par son JWT.
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, message: "Justificatif supprimé." }
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

export async function deleteJustifPharmacien(req: Request): Promise<Response> {

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

    // ── Étape 1 : Vérification existence avant suppression ────────────────────
    // Retourne un message explicite si aucun justificatif n'existe
    const authClient = createAuthenticatedClient(token);

    const { data: existing } = await authClient
        .from("justif_pharmacien")
        .select("justif_id")
        .eq("user_id", user.id)
        .single();

    if (!existing) {
        return errorResponse("Aucun justificatif trouvé pour ce compte.", 404);
    }

    // ── Étape 2 : Suppression dans public.justif_pharmacien ───────────────────
    // Client authentifié → RLS "Pharmacien manage own justificatif" couvre DELETE
    // Le ON DELETE CASCADE dans justif_pharmacien → users garantit la cohérence
    // si le compte est supprimé, mais pas l'inverse
    const { error: deleteError } = await authClient
        .from("justif_pharmacien")
        .delete()
        .eq("user_id", user.id);   // filtre explicite — double protection RLS

    if (deleteError) {
        return errorResponse("Impossible de supprimer le justificatif.", 500);
    }

    return successResponse(null, "Justificatif supprimé avec succès.", 200);
}