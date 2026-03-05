/**
 * =====================================================================================
 *  routes/users/getUser.ts -   GET /users/me   |   GET /users/profile
 * =====================================================================================
 * 
 * Rôle :
 *  Consultation du profil utilisateur. Deux modes selon le paramètre 'mode' passé par server.ts :
 *  
 *  mode "me"       -> GET /users/me
 *      Retourne le profil complet de l'utilisateur connecté (JWT requis).
 *      Accessible par tout utilisateur authentifié (tous rôles).
 * 
 *  mode "profile"  -> GET /users/profile?username=<value>
 *      Retourne le profil public d'un utilisateur par username.
 *      Réservé à l'admin (rôle requis : 'admin').
 *      Usage : adminsitration, support, audit.
 * 
 * SECURITE :
 *  -   JWT requis dans les deux modes
 *  -   Mode "profile"  :   requireRole(user, ["admin"])    -   403 si non admin
 *  -   RLS active: "Users can read their data"
 *      ->  En mode "me", on utilise le client authentifié (RLS filtre automatiquement)
 *      ->  En mode "profile", on urilise le client admin (bypass RLS - accès admin vérifié en amont)
 * 
 * PARAMETRES   :
 *  {
 *      name:       string
 *      surnema:    string
 *      phone:      string format +XXX...
 *      username:   string min 3 chars, unique
 *  }
 * Au moins un champ doit être fourni.
 * 
 * REPONSE SUCCESS 200  :
 *  { success: trut, message: "Profil mis à jour.", data: { id, name, surname, phone, username, email, role }}
 * 
 * =====================================================================================
 */

import { createAuthenticatedClient }            from "@/supabaseClient.ts";
import { extractToken,
    getAuthenticatedUser,
    successResponse,
    errorResponse,
    requireRole
 }                                              from "@/middleware/auth.ts";
import { getAdminClient, getAdminSecret }       from "@/supabaseAdminClient.ts";

// =====================================================================================
//  Handler principal
// =====================================================================================

/**
 * Gère PUT /users/me et GET /users/profile selon le mode passé par serveer.ts
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @param mode  "me" -> profli propre | "profile" par username (admin)
 * @returns     Response JSON standardisée
 */
export async function getUser(req: Request, mode: "me" | "profile"): Promise<Response> {

    // ---  Garde 1 :   Extraxtion et validation du JWT ---------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Validation du JWT + chargement du profil    ---------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Branchement selon le mode   --------------------------------------------------
    if (mode === "me") {
        return await getOwnProfile(token, user.id);
    } else {
        return await getProfileByUsername(req, user);
    }
}

// =======================================================================================
//  Mode "me"   -   GET /users/me
// =======================================================================================

/**
 * Retourne le profil de l'utilisateru connecté.
 * Uitlise le client authentifié (RLS appliquée)
 * 
 * @param token     JWT de l'utilisateur authentifié
 * @param userId    UUID de l'utilisateur (déjà vérifié par getAuthenticatedUser)
 */
async function getOwnProfile(token: string, userId: string): Promise<Response> {
    
    //  Le client authentifié   -   les RLS filtrent automatiquement
    //  La politique "Users can read their data" garantit que seul l'utilisateur voit son propre profil
    const authClient = createAuthenticatedClient(token);

    const { data: profile, error } = await authClient
        .from("users")
        .select("id, name, surname, phone, username, email, role, userState, created_at")
        .eq("id", userId)
        .single();

    if (error || !profile) {
        return errorResponse("Profil introuvable.", 404);
    }

    return successResponse (profile, "Profil récupéré.", 200)
}

// ========================================================================================
//  Mode "profile"  -   GET /users/profile?username=<value>
// ========================================================================================

async function getProfileByUsername(req: Request, user: import("@/middleware/auth.ts").AuthenticatedUser): Promise<Response> {
    
    //  Vérification du rôle    -   admin uniquement
    const denied = requireRole(user, ["admin"]);
    if (denied) return denied;
    
    //  Extraction du paramètre username depuis l'URL
    const url       = new URL(req.url);
    const username  = url.searchParams.get("username")?.trim() ?? null;

    if (!username) {
        return errorResponse("Le paramètre 'username' est obligatoire.", 400);
    }

    //Client admin bour bypasser les RLS    -   accès admin vérifié en amont par requireRole
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveru.", 500);
    }

    const { data: profile, error } = await adminResult.client
        .from("users")
        .select("id, name, surname, phone, username, email, role, userState, created_at")
        .eq("username", username)
        .single();

    if (error || !profile) {
        return errorResponse(`Aucun utilisateur trouvé avec le username '${username}'.`, 404);
    }

    return successResponse(profile, "Profil utilisateur récupéré.", 200);
}