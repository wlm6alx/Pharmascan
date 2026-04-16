/**
 * =====================================================================================
 *  routes/users/updatetUser.ts -   PUT /users/me
 * =====================================================================================
 * 
 * Rôle :
 *  Mise à jour du profil de l'utilisateur connecté.
 *  Seuls name, surname, phone et username peuvent être modiiés ici.
 * 
 * CHAMPS MODIFIABLES   :
 *  -   name        : nom
 *  -   surname     : prénom
 *  -   phone       : contact téléphonique (format +XXX...)
 *  -   username    : pseudo unique (min 3 chars)
 * 
 * CHAMPS INTERDITS (protégés par RLS et triggers)  :
 *  -   email
 *  -   role
 *  -   userState
 *  -   id          
 * 
 * SECURITE :
 *  -   JWT requis
 *  -   Client authenntifié utilisé -> RLS "User can manage own proile"
 *      garantit qu'un utilisateur ne peut modifier que son propre profil
 *  -   Le trigger trg_update_own_manage vérifié unicité + longueur min 3
 * 
 * BODY JSON ATTENDU  Tous les champs sont optionnels   :
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
    errorResponse
 }                                              from "@/middleware/auth.ts";

// =====================================================================================
//  Handler principal
// =====================================================================================

/**
 * Gère PUT /users/me
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function updateUser(req: Request): Promise<Response> {

    // ---  Garde 1 :   Extraxtion et validation du JWT ---------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Validation du JWT + chargement du profil    ---------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Etape 1 :   Lecture du body JSON ---------------------------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalid. JSON attendu.", 400);
    }

    // ---  Etape 2 :   Construction des champs à mettre à jour --------------------------
    //  Seuls les champs explicitement présents dans le body sont mis à jour (patch partiel)
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
        //  Validation : name ne peut pas être vide après trim
        const name = body.name.trim();
        if (!name) return errorResponse("Le champ 'name' ne peut pas être vide.", 400);
        updates.name = name;
    }

    if (typeof body.surname === "string") {
        //  surname peut être vide -> null (suppression du prénom)
        updates.surname = body.surname.trim()   || null;
    }

    if (typeof body.phone === "string") {
        //  Validation du format phone_type SQL (+XXX...) ou null pour supprimer
        const phone = body.phone.trim();
        if (phone && !/^\+[0-9]/.test(phone)) {
            return errorResponse("Format téléphonique invalide. Format attendu: +XXX...", 400);
        }
        updates.phone = phone || null;
    }

    if (typeof body.username === "string") {
        //  Validation: min3 chars (miroir du trigger trg_update_own_username)
        const username = body.username.trim();
        if (username.length < 3){
            return errorResponse("Le username doit contenir au mmoins 3 caractères.", 400);
        }
        updates.username = username;
    }

    //  Vérification qu'au moins un champ est fourni
    if (Object.keys(updates).length === 0) {
        return errorResponse(
            "Aucun champ à mettre à jour. Champs modifiables: name, surname, phone, username.",
            400
        );
    }

    // ---  Etape 3 :   Mise à jour dans public.users   ----------------------------------   
    //  Client authentifié -> RLS "USer can manage own profile" filtre et 
    // garantit qu'un utilisateur ne peut modifier que son PROPRE profil
    const authClient = createAuthenticatedClient(token);

    const { data: updatedProfile, error: updateError } = await authClient
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select("id, name, surname, phone, username, email, role, created_at")
        .single();

    if (updateError || !updatedProfile) {
        //  Messages spécifiques issus des triggers SQL
        if (updateError?.message?.includes("Username already exists")) {
            return errorResponse("Cet username existe déjà.", 400);
        }
        if (updateError?.message?.includes("Username too short")) {
            return errorResponse('LE username doit contenir au moins 3 caractères.', 400);
        }
        return errorResponse("Impossible de mettre à jour le profil.", 500);
    }

    return successResponse(updatedProfile, "Profile mis à jour avec succès.", 200);
}