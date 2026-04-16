/**
 * =================================================
 *  routes/auth/updatePassword.ts   -   POST /auth/update-password
 * =================================================
 * 
 * Mise à jour du mot de passe d'un utilisateur.
 * Deux situations possibles:
 * 
 *  CAS A - Utilisateur connecté (JWT valide, userState = true) :
 *      Fournit l'ancien mot de passe (oldPassword) + le nouveau mot de passe (newPassword).
 *      L'ancien password est vérifé via une tentative de reconnexion Supabase.
 *      Cela évite qu'une session volée permette un changement de mot de passe.
 * 
 *  CAS B - Utilisateur avec token OTP de reset (depuis /auth/reset-password)   :
 *      Fournit le token OTP (reçu dans l'email) + le nouveau mot de passe.
 *      Pas d'ancien password requis (l'utilisateur ne s'en souvient pas).
 * 
 * BODY JSON ATTENDU :
 *  CAS A (connecté, header Authorization: Bearer <jwt>) :
 *      oldPassword string  requis
 *      newPassword string  requis, >= 12 chars, règles password_type
 * 
 *  CAS B (reset par email) :
 *      token       string  requis - token OTP du lien de l'email
 *      newPassword string  requis
 * 
 * REPONSE SUCCESS 200  :
 *  { success: true, message: "Mot de passe mis à jour avec succès." }
 * 
 * =================================================
 */
import { errorResponse, 
    extractToken,
    getAuthenticatedUser,
    successResponse
 }                                          from "@/middleware/auth.ts";
import { supabase,
    createAuthenticatedClient
 }                                          from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";

// =================================================
//  Handler principal
// =================================================
export async function updatePassword(req: Request) {

    // ---  ETape 1 :   Lecture du body JSON    ----
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const oldPassword   = typeof body.oldPassword   === "string" ? body.oldPassword     : null;
    const newPassword   = typeof body.newPassword   === "string" ? body.newPassword     : null;
    const otpToken      = typeof body.token         === "string" ? body.token.trim()    : null;

    // newPassword toujours requis
    if (!newPassword) return errorResponse("Le chanp 'newPassword est obligatoire.", 400);

    //  Validation du format -  Miroir du domaine password type SQL
    if (newPassword.length < 12)            return errorResponse("Nouveau mot de passe trop court (minimum 12 caractères).", 400);
    if (!/[A-Z]/.test(newPassword))         return errorResponse("Nouveau mot de passe : au moins une majuscule requise.", 400);
    if (!/[a-z]/.test(newPassword))         return errorResponse("Nouveau mot de passe : au moins une minuscule requise.", 400);
    if (!/[0-9]/.test(newPassword))         return errorResponse("Nouveau mot de passe : au moins un chiffre requis.", 400);
    if (!/[^A-Za-z0-9]/.test(newPassword))  return errorResponse("Nouveau mot de passe : au moins un caractère spécial requis.", 400);

    // ---  Branchement selon la situation  --------
    
    const jwtToken = extractToken(req);

    if (jwtToken) {
        //  CAS A   :   Utilisateur connecté - V&érification de l'ancien mot de passe obligatoire
        if (!oldPassword) {
            return errorResponse(
                "Le champ 'oldPassword' est obligatoire pour changer votre mot de passe.",
                400
            );
        }
        return await updateWithOldPassword(jwtToken, oldPassword, newPassword);
    }

    if (otpToken) {
        //  CAS B   :   Reset par email - token OTP échangé contre une session
        return await updateWithOTP(otpToken, newPassword);
    }
    
    return errorResponse(
        "Authentification requise. Fournissez un JWT (header Authorization) ou un token OTP (champ 'token').",
        401
    );
}

// =================================================
//  CAS A - Changement avec vérification de l'ancien mot de passe
// =================================================

/**
 * Vérifie l'ancien mot de passe puis met à jour le nouveau.
 * 
 * Pourquoi vérifier l'ancien password  :
 *  Si une session est volée (JWT intercepté), l'attaquant ne doit pas pouvoir
 *  changer le mot de passe sans connaître l'ancien. Cette vériication neutralise
 *  l'exploitation d'un JWT compromis pour prendre le contrôle du compte.
 * 
 * @param token         JWT de l'utilisateur connecté 
 * @param oldPassword   Ancien mot de passe fourni pour vérification
 * @param newPassword   Nouveau mot de passe validé
 * @returns 
 */
async function updateWithOldPassword(
    token: string,
    oldPassword: string,
    newPassword: string
): Promise<Response> {
    
    //  Validation JWT + vérification session active (userState = true)
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    //  Vérification de l'ancien password via une tentative de reconnexion
    //  signInWithPassword rejettera si le passsword est incorrect
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email:      user.email,  
        password:   oldPassword,
    });

    if (verifyError) {
        return errorResponse("L'ancien mot de passe est incorrect.", 401);
    }

    //  Mise à jour du mot depasse avec le client authentifié de l'utilisatuer
    const authClient = createAuthenticatedClient(token);
    const { error: updateError } = await authClient.auth.updateUser({
        password: newPassword,
    });

    if (updateError) {
        return errorResponse("Impossible de mettre à jour le mot de passe.", 500);
    }

    return successResponse(null, "Mot de passe mis à jour avec succès.", 200);
}

// =================================================
//  CAS B - Changement avec token OTP de reset
// =================================================

/**
 * Echange le token OTP contre une session temporaire, puis met à jour le password
 * 
 * @param otpToken      Token OTP extrait du lien de l'email du reset
 * @param newPassword   Nouveau mot de passe validé
 */
async function updateWithOTP(
    otpToken:       string,
    newPassword:    string
):  Promise<Response> {
    
    //  Echange du token OTP contre une session Supabase
    //  Type "recovery" correspond aux tokens envoyés par resetPasswordorEmail()
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: otpToken,
        type:       "recovery",
    });

    if (verifyError || ! sessionData?.session) {
        return errorResponse("Token de réinitialisation invalide ou expiré.", 401);
    }

    //  Mise à jour du mot de passe avec le token temporaire obtenu
    //  L'utilisateur devra se reconnecter via /auth/login
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if (!("error" in adminResult)) {
        await adminResult.client
            .from("users")
            .update({ userState: false })
            .eq("id", sessionData.session.user.id);
    }

    return successResponse(
        null,
        "Mot de passe réinitialisé. Reconnectez-vous via login.",
        200
    );
}