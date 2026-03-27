/**
 * ============================================================================================================================
 * routes/users/createPharmacien.ts  —  POST /users/pharmacien
 * ============================================================================================================================
 *
 * Crée ou finalise le profil pharmacien dans public.pharmacien.
 * Ce handler est appelé DEUX FOIS dans le fflux d'inscription pharmacien.
 *
 * CONTEXTE — Flux complet d'inscription pharmacien :
 *  1.  POST /auth/register                  
 *      -> crée public.users avec role='user' (neutre, sans droits métier)
 * 
 *  2.  POST /auth/login   
 *      -> démarre la session (userState=true)
 * 
 *  3.  POST /users/pharmacien                   <-  PHASE 1 -   Lecture et acceptation des clauses
 *      ->  L'utilisateur lit et accepte les conditions et responsabilités pharmacien.           
 *      ->  Crée l'entrée dans public.pharmacien avec pharmacie_id = NULL.
 *      ->  users.role reset 'user' à ce stade (pas encore promu).
 *      ->  BODY attendu    :   { acceptClauses:    true }
 *
 *  4.  POST /justificatifs/pharmacien 
 *      -> upload du justificatif de pharmacien (document requis) / autorisation (contrainte SQL obligatoire).
 * 
 *  5.  POST /users/pharmacien                   <-  PHASE 2 -   Validation et promotion du rôle
 *      ->  Le profil pharmacien existe déjà (phase 1 faite).
 *      ->  Le justificatif a été déposé (justif_pharmacien non vide pour cet user).
 *      ->  Promotion de users.role vers 'pharmacien' via client admin.
 *      ->  Le trigger SQL trg_enforce_pharmacien_role vérifie le justificatif en amont.
 *      ->  BODY    :   {} ou absent (la présence du profil + justif suffit)
 *
 * CE QUE CE HANDLER FAIT :
 *  Il crée une ligne dans public.pharmacien en liant le user existant (public.users)
 *  via user_id = users.id. La liaison confirme que cet utilisateur reçoit les
 *  privilèges et contraintes de pharmacien (RLS, triggers, politiques pharmacie).
 *
 *  La fonction SQL enforce_pharmacien_role() est déclenchée AVANT l'insertion
 *  (trigger trg_enforce_pharmacien_role sur public.users AFTER UPDATE).
 *  Elle vérifie que l'utilisateur a bien un justificatif dans justif_pharmacien.
 *  Si absent → exception SQL → 403.
 * 
 * DETECTION DE LA PHASE    ( automatique)  :
 *  -   Phase 1         :   aucun profil pharmacien existant        -> création après acceptClauses=true
 *  -   Phase 2         :   profil existant +   role encore 'user'  -> promotion après vérif justificatif
 *  -   Déjà finalisé   :   profil existant + role='pharmacien' -> idempotent (200)
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - requireRole : 'pharmacien' uniquement
 *    (le rôle doit avoir été positionné à 'pharmacien' lors de /auth/register)
 *  - pharmacie_id = NULL à la création (non encore affilié à une pharmacie)
 *  - Un pharmacien ne peut avoir qu'une entrée dans public.pharmacien (clé primaire user_id)
 *
 * BODY ATTENDU (JSON) :
 *      responsability  "gerant" | "pharmacien"   optionnel (défaut: "pharmacien")
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { user_id, pharmacie_id, responsability, created_at } }
 *
 * TRIGGERS SQL impliqués :
 *  - trg_enforce_pharmacien_role (AFTER UPDATE sur users) :
 *    vérifie la présence d'un document dans justif_pharmacien
 *
 * ============================================================================================================================
 */

import { createAuthenticatedClient }                        from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }                   from "@/supabaseAdminClient.ts";
import { 
    extractToken,
    getAuthenticatedUser, 
    requireRole, 
    successResponse, 
    errorResponse
}                                                           from "@/middleware/auth.ts";

// ============================================================================================================================
//  Handler principal
// ============================================================================================================================

