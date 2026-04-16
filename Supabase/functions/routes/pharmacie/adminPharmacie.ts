/**
 * =============================================================================
 * routes/pharmacie/adminPharmacie.ts
 * POST /admin/pharmacie/validate
 * POST /admin/pharmacie/refuse
 * DELETE /admin/pharmacie
 * =============================================================================
 *
 * Administration des pharmacies par l'administrateur.
 * Trois handlers dans un seul fichier — tous réservés à l'admin.
 *
 * ── adminValidatePharmacie  (POST /admin/pharmacie/validate) ──────────────
 *  Valide une pharmacie en attente.
 *  Appelle la fonction SQL SECURITY DEFINER admin_validate_pharmacy() qui :
 *    - Vérifie que l'appelant est admin (via auth.jwt() ->> 'role')
 *    - Met validate = true, exist = true → la pharmacie devient publiquement visible
 *
 * ── adminRefusePharmacie  (POST /admin/pharmacie/refuse) ─────────────────
 *  Refuse une pharmacie en attente.
 *  Appelle la fonction SQL SECURITY DEFINER admin_refuse_pharmacy() qui :
 *    - Vérifie que l'appelant est admin
 *    - Met validate = false, exist = true
 *    - Détache tous les pharmaciens (pharmacie_id = NULL dans pharmacien)
 *
 * ── adminDeletePharmacie  (DELETE /admin/pharmacie) ───────────────────────
 *  Désactive une pharmacie existante (exist = false).
 *  Appelle la fonction SQL SECURITY DEFINER admin_delete_pharmacy() qui :
 *    - Vérifie que l'appelant est admin
 *    - Détache tous les pharmaciens
 *    - Met exist = false → la pharmacie disparaît de la liste publique
 *
 * NOTE SUR LES FONCTIONS SQL :
 *  Ces fonctions SQL vérifient auth.jwt() ->> 'role' = 'admin' en interne.
 *  La vérification TypeScript (requireRole) est faite EN AMONT comme
 *  première ligne de défense — les deux niveaux se complètent.
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle "admin" requis (requireRole)
 *  - Double vérification : TypeScript + SQL SECURITY DEFINER
 *
 * BODY ATTENDU (JSON) pour les 3 routes :
 *      pharmacie_id    string  requis — UUID de la pharmacie cible
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaire partagé — authentification admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentifie l'appelant et vérifie le rôle admin.
 * Retourne { token, user } si autorisé, ou une Response d'erreur.
 */
async function authenticateAdmin(
    req: Request
): Promise<{ token: string; user: import("@/middleware/auth.ts").AuthenticatedUser } | Response> {

    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);

    if (!requireRole(result.user, ["admin"])) {
        return errorResponse("Accès réservé à l'administrateur.", 403);
    }

    return { token, user: result.user };
}

/**
 * Extrait pharmacie_id du body JSON.
 * Retourne la valeur ou une Response d'erreur.
 */
