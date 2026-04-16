/**
 * ======================================================================================
 *  routes/auth/loginUser.ts    -   POST /auth/ogin
 * ======================================================================================
 * 
 * Rôle :
 *  Connexion d'un utilisateur via username + password.
 *  Retourne le JWT Supabase à utiliser dans le header Authorization des requêtes suivantes.
 * 
 * PARTICULARITE SUPABASE   :
 *  Supabase Auth ne gère nativement la connexion que par email + password.
 *  le username est stocké dan spublic.users - pas dans auth.users.
 *  Ce handler effectue donc deux étapes :
 *      1. Résolution username -> email via public.users (client admin)
 *      2. Connexion Supabase Auth avec email + password -> obtention du JWT
 * 
 * REGLES METIER :
 *  -   Route publique - pas de JWT requis
 *  -   Si un JWT est présent -> reus (déjà connecté)
 *  -   Vérification userState après connexion (compte activé -> 403 + déconnexion)
 *  -   Message d'erreur volontairement vaqgue pour éviter l'énumération
 *      (n epas révéler si c'est l'username ou le password qui est incorrect)
 * 
 * BODY JSON ATTENDU :
 *  {
 *      username: string        obligatoire
 *      password: string        obligatoire
 *  }
 * 
 * REPONSE SUCCESS 200 :
 *  {
 *      success: true,
 *      message: "Connexion réussie.",
 *      datta: {
 *          token:          string  JWT à inclure dans Authorization: Bearer <token>
 *          refreshToken:   string  Token de rafraichissement
 *          user: {
 *              id, name, surname, username, email, role, userState, created_at
 *          }
 *      }
 *  }
 * 
 * ======================================================================================
 */

import { supabase }                                     from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }               from "@/supabaseAdminClient.ts";
import { extractToken,
    successResponse,
    errorResponse
 }                                                      from "@/middleware/auth.ts";
 import { setUserState }                                from "@/routes/users/toogleUserState.ts";

// ======================================================================================
//  Handler principal
// ======================================================================================

/**
 * Gère POST /auth/login.
 * 
 * @param req       Requête HTTP entrante (body JSON)
 * @returns         Response JSON standardisée avec JWT si succès
 */
export async function loginUser(req: Request): Promise<Response> {
    
    //  --- Garde 0 :   Utilisateru déjà connecté ? -------------------------------------
    //  Un JWT présent signifie une session active  -   connexion inutile
    const existingToken = extractToken(req);
    if (existingToken) {
        return errorResponse(
            "Vous êtes déjà connecté. Déconnectez-vous avant de réessayer.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  -----------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    //  Extraction des champs
    const username  = typeof body.username === "string" ? body.username.trim()   : null;
    const password  = typeof body.password === "string" ? body.password          : null;

    //  Validation des champs obligatoires
    if (!username) return errorResponse("Le champ 'username' est obligatoire.", 400);
    if (!password) return errorResponse("Le champ 'password' est obligatoire.", 400);

    //  --- Etape 2 :   Résolution username -> email    ---------------------------------
    //  Supabase Auth ne connaît que les emails - On résout le username via public.users.
    //  Client admin pour bypasser les RLS (lecture interne, pas d'action utilisateur)
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const { data: userRown, error: userError } = await adminClient
        .from("users")
        .select("id, email, userState, role")
        .eq("username", username)
        .single();

    if (userError || !userRown) {
        //  Username introuvable    -   Message volontairement vague (pas d'énumération.)
        return errorResponse("Identifiants incoorects.", 401);
    }

    //  Vérification userState avant même de tenter la connexion Auth
    //  Eviter un appel réseau inutile si le compte est déjà activé
    if (userRown.userState) {
        return errorResponse("Vous êtes connecté sur un autre appareil. Veuillez d'abord vous déconnecter.", 403);
    }

    //  --- Etape 3 :   Connexion Supabase Auth avec email + password   -----------------
    //  supabase (client ANON) est utilisé pour signInWithPassword - usage standard.
    //  Supabase vériie le hash du password et génère un JWT signé.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email:  userRown.email,
        password,
    });

    if (authError || !authData?.session || !authData?.user) {
        //  Password incorrect ou compte email non confirmé
        //  Message volontairement vague pouir éviter l'énumération
        return errorResponse("Identifiants incorrects.", 401);
    }

    //  --- Etape 4 :   Mise à jour de userState -> true    -----------------------------
    //  L'utilisateur est maintenant connecté sur cet apareil
    //  userState = true bloque toute nouvelle connexion tant qu'il st connecté
    const stateResult = await setUserState(userRown.id, true);

    if (!stateResult.success) {
        //  Rollback de la session Supabase si la mise à jour échoue
        //  pour éviter un JWT valide sans userState = false
        await supabase.auth.signOut();
        return errorResponse("Erreur lors de l'activation de la session. Réessayez.", 500);
    }

    //  --- Etape 5 :   Chargement du profil complet post-connexion ---------------------
    //  authData.user contient les données auth.users (email, id) mais les champs de
    //  public.users (name, username, role, etc) - on les charge séparément.
    const { data: profile, error: profileError } = await adminClient
        .from("users")
        .select("id, name, surname, username, email, role, created_at")
        .eq("id", authData.user.id)
        .single();

    if (profileError || !profile) {
        //  JWT généré mais profil introuvable - incohérence base (rare)
        return errorResponse("Proil utilisateur introuvable.", 500);
    }

    //  --- Etape 6 :   Réponse success  ------------------------------------------------
    //  On retourne le JWT + reresh token + proil utilisateur.
    //  Le client stock le JWT et l'envoie dans Authorization: Bearer <token>
    //  pour toutes les requêtes suivantes vers les routes protégées.
    return successResponse(
        {
            token:          authData.session.access_token,
            refreshToken:   authData.session.refresh_token,
            user:           profile,
        },
        "Connexion réussie.",
        200
    );

}