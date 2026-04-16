/**
 * =====================================================================================
 *  routes/users/resetAdmin.ts  -   POST /admin/reset
 * =====================================================================================
 * 
 * Réinitialise le profil de l'administrateur existant.
 * Cette route permet à l'admin de mettre à jour ses propres credentials
 * (password, email, username) sasn supprimer ni recréer le compte
 * 
 * CE QUE CETTE ROUTE FAIT  :
 *  -   Mettre à jour le mot de passe de l'admin dans auth.users
 *  -   Optionnellement mettre à jour email/username dans public.users
 * 
 * CE QUE CETTE ROUTE NE FAIT PAS   :
 *  -   Ne supprime pas le compte admin
 *  -   Ne réinitialise ni le logiciel ni la base de données
 *  -   Ne change pas le rôle (toujours 'admin')
 *  -   Ne crée pas de second admin
 * 
 * SECURITE :
 *  -   Protégé par DB_RESET_SECRET (secret distinct, plus fort qu'ADMIN_CLIENT_SECRET)
 *  -   Pas de JWT requis - accès direct via secret (cas: admin a perdu son mot de passe)
 *  -   Le compte admin ne peut pas être suppriné (trigger trg_prevent_admin_delete)
 * 
 * BODY JSON ATTENDU    :
 *  resetSecret     string  requis - doit correspondre à DB_RESET_SECRET
 *  newPassword     string  requis - nouveau mot de passe (règles password_type)
 *  newEmail        string  optionnel - nouvel email admin
 *  newUsername     string  optionnel - nouveau username admin
 * 
 * REPONSE SUCCESS 200  :
 *  { success: true, message: "Profil administrateur réinitialisé." }
 * 
 * =====================================================================================
 */

import { getAdminClient, getAdminSecret }                               from "@/supabaseAdminClient.ts";
import { successResponse, errorResponse, extractToken, getAuthenticatedUser, requireRole }               from "@/middleware/auth.ts";
import { supabase }                                     from "@/supabaseClient.ts";

// =====================================================================================
//  Handler principal
// =====================================================================================

/**
 * Gère POST /admin/reset.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function resetAdmin(req: Request): Promise<Response> {
    
    // ---  Garde 1 :   JWT requis  ----------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active + chargement du profil   ------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 :   Admin uniquement    --------------------------------------------
    if (!requireRole(user, ["admin"])) {
        return errorResponse("Accès réservé à l'administrateur.", 403);
    }

    // ---  Etape 1 :   Lecture et validation du body JSON  ----------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    //  Extraction des champs de mise à jour
    const oldPassword       =   typeof body.oldPassword === "string"    ? body.oldPassword                      : null;
    const newPassword       =   typeof body.newPassword === "string"    ? body.newPassword                      : null;
    const newEmail          =   typeof body.newEmail    === "string"    ? body.newEmail.trim().toLowerCase()    : null;
    const newUsername       =   typeof body.newUsername === "string"    ? body.newUsername                      : null;
    
    //  newPassword obligatoire
    if (!newPassword && !newEmail && !newUsername) return errorResponse("Fournissez au moins un champ à modifier: newPassword, newEmail ou newUsername.", 400);

    //  Si newPassword fourni   : oldPassword obligatoire pour vérification
    if (newPassword && !oldPassword) {
        return errorResponse("Le champ oldPassword est requis pour changer le mot de passe.",
            400
        )
    }  

    //  Validation password -   miroir du domaine password_type SQL
    if (newPassword) {
        if (newPassword.length < 12)            return errorResponse("Mot de passe trop court (minimum 12 caractères).", 400);
        if (!/[A-Z]/.test(newPassword))         return errorResponse("Mot de passe : au moins une majuscule requise.", 400);
        if (!/[a-z]/.test(newPassword))         return errorResponse("Mot de passe : au moins une minuscule requise.", 400);
        if (!/[0-9]/.test(newPassword))         return errorResponse("Mot de passe : au moins un chiffre requis.", 400);
        if (!/[^A-Za-z0-9]/.test(newPassword))  return errorResponse("Mot de passe : au moins un caractère spécial requis.", 400);
    }

    if (newUsername !== null && newUsername.length < 3) {
        return errorResponse("Le username doit contenir au moins 3 caractères.", 400);
    }

    //  Validation newUsername
    if (newUsername !== null && newUsername.length < 3) {
        return errorResponse("Le username doit contenir au moins 3 caractères.", 400);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    // ---  Etape 2 :   Vérification de l'ancien password (si changement de password)  -
    //  Vérification via tentative de reconnexion Supabase Auth.
    //  Cela évite qu'une session volée (JWT intercepté) permette un changement de 
    //  mot de passe sans connaître l'ancien
    if (newPassword && oldPassword) { 
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email:      user.email,
            password:   oldPassword,
        });
        if (verifyError) {
        return errorResponse("L'ancien mot de passe est incorrect.", 401);
        }
    }

    // ---  Etape 3 :   Mise à jour du password ( et email si fourni) dans aauth.users -
    //  updateUserById() force le changement sans connaître l'ancien mot de passe
    //  C'est le but de cette route -   récupération d'accès
    const authUpdates: { password?: string; email?: string } = {};
    if(newPassword)     authUpdates.password    = newPassword;
    if (newEmail)       authUpdates.email       = newEmail;
    
    if (Object.keys(authUpdates).length > 0){
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(
            user.id, 
            authUpdates
        );

        if (passwordError) {
            return errorResponse("Impossible de mettre à jour les credentials.", 500);
        }
    }

    // ---  Etape 4 :   Mise à jour de public.users (email et/ou username si fournis)  -
    const userUpdates: Record<string, unknown> = {};
    if (newEmail        !== null) userUpdates.email     = newEmail;
    if (newUsername     !== null) userUpdates.username  = newUsername;

    if (Object.keys(userUpdates).length > 0) {
        const { error: profileError } = await adminClient
            .from("users")
            .update(userUpdates)
            .eq("id", user.id);

        if (profileError) {
            //  Non bloquant    -   le password a déjà été mis à jour avec succès
            if (profileError.message?.includes("Username already exists")) {
                return errorResponse("Ce username est déjà utilisé.", 409);
            }
            console.error("[resetAdmin] Mise à jour public.users échouée: ", profileError.message);
        }
    }

    //  Log d'audit -   Opération sensible
    console.log(`[resetAdmin] Profil admin réinitialisé - userId = ${user.id} - ${new Date().toISOString()}`);

    return successResponse(null, "Profil administrateur réinitialisé avec succès.", 200);
}