async function extractPharmacieId(
    req: Request
): Promise<string | Response> {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const pharmacie_id = typeof body.pharmacie_id === "string"
        ? body.pharmacie_id.trim()
        : null;

    if (!pharmacie_id) {
        return errorResponse("Le champ 'pharmacie_id' est obligatoire.", 400);
    }

    return pharmacie_id;
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /admin/pharmacie/validate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valide une pharmacie en attente.
 * Après validation : validate = true, exist = true → visible publiquement.
 */
export async function adminValidatePharmacie(req: Request): Promise<Response> {

    // ── Authentification admin ────────────────────────────────────────────────
    const auth = await authenticateAdmin(req);
    if (auth instanceof Response) return auth;
    const { token } = auth;

    // ── Extraction pharmacie_id ───────────────────────────────────────────────
    const pharmacieIdOrError = await extractPharmacieId(req);
    if (pharmacieIdOrError instanceof Response) return pharmacieIdOrError;
    const pharmacie_id = pharmacieIdOrError;

    // ── Appel RPC admin_validate_pharmacy ────────────────────────────────────
    // La fonction SQL vérifie auth.jwt() ->> 'role' = 'admin' en interne
    // Met validate = true, exist = true
    const authClient = createAuthenticatedClient(token);

    const { error: rpcError } = await authClient.rpc("admin_validate_pharmacy", {
        p_pharmacie_id: pharmacie_id,
    });

    if (rpcError) {
        if (rpcError.message?.includes("inexistante") ||
            rpcError.message?.includes("introuvable")) {
            return errorResponse("Pharmacie introuvable.", 404);
        }
        if (rpcError.message?.includes("refusé") ||
            rpcError.message?.includes("Accès")) {
            return errorResponse("Accès refusé.", 403);
        }
        return errorResponse("Impossible de valider la pharmacie.", 500);
    }

    return successResponse(
        { pharmacie_id },
        "Pharmacie validée avec succès. Elle est maintenant visible publiquement.",
        200
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /admin/pharmacie/refuse
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Refuse une pharmacie en attente.
 * Après refus : validate = false, exist = true, pharmaciens détachés.
 */
export async function adminRefusePharmacie(req: Request): Promise<Response> {

    // ── Authentification admin ────────────────────────────────────────────────
    const auth = await authenticateAdmin(req);
    if (auth instanceof Response) return auth;
    const { token } = auth;

    // ── Extraction pharmacie_id ───────────────────────────────────────────────
    const pharmacieIdOrError = await extractPharmacieId(req);
    if (pharmacieIdOrError instanceof Response) return pharmacieIdOrError;
    const pharmacie_id = pharmacieIdOrError;

    // ── Appel RPC admin_refuse_pharmacy ──────────────────────────────────────
    // La fonction SQL : validate = false, exist = true, détache les pharmaciens
    const authClient = createAuthenticatedClient(token);

    const { error: rpcError } = await authClient.rpc("admin_refuse_pharmacy", {
        p_pharmacie_id: pharmacie_id,
    });

    if (rpcError) {
        if (rpcError.message?.includes("inexistante")) {
            return errorResponse("Pharmacie introuvable.", 404);
        }
        if (rpcError.message?.includes("refusé") ||
            rpcError.message?.includes("Accès")) {
            return errorResponse("Accès refusé.", 403);
        }
        return errorResponse("Impossible de refuser la pharmacie.", 500);
    }

    return successResponse(
        { pharmacie_id },
        "Pharmacie refusée. Les pharmaciens ont été détachés.",
        200
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /admin/pharmacie
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Désactive une pharmacie existante.
 * Après désactivation : exist = false → invisible publiquement.
 * Les pharmaciens sont détachés (pharmacie_id = NULL dans pharmacien).
 * La pharmacie n'est pas supprimée de la base — uniquement masquée.
 */
export async function adminDeletePharmacie(req: Request): Promise<Response> {

    // ── Authentification admin ────────────────────────────────────────────────
    const auth = await authenticateAdmin(req);
    if (auth instanceof Response) return auth;
    const { token } = auth;

    // ── Extraction pharmacie_id ───────────────────────────────────────────────
    const pharmacieIdOrError = await extractPharmacieId(req);
    if (pharmacieIdOrError instanceof Response) return pharmacieIdOrError;
    const pharmacie_id = pharmacieIdOrError;

    // ── Appel RPC admin_delete_pharmacy ───────────────────────────────────────
    // La fonction SQL : détache les pharmaciens, met exist = false
    // GRANT EXECUTE ON FUNCTION admin_delete_pharmacy(uuid) TO authenticated → ok
    const authClient = createAuthenticatedClient(token);

    const { error: rpcError } = await authClient.rpc("admin_delete_pharmacy", {
        p_pharmacie_id: pharmacie_id,
    });

    if (rpcError) {
        if (rpcError.message?.includes("inexistante")) {
            return errorResponse("Pharmacie introuvable.", 404);
        }
        if (rpcError.message?.includes("refusé") ||
            rpcError.message?.includes("Accès")) {
            return errorResponse("Accès refusé.", 403);
        }
        return errorResponse("Impossible de désactiver la pharmacie.", 500);
    }

    return successResponse(
        { pharmacie_id },
        "Pharmacie désactivée. Les pharmaciens ont été détachés.",
        200
    );
}