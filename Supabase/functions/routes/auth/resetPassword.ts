/**
 * ==================================================================
 *  routes/auth/resetPassword.td    -   POST    /auth/reset-password
 * ==================================================================
 * 
 * Rôle :
 *  Déclenche l'envoi d'un email de réinitialisation de mot de passe.
 *  C'est Supabase Auth qui envoie l'email  - Ce handler ne ait que déclencher la demande.
 * 
 * REGLES METIER :
 *  -   Route publique - pas de JWT requis
 *  -   Si un JWT est présent -> reus d(déjà connecté, utiliser /auth/update-password)
 *  -   La réponse est TOUJOURS un succès 200, même si l'email n'existe pas
 *      -> Sécurity : éviter l'énumération d'emails (ne pas révéler quels emails sont enregistrés)
 *  -   L'email de reset contient un lien avec un token OTP - Le client l'utilise
 *      via POST /auth/update-password pour déinir le nouveau mot de passe
 * 
 * BODY JSON ATTENDU :
 *  {
 *      email: string   Obligatoire - adresse email du compte à réinitialiser
 *  }
 * 
 * REPONSE SUCCES 200 (toujours, même si email inexistant)  :
 *  {
 *      success: true,
 *      message: "Si cet email est enregistré, un lien de réinitialisation a été envoyé."
 *  }
 * 
 * ==================================================================
 */

import { supabase }                     from "@/supabaseClient.ts";
import { extractToken,
    successResponse,
    errorResponse
 }                                      from "@/middleware/auth.ts";

// ==================================================================
//  Handler principal
// ==================================================================

/**
 * Gère POST /auth/reset-password.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function resetPassword(req: Request): Promise<Response> {
    
    //  --- Garde 0 :   Utilisateur déjà connecté ? -----------------
    //  Un utilisateur connecté doit utiliser /auth/update-password directement
    //  avec son JSON - pas la procédure de reset par email
    const existingToken = extractToken(req);
    if (existingToken) {
        return errorResponse(
            "Vous êtes déjà connecté. Utilisez update-password pour changer votre mot de passe.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  ---------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400)
    }

    //  Extraction et normalisation de l'email
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase()  : null;

    //  Validation du champ obligatoire
    if (!email) return errorResponse("Le champ 'email' est obligatoire.", 400);

    //  Validation du format email (vérifaction basique côté script)
    const emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
    if (!emailRegex.test(email)) {
        return errorResponse("Format d'email invalide.", 400);
    }

    //  --- Etape 2 :   Demande de reset via Supabase Auth  ---------
    //  resetPasswordForEmail() déclenche l'envoi d'un email avec un lien de reset.
    //  Supabase gère l'envoi SMTP - Ce handler ne fait que déclencher la demande.
    //
    //  IMPORTANT: On ne vérifie pas si l'email existe avant dans la base avant d'appeer
    //  cette fonction - Supabase gère ça en interne et ne révèle pas si l'email existe.
    //  C'est voulu pour éviter l'énumération d'emails.
    await supabase.auth.resetPasswordForEmail(email); 

    //  --- Etape 3 :   Réponse neutre (même si email inexistant)   -
    //  La réponse est toujours identique, qu'il y ait un compte ou non pour cet email.
    //  Celà empêche un attaquant de deviner quels emails sont enregistrés dans le système.
    return successResponse(
        null,
        "Si cet email est enregistré, un lien de réinitialisation a été envoyé.",
        200
    );
}