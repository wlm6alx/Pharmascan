/**
 * =================================================================
 *  routes/auth/refreshToken.ts -   POST    /auth/refresh
 * =================================================================
 * 
 * RÔLE :
 *  Echange un refreshToken valide contre une nouvelle paire
 *  (access_token + refresj_token) sans que l'utilisateur n'ait 
 *  à ressaisir ses identifiants.
 * 
 * QUAND L'APPELER (côté client Flutter / React / Vue)  :
 *  -   A la réception d'une réponse HTTP 401 avec error "Session invalide ou expirée"
 *  -   Automatiquement avant l'expiratin (ex. : timer tous les 50 min)
 *  -   Au démarrage de l'alicatin si un refreshToken est localement stocké
 * 
 * REGLES METIER    :
 *  -   Route ublique :  Pas de JWT requis (justement son but)
 *  -   Un refreshTken ne peut être utilisé qu'une seule fois (rotation)
 *      Supabase invalide l'ancien à chaque échange réussi
 *  -   userState dit rester true   :   On ne le modifie pas ici
 *  -   Si le refreshTken est expiré ou révoqué -> 401, l'utilisateur 
 *      doit se reconnecter manuellement via POST auth/login
 * 
 * LOGIQUE:
 *  1 - Erreur 401
 *  2 - Client tente POST /auth/refresh avec le refreshToken stocké
 *      ->  Succès 200  -> Stock les nouveaux tokens
 *                      -> refouer la requête originale
 *      ->  Echec 401   -> Effacer tous les tokens stockés
 *                      ->  rediriger vers l'écran de login
 *                      -> userState sera remis à false par le prochain logout ou par l'admin
 * 
 * BODY JSON ATTENDU    :
 *  { refreshToken: string }
 * 
 * RESPONSE SUCCESS 200 :
 *  {
 *      success: true;
 *      data: {
 *          token:          string  nouveau JWT (access_token)
 *          refreshToken:   string  nouveau refreshToken (rotation)
 *          expiresIn:      number  secndes avant exiratin du nuveau JWT
 *      }
 *  }
 * 
 * =================================================================
 */

import { supabase }                         from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";
import { successResponse, errorResponse }   from "@/middleware/auth.ts";

// =================================================================
//  Handler principal
// =================================================================

export async function refreshToken(
    refreshTokenValue: string       //  extrait du body par server.ts
): Promise<Response> {

    //  ---  Validation de la présence du champ  -------------------
    //  Le refreshToken est une chaîne opaque fournie par Supabase Auth 
    //  lors du login. Sa longueur et son format ne sont pas vérifiables
    //  côté API.
    if (!refreshTokenValue || typeof refreshTokenValue !== "string") {
        return errorResponse("Le champ 'refreshToken' est obligatoire.", 400);
    }

    //  --- Echange du refreshToken contre une nouvelle session ---
    //  setSession() appelle l'endpoint Supabase Auth /token?grant_type=refresh_token
    //  Si le token est valide, Supabase retourne un nouvel access_token et un 
    //  nouveau refresh_token (rotation automatique - l'ancien est révoqué).
    //  Si le token est expiré, révoqué ou invalide, Supabase retourne une erreur.
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: "",
        refresh_token: refreshTokenValue,
    });

    if (sessionError || !sessionData?.session) {
        //  Token invalide, expiré ou déjà utilisé (rotation déjà effectuée)
        //  L'utilisateur doit se connecter via auth/login
        return errorResponse(
            "Session expirée ou invalide. Veuillez vous reconnecter.",
            401
        );
    }

    const newSession = sessionData.session;

    //  --- Vérification que userState est toujours actif   -------
    //  Cas rare mais possible : l'admin a forcé userState = false pendant que
    //  l'utilisateur avait encre un refreshToken valide.
    //  On bloque ici pour rester cohérent avec la logique de session unique
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }

    const { data: userRow } = await adminResult.client
        .from("users")
        .select("userState")
        .eq("id", newSession.user.id)
        .single();

    if (!userRow?.userState) {
        //  Session révoqué côté applicatif -> invalider aussi la session Supabase
        await supabase.auth.signOut();
        return errorResponse(
            "Session révoquée. Veuillez vous reconnecter.",
            401
        );
    }

    //  --- Retourner la nouvelle paire de tokens   ---------------
    //  Le client doit remplacer ses tokens stockés par ces nouvelles valeurs.
    //  L'ancien refreshToken est désormais invalide (rotation).
    return successResponse(
        {
            token:          newSession.access_token,
            refreshToken:   newSession.refresh_token,
            expiresIn:      newSession.expires_in,        //  en secndes, typiquement 3600
        },
        "Session renouvelée.",
        200
    );
}
