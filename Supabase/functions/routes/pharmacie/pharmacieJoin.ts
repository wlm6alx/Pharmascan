/**
 * =============================================================================
 * routes/pharmacie/pharmacieJoin.ts
 * POST /pharmacie/join-key     → requestJoinKey
 * POST /pharmacie/join         → joinPharmacie
 * POST /pharmacie/resign       → resignPharmacie
 * DELETE /pharmacie/member     → removeMember
 * =============================================================================
 *
 * Gestion des membres d'une pharmacie.
 *
 * ── requestJoinKey  (POST /pharmacie/join-key) ───────────────────────────────
 *  Génère une clé d'invitation valide 24h pour rejoindre la pharmacie.
 *  Réservé au gérant. Appelle la fonction SQL request_join_pharmacy() via RPC.
 *  La clé est un UUID à transmettre au pharmacien invité (hors bande).
 *
 * ── joinPharmacie  (POST /pharmacie/join) ────────────────────────────────────
 *  Un pharmacien rejoint une pharmacie via la clé d'invitation.
 *  Appelle la fonction SQL join_pharmacie_with_key(p_join_key) via RPC.
 *  La clé doit être valide (used=false, expires_at > now()).
 *  Après succès : le pharmacien est affilié (pharmacie_id non null dans pharmacien).
 *
 * ── resignPharmacie  (POST /pharmacie/resign) ────────────────────────────────
 *  Un pharmacien quitte sa pharmacie actuelle.
 *  Appelle la fonction SQL pharmacien_resign_pharmacie() via RPC.
 *  Si dernier pharmacien → la pharmacie passe à exist=false (trigger auto_delete_pharmacy).
 *
 * ── removeMember  (DELETE /pharmacie/member) ─────────────────────────────────
 *  Le gérant exclut un pharmacien de sa pharmacie.
 *  Appelle la fonction SQL delete_another_pharmacien(p_user_id) via RPC.
 *  Le pharmacien exclu est détaché (pharmacie_id = NULL, responsability = 'pharmacien').
 *
 * SÉCURITÉ commune :
 *  - JWT requis + userState = true
 *  - Rôle "pharmacien" requis pour les 4 routes
 *  - Les fonctions SQL SECURITY DEFINER vérifient les droits en interne
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaire partagé — authentification pharmacien
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentifie l'appelant et vérifie le rôle pharmacien.
 * Retourne { token, user, authClient } si autorisé, ou une Response d'erreur.
 */
async function authenticatePharmacien(req: Request): Promise<
    { token: string; user: import("@/middleware/auth.ts").AuthenticatedUser; authClient: ReturnType<typeof createAuthenticatedClient> }
    | Response
