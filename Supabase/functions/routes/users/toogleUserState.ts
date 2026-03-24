/**
 * =====================================================================================
 *  routes/users/toogleUserState.ts -   PUT /admin/user/state
 * =====================================================================================
 * 
 * Consulte ou modifie l'état de connexio d'un utilisateur (uerState).
 * 
 * SEMANTIQUE DE userState  :
 *  userState = true    -> Utilisateur actuellement connecté sur un appareil
 *  userState = false   -> Utilisateur non connecté (aucun appareil actif)
 * 
 * USAGES DE CETTE ROUTE    :
 * 
 *  1.  GARANTIE SESSION UNIQUE :
 *      Lors du login (/auth/login), le système vérifie userState avant d'autoriser la connexion.
 *      Si userState = true -> refus (déjà connecté ailleurs). Cette route permet à l'admin de 
 *      forcer userState = false pour débloquer un utilisateur dont la session est "bloquée" (ex: crash sans logout)
 * 
 *  2.  STATS D'UTILISATION EN TEMPS REEL   :
 *      En lisant userState = true pour tous les utilisateurs, l'admin peut savoir combien d'utilisateurs
 *       sont connectés à un instant T. Utile pour mesurer l'efficacité et l'adoption de l'application. 
 * 
 *  3.  CONSULTATION DE L'ETAT  :
 *      L'admin peut consulter l'état de connexion d'un utilisateur spécifique via GET (méthode non destructive).
 * 
 * SECURITE :
 *  -   JWT requis + userState = true (session admin active)
 *  -   requireRole : 'admin' uniquement
 *  -   L'admin ne peut pas se déconnecter lui-même via cette route (utiliser/auth/logout pour ça)
 *  
 * BODY JSON ATTENDU    :
 *  userId      string      requis - UUID de l'utilisateur cible
 *  userState   boolean     requis - true (marquer connecter) | false (forcer la déconnexion)
 * 
 * RESPONSE SUCCES 200  :
 *  { success: true, data: { id, username, userState } }
 * 
 * EXPORT INTERNE   :
 *  setUserStare(userId, state)
 *      Fonction utilitaire réutilisée par login et logout pour centraliser la mise à jour de
 *      userState sans dupliquer la logique.
 * 
 * =====================================================================================
 */

import { getAdminClient, getAdminSecret }               from "@/supabaseAdminClient.ts";
import { 
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse
 }                                                      from "@/middleware/auth.ts";

// =====================================================================================
//  Handler principal
// =====================================================================================

/**
 * Gère PUT /admin/user/state.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function toogleUserState(req: Request): Promise<Response> {
    
    // ---  Garde 1 :   JWT requis  ----------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Validation JWT + session active --------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 :   Admin uniquement    --------------------------------------------
    if (!requireRole(user, ["admin"])) {
        return errorResponse("Accès réservé à l'administrateur.", 403);
    }

    // ---  Etape 1 :   Lectuer et validation du body JSON  ----------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const targetUserId  = typeof body.userId    === "string"    ? body.userId.trim()    : null;
    const newState      = false;

    if (!targetUserId) return errorResponse("le champ 'userId' (UUID) est obligatoire.", 400);
    if (newState === null) return errorResponse("le champ 'userState' (boolean) est obigatoire.", 400);

    // ---  Garde 4 :   L'admin ne peut pas modifier son propre état via cette route   -
    //  Pour se déconnecter, l'admin utiliser logout
    if (targetUserId === user.id) {
        return errorResponse(
            "Utilisez logout pour gérer votre propre session.",
            403
        );
    }

    // ---  Etpae 2 :   Chargement de l'utilisateur cible   ----------------------------
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de coniguration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const { data: targetUser, error: findError } = await adminClient
        .from("users")
        .select("id, username, role, userState")
        .eq("id", targetUserId)
        .single();

    if (findError || !targetUser) {
        return errorResponse("Utilisateur introuvable!", 404);
    }

    // ---  Etape 3 :   Vérification idempotence    ------------------------------------
    //  Si l'état est déjà celui demandé    -> retour sans modification
    if (targetUser.userState === newState) {
        const stateLabel = newState ? "connecté" : "déconnecté";
        return successResponse(
            { id: targetUser.id, username: targetUser.username, userState: targetUser.userState},
            `${targetUser.username} est déjà déconnecté.`,
            200
        );
    }

    // ---  Etpae 4 :   Mise à jour de userState    ------------------------------------
    //  newState = false    ->  force la déconnexion (libère le slot de connexion unique)
    //                          L'utilisateur pourra se reconnecter normalement
    //  newState = true     -> marque l'utilisateur comme connecté (usage rare - diagnostic)
    const { data: updated, error: updateError } = await adminClient
        .from("users")
        .update({ userState: newState })
        .eq("id", targetUserId)
        .select("id, username, userState")
        .single();

    if (updateError || !updated) {
        return errorResponse("Impossible de modifier l'état de connexion.", 500);
    }

    return successResponse(updated,
        `Session de ${targetUser.username} libérée. Reconnexion possible via login.` 
        , 200);
}

// =====================================================================================
//  Utilitaire interne exporté
// =====================================================================================

/**
 *  Met à jour userState d'un utilisateur par son UUID.
 * 
 * Centralisé ici pour éviter la duplication entre loginUser et logoutUser.
 * La mise à jour de userState est réservée à cette fonction et au handler 
 * toogleUserState() - aucun utilisateur ne peut modifier son propre userState.
 * 
 * @param userId    UUID de l'utilisateur à mettre à jour
 * @param state     true (connexion) | false (déconnexion)
 * @returns         { success: true } ou { success: false }
 */
export async function setUserState(
    userId: string,
    state: boolean
): Promise<{ success: boolean }> {
    try{
        //  Client admin - userState n'est pas modifiable via RLS utilisateur
        //  Cette mise à jour est une opération système, pas une action utilisateur
        const adminResult = getAdminClient(getAdminSecret(), "admin");
        if ("error" in adminResult) return { success: false };

        const { error } = await adminResult.client
            .from("users")
            .update({ setUserState: state })
            .eq("id", userId);

        if (error) {
            console.error(`[setUserState] Echec userId=${userId} state=${state}: `, error.message);
            return { success: false };
        }

        return { success: true };
    } catch (err) {
        console.error(`[setUserState] Exception userId=${userId}: `, err);
        return { success: false };
    }
}