/**
 * Gère POST /users/pharmacien.
 * Détecte automatiqeument la phase (1 ou 2) selon l'état du profil.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createPharmacien(req: Request): Promise<Response> {

    // --- Garde 1 : JWT requis -----------------------------------------------------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // --- Garde 2 : Validation JWT + session active (userState = true) -------------------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // --- Garde 3 : Rôle 'user' ou 'pharmacien' requis -----------------------------------------------------------------------
    // 'user'               -> peut démarrer la phase 1 (vient de register)
    // 'pharmacien'         -> peut repasser en phase 2 (a déjà accepté les clauses)
    // 'patient', 'admin'   -> refusés - ils ne peuvent pas créer un profil pharmacien
    if (!requireRole(user, ["user", "pharmacien"])) {
        return errorResponse("Ce compte ne peut pas créer un profil pharmacien.", 403);
    }

    // --- Étape 1 : Lecture du body JSON -------------------------------------------------------------------------------------
    //  Body optionnel  -   absent en phase 2 (idempotence aprè-s justificatif)
    let body: Record<string, unknown> = {};
    try {
        body = await req.json();
    } catch {
        // Body absent → responsability par défaut
    }

    // Responsabilité — "gerant" ou "pharmacien" (défaut : "pharmacien")
    const responsability: "gerant" | "pharmacien" =
        body.responsability === "gerant" ? "gerant" : "pharmacien";

    // --- Étape 2 : Chargement de l'état actuel du profil pharmacien   -------------------------------------------------------
    // Client admin pour lire sans contrainte RLS (lecture système, pas action user).
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    const { data: existingProfil } = await adminClient
        .from("pharmacien")
        .select("user_id, pharmacie_id, responsability, created_at")
        .eq("user_id", user.id)
        .single();

    // ========================================================================================================================
    //  --- BRANCHE A   :   Profil déjà existant (phase 2 ou idempotence)   ---------------------------------------------------
    // ========================================================================================================================
    if (existingProfil) {

        //  Idempotence :   rôle déjà 'pharmacien'  -> rien à faire
        if (user.role === "pharmacien") {
            return successResponse(
                { ...existingProfil, phase: "déjà_valide" },
                "Profil pharmacien déjà actif.",
                200
            );
        }

        //  PHASE 2 :   profil existe + role encore 'user'
        //  ->  Promotion vers role='pharmacien' via client admin
        //  -> Le trigger SQL trg_enorce_pharmacien_role (AFTER UPDATE ON users)
        //      vérifie que justif_pharmacien contient un document pour cet user.
        //      Si absent -> exception SQL remontée comme erreur 403.
        const { error: promoteError } = await adminClient
            .from("users")
            .update({ role: 'pharmacien '})
            .eq("id", user.id);

        if (promoteError) {
            // Trigger SQL a rejeté la promotion - justificatif manquant
            if (promoteError.message?.includes("justificatif") ||
                promoteError.message?.includes("document")) {
                return errorResponse(
                    "Justificatif manquant. Déposez d'abord votre document via justificatif/pharmacien, puis rappellez cette route.", 
                    403);
            }
            return errorResponse("Impossible de créer le profil pharmacien.", 500);
        }

        return successResponse(
            { ...existingProfil, phase: "profil_valide" },
            "Profil pharmacien validé. Vous pouvez maintenant créer ou rejoindre une pharmacie.",
            200
        );
    }

    // ========================================================================================================================
    //  --- BRANCHE B   :   aucun profil -> phase 1, création après acceptation clauses ---------------------------------------
    // ========================================================================================================================

    //  L'utilisateur doit explicitement accepter les clauses de responsabilité
    //  pharmacien avant que son profil soit créé dans public.pharmacien
    const acceptClauses = body.acceptClauses === true;
    if (!acceptClauses) {
        return errorResponse(
            "Vous devez lire et accepter les clauses de responsabilité pharmacien pour créer votre profil.",
            400
        );
    }

    // --- Étape 3 : Promotion du rôle users.role = 'pharmacien' --------------------------------------------------------------
    //  pharmacie_id = NULL -> le pharmacien n'est pas encore affilié à une pharmacie.
    //  users.role reste 'user' - la promotion n'arrive qu'en phase 2, après justificatif.
    //  Client authentifié  -> auth.uid() actif pour les RLS.
    //  RLS "pharmacien one pharmacy" vérifie qu'il n'a pas déjà une entrée (clé primaire user_id).
    const authClient = createAuthenticatedClient(token);

    const { data: pharmacien, error: insertError } = await authClient
        .from("pharmacien")
        .insert({
            user_id:        user.id,        //  liaison avec public.users
            pharmacie_id:   null,           //  non affilié à la création
            responsability: "pharamcien",   //  rôle par défaut (gérant possible après pharmacie)
        })
        .select("user_id, pharmacie_id, responsability, created_at")
        .single();

    if (insertError || !pharmacien) {
        if ((insertError?.message?.includes("duplicate key"))) {
            return errorResponse("Un profil pharmacine existe déjà pour ce compte.", 409);
        }
        return errorResponse("Impossible de créer le profil pharmacien.", 500);
    }

    return successResponse(
        { ...pharmacien, phase: "clauses_acceptées" },
        "Clauses acceptées. Déposez maintenant votre justificatif via POST justificatif pharmacien, puis rappellez cette route pour finaliser votre profil.",
        201);
}