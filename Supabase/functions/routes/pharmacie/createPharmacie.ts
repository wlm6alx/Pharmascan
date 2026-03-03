/**
 * =================================================================
 * routes/pharmacie/createPharamcie.ts - Création d'une pharmacie
 * =================================================================
 * 
 * ROUTE : POST /pharmacie
 * 
 * RÔLE :
 *  Crée une pharmacie et lie le pharmacien appelant comme gérant.
 *  Délègue à la fonction SQL SECURITY DEFINER `create_pharmacy_with_gerant()`
 *  qui effectue toutes les opérations de manière atomique :
 *      1.  Vérifie que l'appelant est un pharmacien actif (role + userState)
 *      2.  Vérifie qu'il n'appartient pas déjà à une pharmacie
 *      3.  Crée la pharmacie (validate = false, exist = false - invisible au public)
 *      4.  Insère le document justificatif dans justif_pharmacie
 *      5.  Lie le pharmacien à sa pharmacie avec responsability = 'gerant
 * 
 *  La pharmacie est invisible au public jusqu'à validation par l'admin.
 * 
 * ACCES :   Pharmacien uniquement.
 * 
 * BODY JSON ATTENDU :
 *  {
 *      "name":             string  - Nom de la pharmacie (obligatoire)
 *      "adress":           string  - Adresse complète (obligatoire)
 *      "ville":            string  - Ville (obligatoire)
 *      "quartier":         string  - Quartier (obligatoire)
 *      "phone":            string  - Téléphone ormat +XXX (obligatoire)
 *      "document_path":    string  - Chemin du justiicatif dans Storage (obligatoire)
 *  }
 * 
 * REPONSES :
 *  201 Created     -> Pharmacie créée, UUID retourné
 *  400             -> Champs manquants, format invalide, pharmacien déjà affilié
 *  401             -> Non authentifié
 *  403             -> Non pharmacien
 *  500             -> Erreur de la fonction SQL
 * 
 * =================================================================
 */

import { getAdminClient }       from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
}                               from "@/middleware/auth.ts";

/**
 * Handler POST /pharmacie
 */
export async function createPharamcie(req: Request): Promise<Response> {
    
    //  --- Authentification + rôle pharmacien  --------------------
    const token = extractToken(req);
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const currentUser = authResult.user;

    if (!requireRole(currentUser, ["pharmacien"])) {
        return errorResponse("Seul un pharmacien peut créer une pharmacie.", 403);
    }

    //  --- Parsing du body ----------------------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de requête JSON invalide.", 400);
    }

    //  --- Extraction des champs   --------------------------------
    const name          = typeof body.name              === "string" ? body.name.trim()         : "";
    const adress        = typeof body.adress            === "string" ? body.adress.trim()       : "";
    const ville         = typeof body.ville             === "string" ? body.ville.trim()        : "";
    const quartier      = typeof body.quartier          === "string" ? body.quartier.trim()     : "";
    const phone         = typeof body.phone             === "string" ? body.phone.trim()        : "";
    const documentPath  = typeof body.document_path     === "string" ? body.document_path.trim(): "";

    //  --- Validation des champs obligatoires  --------------------
    if (!name || ! adress || ! ville || ! quartier || !phone || !documentPath) {
        return errorResponse(
            "Champs obligatoires.",
            400
        );
    }

    //  --- Validation du format téléphone  ------------------------
    if (!/^\+[0-9]+$/.test(phone)) {
        return errorResponse("Format de téléphon einvalide. Veuillez utiliser le format international: +237XXXXXXXXX",
            400
        );
    }

    const ADMIN_SECRET = Deno.env.get("ADMIN_CLIENT_SECRET")!;
    const supabaseAdmin = getAdminClient(ADMIN_SECRET);

    //  --- Appel de la fonction SQL SECURITY DEFINER   ------------
    //  La fonction create_pharmacy_with_gerant() effectut toutes les vérifications
    //  et créations de manière atomique (transaction implicite via plpgsql).
    const {data: pharmacieId, error: rpcError } = await supabaseAdmin.rpc(
        "create_pharmacy_with_gerant",
        {
            p_name:             name,
            p_adress:           adress,
            p_ville:            ville,
            p_quartier:         quartier,
            p_phone:            phone,
            p_user_id:          currentUser.id,
            p_responsability:   "gerant",       //  Createur toujours gérant
            p_doc:               documentPath,
        }
    );

    if (rpcError) {
        //  Messages d'erreur levés par la fonction SQL (RAISE EXCEPTION)
        if (rpcError.message?.includes("autorisé")) {
            return errorResponse(
                "Accès non autorisé.",
                403
            );
        }
        if (rpcError.message?.includes("appartient")) {
            return errorResponse(
                "Vous appartenez déjà à une pharmacie. Retirez-vous d'abord de cette dernière.",
                400
            );
        }
        return errorResponse(
            `Erreru lors de la création : ${rpcError.message}`,
            500
        );
    }

    return successResponse(
        {
            pharmacie_id:       pharmacieId,                    //  UUID de la pharmacie crée (RETURNS UUID)
            status:             "pending_validation",
            message:            "Pharmacie créée. En attente de validation par l'administrateur."
        },
        "Pharamcie créée avec succ-s.",
        201
    );
}