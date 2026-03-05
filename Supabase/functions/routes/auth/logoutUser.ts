/**
 * ======================================================================
 *  routes/auth/logoutUser.ts   -   POST /auth/logout
 * ======================================================================
 * 
 * Déconnecte l'utilisateur connecté.
 * 
 * OPERATIONS   :
 *  1.  Validation du JWT (l'utilisateur doit être connecté pour se déconnecter)
 *  2.  Révocation de la session Supabase Auth (invalidation du JWT côté serveur)
 *  3.  Mise à jour userState -> false dans public.users
 *      -> libère le "slot" de connexion unique
 *      -> l'utilisateur peut se reconnecter sur n'importe quel appareil
 * 
 * LOGIQUE userState    :
 *  Après logout    :
 *      userState = false -> session libérée    -> reconnexion possible ailleurs
 * 
 *  Sans ce handler, userState resterait true après expiration du JWT,
 *  bloquant toute nouvelle connexion légitime.
 * 
 * ACCES    :   Protégé - JWT requis + userState = true.
 * 
 * REPONSE SUCCES 200   :
 *  { success: true,  message: "Déconnexion réussie. "}
 *  
 * ======================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { getAdminClient,
    getAdminSecret
 }                                      from "../../supabaseAdminClient.ts";
import {extractToken,
    getAuthenticatedUser,
    successResponse,
    errorResponse
 }                                      from "@/middleware/auth.ts"

// ======================================================================
//  Handler principal
// ======================================================================

/**
 *  Gère POST /auth/logout.
 * 
 * @param req   Requête HTTP entrante
 * @returns     Response JSON standardisée
 */
export async function logoutUser(req: Request): Promise<Response> {
    
    // --- Garde 1  :   Extraction du JWT   -----------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);


    // ---  Garde 2 :   Validation duJWT + vérification session active  -
    //  getAuthenticatedUser vérifie que userState = true (session active)
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;
    
    // ---  Etape 1 :   Révocation de la session Supabase Auth  ---------
    //  signOut() avec le client authentifié révoque la session côté Supabase
    //  -> Le JWT devient invalide même avant son expiration naturelle
    const authClient = createAuthenticatedClient(token);
    const { error: signOutError } = await authClient.auth.signOut();

    if (signOutError) {
        //  Continuons même si signOut échoue - la prioritéest de remettre userState à false
        console.error(`[logoutUser] signOut échoué pour userId=${user.id}: `, signOutError.message);
    }    
    
    // ---  Etape 2 :   Mise à jour userState -> false  -----------------
    //  Client admin pour garantir la mise à jour même si le JWT vient d'être révoqué
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    
    const { error: stateError }= await adminResult.client
        .from("users")
        .update({ userState: false })
        .eq("id", user.id);

    if (stateError) {
        //  Erreur critique :   Le slot de connexion n'est pas libéré
        //  L'utilisateur sera bloqué jusqu'à expiration du JWT ou intervention admin
        console.error(`[logoutUser] Echec mise à jour userState pour userId=${user.id}: `, stateError.message);
        return errorResponse(
            "Déconnexion partielle. Contactez l'administration si vous n epouvez plus vous connecter.",
            500
        );
    }
    
    // ---  Etape 3 :   Réponse succès  --------------------------------- 
    //  Le slot est libéré - l'utilisateur peut se reconnecter
    return successResponse(null, "Déconnexion réussie.", 200);
}