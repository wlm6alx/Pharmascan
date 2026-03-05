/**
 * ===============================================================
 * middleware/auth.ts -  Middleware central d'authentification
 * ===============================================================
 * 
 * ROLE:
 *  Ce fichier est le point de passage obligatoire de toutes les 
 *  routes protégées. Il concentre toutel la logique 
 *  d'authentification et de vérification des droits en un seu endroit.
 * 
 * FLUX D'AUTHENTIFICATION STANDARD (appliqué dans chaque roue):
 *      Requête HTTP entrante
 *              |
 *              |
 *              ▼
 *      extractToken()                      -> Extraire le JWT du header Authorization
 *              |
 *              |
 *              ▼ (token vide -> 401)
 *      getAuthenticatedUser()              -> Vérifier le JWT + charger le profil BDD
 *              |
 *              |- JWT invalidé/expiré      -> 401
 *              |- Profil introuvable       -> 401
 *              |- userState = false        -> 403 (compte désactivé)
 *              |
 *              ▼ (authentifié V)
 *      requireRole()                       -> Vérifier le rôle (optionnel selon la route)
 *              |
 *              |- Rôle insuffisant         -> 403
 *              |
 *              ▼ (autorisé v)
 *      Logique métier de la route
 *              |
 *              |
 *              ▼
 *      SuccessResponse()/errorResponse()   -> Réponse JSON standardisée
 * 
 * EXPORTS:
 *  Types       : AuthenticatedUser
 *  Functions   : extractToken, getAuthenticatedUser, requireRole
 *                successResponse, errorResponse, jsonResponse
 *  ==============================================================
 */

import { supabase }         from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";

//  ==============================================================
//  SECTION 1 - Types et interfaces
//  ==============================================================

/**
 * Rôles possibles pour un utilisateur (miroir du ENUM SQL user_role).
 * Ces valeurs correspondent aux valeurs définies dans:
 *      CREATE TYPE user_role AS ENUM ('admin', 'pharmacien', 'patient', 'user') 
 */
export type UserRole = "admin" | "pharmacien" | "patient" | "user";

/**
 * Profil complet d'un utilisateur authentifié.
 * 
 * Cet objet est construit par getAuthenticatedUser() et passe à chaque
 * handler de route. Il contient toutes les informations nécessaires pour
 * prendre des décisions d'autorisation sans requêtes supplémentaires.
 * 
 * WARNING: L'identifiant interne (UUID) n'est pas exposé dans les requêtes HTTP.
 *          Il est présent ici uniquement pour les opérations internes
 *          (résolution d'IDs, jointures, appels RPC).
 */
export interface AuthenticatedUser {
    //  UUID interne - usage interne uniquement, ne  jamais retourner en JSON
    id: string;

    //  Identifiant public unique de l'utilisateur
    username: string;

    //  Nom
    name: string

    //  Prénom (optionnel)
    surname: string | null;

    //  email - synchronisé avec auth.users
    email: string;

    //  Téléphone au format international
    phone: string | null;

    //  Rôle déterminant les droits d'accès
    role: UserRole;

    /**
     * Etat du compte:
     *  True    -> Compte actif, l'utilisateur est connecté
     *  False   -> Compte inactif, l'utilisateur n'est pas connecté
    */
   userState: boolean;
}

//  ==============================================================
//  SECTION 2 - Extraction du token JWT
//  ==============================================================

/**
 * Extrait le token JWT depuis le header Authorization d'une requête HTTP.
 * 
 * Format attendu du fichier:
 *      Authorization: Bearer eyJhbGci0iJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @param req   La requête HTTP Deno/Edge Function entrante
 * @returns     Le token JWT nu (sans "Bearer"), ou chaine vide si absent
 * 
 * @example
 *  const token = extractToken(req);
 *  if (!token) return errorResponse("Token manquant", 401);
 */
export function extractToken(req: Request): string {
    //  Lire le header Authorization. Retourne null s'il est absent.
    const authHeader: string | null = req.headers.get("Authorization");

    //  Si le header est absent, retourner une chaîne vide
    if (!authHeader) return "";

    //  Supprimer le préfixe "Bearer " pour isoler le token nu.
    //  trim() supprime les espaces accidentels en début/fin.
    return authHeader.replace("Bearer ", "").trim();
}

//  ==============================================================
//  SECTION 3 -   Vérification du JWT et chargement du profil
//  ==============================================================