> {
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);

    if (!requireRole(result.user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    return { token, user: result.user, authClient: createAuthenticatedClient(token) };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /pharmacie/join-key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère une clé d'invitation pour rejoindre la pharmacie du gérant.
 *
 * La clé est valide 24 heures et à usage unique (used = false au départ).
 * La fonction SQL request_join_pharmacy() vérifie que l'appelant est gérant.
 *
 * BODY : Aucun — le gérant est identifié par son JWT.
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { join_key: "uuid...", expires_in: "24 heures" } }
 */
export async function requestJoinKey(req: Request): Promise<Response> {

    // ── Authentification pharmacien ───────────────────────────────────────────
    const auth = await authenticatePharmacien(req);
    if (auth instanceof Response) return auth;
    const { authClient } = auth;

    // ── Appel RPC request_join_pharmacy ───────────────────────────────────────
    // Retourne l'UUID de la clé générée
    // La fonction SQL vérifie que l'appelant est gérant (responsability = 'gerant')
    const { data: joinKey, error: rpcError } = await authClient.rpc("request_join_pharmacy");

    if (rpcError) {
        if (rpcError.message?.includes("refusé") ||
            rpcError.message?.includes("Accès")) {
            return errorResponse(
                "Accès refusé. Seul le gérant peut générer une clé d'invitation.",
                403
            );
        }
        return errorResponse("Impossible de générer la clé d'invitation.", 500);
    }

    return successResponse(
        { join_key: joinKey, expires_in: "24 heures" },
        "Clé d'invitation générée. Transmettez-la au pharmacien à inviter.",
        201
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /pharmacie/join
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un pharmacien rejoint une pharmacie via la clé d'invitation.
 *
 * Après succès : le pharmacien est affilié à la pharmacie.
 * La clé est marquée used = true — ne peut plus être réutilisée.
 *
 * BODY ATTENDU (JSON) :
 *      join_key    string  requis — UUID de la clé d'invitation
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, message: "Vous avez rejoint la pharmacie." }
 */
export async function joinPharmacie(req: Request): Promise<Response> {

    // ── Authentification pharmacien ───────────────────────────────────────────
    const auth = await authenticatePharmacien(req);
    if (auth instanceof Response) return auth;
    const { authClient } = auth;

    // ── Lecture du body ───────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const join_key = typeof body.join_key === "string" ? body.join_key.trim() : null;
    if (!join_key) return errorResponse("Le champ 'join_key' est obligatoire.", 400);

    // ── Appel RPC join_pharmacie_with_key ─────────────────────────────────────
    // La fonction SQL vérifie :
    //   - Que le pharmacien n'appartient à aucune pharmacie
    //   - Que la clé est valide (used=false, expires_at > now())
    // Elle met à jour pharmacien.pharmacie_id et pharmacie_join_key.used = true
    const { error: rpcError } = await authClient.rpc("join_pharmacie_with_key", {
        p_join_key: join_key,
    });

    if (rpcError) {
        if (rpcError.message?.includes("seule pharmacie") ||
            rpcError.message?.includes("appartenir")) {
            return errorResponse("Vous appartenez déjà à une pharmacie.", 409);
        }
        if (rpcError.message?.includes("invalide") ||
            rpcError.message?.includes("expiré")) {
            return errorResponse("Clé d'invitation invalide ou expirée.", 400);
        }
        return errorResponse("Impossible de rejoindre la pharmacie.", 500);
    }

    return successResponse(null, "Vous avez rejoint la pharmacie avec succès.", 200);
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /pharmacie/resign
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un pharmacien quitte sa pharmacie actuelle.
 *
 * Après résignation : pharmacie_id = NULL, responsability = 'pharmacien'.
 * Si dernier pharmacien → trigger auto_delete_pharmacy → exist = false.
 *
 * BODY : Aucun — le pharmacien est identifié par son JWT.
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, message: "Vous avez quitté la pharmacie." }
 */
export async function resignPharmacie(req: Request): Promise<Response> {

    // ── Authentification pharmacien ───────────────────────────────────────────
    const auth = await authenticatePharmacien(req);
    if (auth instanceof Response) return auth;
    const { authClient } = auth;

    // ── Appel RPC pharmacien_resign_pharmacie ─────────────────────────────────
    // La fonction SQL :
    //   - Vérifie que le pharmacien appartient à une pharmacie
    //   - Détache le pharmacien (pharmacie_id = NULL)
    //   - Si plus aucun pharmacien → exist = false sur la pharmacie
    const { error: rpcError } = await authClient.rpc("pharmacien_resign_pharmacie");

    if (rpcError) {
        if (rpcError.message?.includes("aucune pharmacie") ||
            rpcError.message?.includes("appartenez")) {
            return errorResponse("Vous n'appartenez à aucune pharmacie.", 409);
        }
        return errorResponse("Impossible de quitter la pharmacie.", 500);
    }

    return successResponse(
        null,
        "Vous avez quitté la pharmacie. Si vous étiez le dernier pharmacien, la pharmacie a été désactivée.",
        200
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /pharmacie/member
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le gérant exclut un pharmacien de sa pharmacie.
 *
 * Le pharmacien exclu : pharmacie_id = NULL, responsability = 'pharmacien'.
 * Le gérant ne peut pas s'exclure lui-même (utiliser /pharmacie/resign).
 *
 * BODY ATTENDU (JSON) :
 *      user_id     string  requis — UUID du pharmacien à exclure
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, message: "Pharmacien exclu de la pharmacie." }
 */
export async function removeMember(req: Request): Promise<Response> {

    // ── Authentification pharmacien ───────────────────────────────────────────
    const auth = await authenticatePharmacien(req);
    if (auth instanceof Response) return auth;
    const { user, authClient } = auth;

    // ── Lecture du body ───────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const target_user_id = typeof body.user_id === "string" ? body.user_id.trim() : null;
    if (!target_user_id) return errorResponse("Le champ 'user_id' est obligatoire.", 400);

    // Protection : un gérant ne peut pas s'exclure lui-même via cette route
    if (target_user_id === user.id) {
        return errorResponse(
            "Vous ne pouvez pas vous exclure vous-même. Utilisez POST /pharmacie/resign.",
            400
        );
    }

    // ── Appel RPC delete_another_pharmacien ───────────────────────────────────
    // La fonction SQL vérifie que l'appelant est gérant (responsability = 'gerant')
    // et que la cible appartient bien à sa pharmacie
    const { error: rpcError } = await authClient.rpc("delete_another_pharmacien", {
        p_user_id: target_user_id,
    });

    if (rpcError) {
        if (rpcError.message?.includes("refusé") ||
            rpcError.message?.includes("Accès")) {
            return errorResponse(
                "Accès refusé. Seul le gérant peut exclure un pharmacien.",
                403
            );
        }
        return errorResponse("Impossible d'exclure ce pharmacien.", 500);
    }

    return successResponse(null, "Pharmacien exclu de la pharmacie avec succès.", 200);
}