/**
 * Vérifie le JWT et retourne le profil complet de l'utilisateur connecté.
 * 
 * ETAPES INTERNES :
 *  1.  Appel à supabase.auth.getUser(token) pour valider la signature du JWT
 *      et vérifier qu'il n'est pas expiré auprès du serveur Supabase Auth.
 *  2.  Récupération du profil dans la table public.users via l'UUID auth.
 *      Cette table contient username, role, userState, etc.
 *  3.  Vérification que userState = true (compte activé).
 * 
 * @param token     JWT extrait par extractToken(). Peut être vide("").
 * @returns         { user: AuthenticatedUser } si valide
 *                  { error: string, status: number } si invalide
 * 
 * @example
 *  const result = await getAuthenticatedUser(token);
 *  if ("error" in result) return errorResponse(result.error, result.status);
 *  const currentUser = result.user;
 */
export async function getAuthenticatedUser(
    token: string
): Promise <{ user: AuthenticatedUser } | { error: string; status: number}> {

    //  --- Vérification préliminaire : token fourni -------------
    //  Si le token est vide, inutile d'interroger Supabase Auth
    if (!token) {
        return { 
            error: "Authentification requise. Token manquant.",
            status: 401
        };
    }

    //  --- Etape 1 :   Validation du JWT par Supabase Auth ------
    //
    //  getUser() contacte le serveur Supabase Auth pour :
    //      - Vérifier la signature cryptographique du JWT
    //      - Vérifier que le JWT n'est pas expiré
    //      - Retourner les données utilisateur stockées dans auth.users
    //
    //  Utilise le client ANON (supabase) car getUser n'a pas besoin
    //  de droits élevés - Il vérifie uniquement la validité du token.
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || ! authData?.user) {
        //  Token invalide, expiré ou vévoqué
        return {
            error: "Session invalide ou expirée. Veuillez vous reconnecter.",
            status: 401,
        };
    }

    //  authData.user.id contient l'UUID de l'utilisateur dans auth.users
    const authUserId: string = authData.user.id;

    //  --- Etape 2 :   Chargement du profil depuis public.users -
    //
    //  Utilise le client ADMIN pour continuer les RLS.
    //  Jsutification : On charge le profil de l'utilisateur identifié par
    //  son UUID auth - opération interne de middleware qui ne dépend pas
    //  des RLS utilisateur.
    //
    //  Alternatice ave client authentifié : possible, mais le middleware
    //  s'exécute avant que le client authentifié soit créé pour la route.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return{
            error: "Erreur interne : client admin indisponible",
            status: 500
        };
    }

    const { data: userProfile, error: profileError } = await adminResult.client
        .from ("users")
        .select("id, username, name, surname, email, phone, role, userState")
        //  Filtre l'UUID retourné par Supabase Auth
        .eq("id", authUserId)
        //  On attend exactement 1 résultat - erreur si 0 ou plus
        .single();

    if (profileError || !userProfile) {
        //  L'utilisateur existe dans auth.users mais pas dans public.users.
        //  Cas possible si la création de profil a échoué partiellement.
        return {
            error: "Profil utilisateur introuvable. Contactez le support.",
            status: 401,
        };
    }

    //  --- Etape 3 :   Vérification que le compte est actif -----
    //
    //  Aucun uitilsateur n'utlise ce compte (toogleUserState).
    //  Un compte en cours d'utilisation (userState = true) doit d'abord
    //  être déconnecté d'un appareil pour pouvoir se connecter sur un autre
    if (!userProfile.userState) {
        return {
            error: "Aucune session active. Veuillez d'abord vous connecter.",
            status: 401,
        };
    }

    //  --- Succeès :   Retourner le profil structuré ------------
    return {
        user: {
            id: userProfile.id,                 //  UUID interne - uage interne unqiuement
            username: userProfile.username,
            name: userProfile.name,
            surname: userProfile.surname,
            email: userProfile.email,
            phone: userProfile.phone,
            role: userProfile.role as UserRole,
            userState: userProfile.userState, 
        },
    };    
}   

//  ==============================================================
//  SECTION 4 - Vérification du rôle
//  ==============================================================

/**
 * Vérifie que l'utilisateur possède l'un des rôle autorisés.
 * 
 * A appeler après getAuthenticatedUser(), uniquement si la route est
 * restreinte à certaisn rôles.
 * 
 * @param user          Profil de l'utilisateur connecté (depuis getAuthenticateduser)
 * @param allowedRoles  Liste des rôles pouvant accéder à cette route
 * @returns             true si le rôle est autorisé, false sinon
 * 
 * @example
 *  // Route réservée à l'admin:
 *  if (!requireRole(currentUser, ["admin"])) {
 *      return errorResponse("Accès réservé à l'administrateur.", 403);
 *  }
 *  
 *  //  Route accessible aux pharmaciens et admin :
 *  if (!requireRole(currentUser, ["pharmacien", "admin"])) {
 *      return errorResponse("Accès réservé aux pharmaciens.", 403);
 *  }
 */

export function requireRole(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
    //  Vérifie que le rôle de l'utilisateur igure dans la liste des rôles autorisés
    return allowedRoles.includes(user.role);
}

//  ==============================================================
//  SECTION 5 - Utilitaires de réponse JSON standardisés
//  ==============================================================

/**
 * Headers HTTP communs à toutes les réponses de l'API.
 * 
 * -    Content-Type    : JSON avec encodage UTF-8 (accents supportés)
 * -    CORS            : Autorise les requêtes cross-origin depuis n'importe quelle origine.
 * 
 * WARNING:     En production, remplacer "*" par le domaine exact du frontend :
 *              "Access-Conrtol-Allow-Origin":  "https://pharmasca.app"
 */
const COMMON_HEADERS: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

/**
 * Crée une réponse JSON avec le statut et les headers appropriés.
 * 
 * Fonction de bas niveau utilisée par successResponse() et errorResponse().
 * Peut aussi être utilisée directement pour des réponses personnalisées.
 * 
 * @param body          Objet JavaScript à sérialiser en JSON
 * @param status        Code HTTP (200, 201, 400, 401, 403, 404, 409, 500...)
 * @returns             Objet Response Deno avec JSON + headers CORS
 */
export function jsonResponse(body: unknown, status: number = 200): Response {
    return new Response(
        //  Serialise l'objet en JSON.
        //  JSON.stringify retourne toujours une string valide pour les objets simples.
        JSON.stringify(body),
        {
            status,
            headers: COMMON_HEADERS,
        }
    );
}

/**
 * Crée une réponse JSON de succès standardisée.
 * 
 * Structure de réponse :
 *      {
 *          "success": true,
 *          "message": "...",       (optionnel)
 *          "data": { ... }         (optionnel)
 *      }
 * 
 * @param data          Données à retourner (objet, tableau, ou null)
 * @param message       Message de conirmation lisible par l'utilisateur
 * @param status        Code HTTP de succès (défaut : 200 OK)
 * 
 * @example
 *  return successRespone(
 *      { username: "johnson",
 *        role: "patient" 
 *      },
 *      "Proil récupéré avec succès."
 *  );
 *  //  -> HTTP 200 { success: true,  message: "...", data: { username: "johnson", ... }}
 * 
 *  return successResponse(null, "Opération effectuée.", 204);
 *  //  -> HTTP 204 { success: true, message: "...", data: null }
 */
export function successResponse(
    data: unknown = null,
    message: string = "Succès.",
    status: number = 200
): Response {
    return jsonResponse(
        {
            success: true,
            message,
            data,
        },
        status
    );
}

/**
 * Crée une réponse JSON d'erreur standardisée.
 * 
 * Structure de réponse :
 *  {
 *      "success": false,
 *      "error": "..."
 *  }
 * 
 * WARNING  Ne jamais inclure de données sensibles dans le message d'erreur :
 *          -   Pas d'UUIDs internes
 *          -   Pas de détails SQL (nom de tables, colonnes)
 *          -   Pas de stack traces
 *          -   Pas de valeurs de variables d'environnement
 * 
 * @param message       Message d'erreur lisible par l'utilisateur final
 * @param status        Code HTTP d'erreur (defaut : 400 Bad Request)
 * 
 * @example
 *  return errorResponse("Username dejè utilisé.", 409);
 *  //  -> HTTP 409 { success: false, error: "Username déjà utilisé." }
 * 
 *  return errorResponse("Authentification requise", 401).
 *  //  -> HTTP 401 { success: false, error: "Authentification requise." }
 */
export function errorResponse(
    message: string,
    status: number = 400
): Response {
    return jsonResponse(
        {
            success: false,
            error: message,
        },
        status
    );
}

/**
 * Réponse pour les requêtes OPTIONS (préflight CORS).
 *  
 *  Les navigateurs envoient une requête OPTIONS avant toutes requête
 *  cross-origin. Cette réponse vide avec les headers CORS appropriés
 *  permet au navigateur de valider la politique CORS avant d'envoyer
 *  la vraie requête.
 * 
 *  A placer en premier dans le server.ts :
 *      if (method === "OPTIONS") return corsPreflightResponse();
 */
export function corsPreflightResponse(): Response {
    return new Response(null, {
        status: 204,        //  No content - réponse vide attendue pour OPTIONS
        headers: COMMON_HEADERS,
    });
}