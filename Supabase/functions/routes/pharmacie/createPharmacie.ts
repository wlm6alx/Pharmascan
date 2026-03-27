/**
 * =================================================================
 * routes/pharmacie/createPharamcie.ts -    POST /pharmacie
 * =================================================================
 * 
 * Cette novelle pharamcie (sans justificatif) et lie le pharamcien appelant
 * en tant que gérant.
 * 
 * FLUX COMPLET DE CREATION DE PHARMACIE    :
 * 
 *  Prérequis   :   Flux pharamcien terminé (role='pharamcien', profil dans public.pharamcien)
 *                  ET aucune pharamcie actuellement occupée (pharmacie_id IS NULL)
 * 
 *      1.  POST    /pharmacie (ce handler)
 *          ->  Remplit le formulaire de création (name, adress, ville, quartier, phone).
 *          ->  Appelle create_pharmacy_with_gerant() via RPC.
 *          ->  Crée la pharmacie (validate=false, exist=false - invisible).
 *          ->  Lie le pharamcien comme gérant (pharamcie_id non null désormais).
 *          ->  EN ATTENTE  :   La pharamcie n'est pas encore visible publiquement.
 * 
 *      2.  POST    /justificatifs/pharmacie
 *          ->  Le gérant prouve l'existence légale de la pharamcie (document officiel).
 *          ->  insère dans justif_pharamcie avec validate=false.
 * 
 *      3.  Admin examinde le dossier
 *          ->  Valide  :   POST /admin/pharmacie/validate  -> validate = false, exist = true
 *          ->  Refuse  :   POST /admin/pharmacie/refuse    -> pharmaciens détchés
 * 
 * REGLES D'ANNULATION AUTOMATIQUE:
 *  Durant tout le processus (entre étape 1 et la réponse de l'admin), si le pharmacien rejoint
 *  une autre pharmacie via une clé d'invitation (POST /pharmacie/join), l'appel suivant à cette 
 *  route détecte l'affiliation et déclenche automatiquement admin_refuse_pharmacy() sur la pharmacie
 *  en attente, puis retourne 409. Cette vérification est effectuée en Garde 4 à chaque appel.
 * 
 * OPERATION VIA RPC    :
 *  Appelle la fonction SQL SECURITY DEFINER create_pharmacy_with_gerant()
 *  qui effectue en une seule transaction :
 *    1. Vérifie que l'appelant est pharmacien avec userState = true
 *    2. Vérifie qu'il n'appartient à aucune pharmacie (pharmacie_id IS NULL)
 *    3. Crée la pharmacie (validate=false, exist=false)
 *    4. Insère le justificatif initial (p_doc_path) dans justif_pharmacie
 *    5. Lie le pharmacien à la pharmacie avec responsability = 'gerant'
 * 
 * Note :   La fonction SQL p_doc_path. On passe une chaîne vide "" car le justificatif réel sera soumis
 * séparément via POST /justificatifgs/pharmacie. Le document_path sera mis à jour par updateJustifPharmacie après soumission.
 * 
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle "pharmacien" requis
 *  - La fonction SQL vérifie elle-même l'autorisation (SECURITY DEFINER)
 *  - Garde 4 : annulation automatique si le pharmacien est déjà affilié ailleurs
 *
 * BODY ATTENDU (JSON) :
 *      name        string  requis — nom de la pharmacie
 *      adress      string  requis — adresse
 *      ville       string  requis — ville
 *      quartier    string  requis — quartier
 *      phone       string  requis — format +XXXXX
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { pharmacie_id } }
 * 
 * =================================================================
 */

import { getAdminClient, getAdminSecret }       from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
}                                               from "@/middleware/auth.ts";
import { createAuthenticatedClient }            from "@/supabaseClient.ts";
import { AuthClient } from "@supabase/supabase-js";

/**
 * Handler POST /pharmacie
 */
export async function createPharamcie(req: Request): Promise<Response> {
    
    //  --- Garde 1 :   JWT -----------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  -----------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const { user } = authResult;

    // ---  Garde 3 :   Rôle pharmacien -----------------------------------
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Seul un pharmacien peut créer une pharmacie.", 403);
    }

    // ---  Garde 4 :   Vérification affiliation + annulation automatique -
    //  Si le pharmacien est déjà affilié à une pharamcie, on vérifie s'il a une
    //  demande en attente (validate=false dans justif_pharamcei).
    //  Si oui -> admin_refuse_pharamcy() est appelé de force et automatiquement.
    //  Cette règles s'applique à chaque tentative d'accès à cette route.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    const { data: pharmProfile } = await adminClient
        .from("pharmacien")
        .select("pharmacie_id")
        .eq("user_id", user.id)
        .single();

    if (pharmProfile?.pharmacie_id) {
        //  Le pharmacien est affilié à une pharmacie - chercher une demande en attente
        //  soumise par cet utilisateur (justif non validé = processus encore en cours)
        const { data: pendingJustif } = await adminClient
            .from("justif_pharmacie")
            .select("pharmacie_id, validate")
            .eq("upload_by", user.id)
            .eq("validate", false)
            .single();

        if (pendingJustif?.pharmacie_id) {
            //  Demande en attente détectée Et pharmacien déjà affilié ailleurs
            //  ->  annulation automatique et forcée via admin_refuse_pharmacy()
            //  -> détache tous les pharmaciens + marque validate=false, exist=true
            const authClientForRpc = createAuthenticatedClient(token);
            try {
                await authClientForRpc.rpc("admin_refuse_pharmacy", {
                    p_pharmacie_id: pendingJustif.pharmacie_id,
                });
            } catch (rpcErr) {
                //  Non bloquant - on log et on continue le refus côté réponse
                console.error("[createPharamcei] Annulation automatique échouée: ", rpcErr);
            }
            return errorResponse(
                "Vous avez rejoint une autre pharmacie. Votre demande de création en attente a été annulée automatiquement.",
                409
            );
        }

        //  Affilié sans demande en attente -> blocage simple
        return errorResponse(
            "Vous appartenez déjà à une pharamcie. Quittez-la avant d'en créer une nouvelle.",
            409
        );
    }

    //  --- Lecture du body ----------------------------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de requête JSON invalide.", 400);
    }

    //  --- Extraction des champs   --------------------------------------
    const name          = typeof body.name              === "string" ? body.name.trim()         : "";
    const adress        = typeof body.adress            === "string" ? body.adress.trim()       : "";
    const ville         = typeof body.ville             === "string" ? body.ville.trim()        : "";
    const quartier      = typeof body.quartier          === "string" ? body.quartier.trim()     : "";
    const phone         = typeof body.phone             === "string" ? body.phone.trim()        : "";

    //  --- Validation des champs obligatoires  --------------------
    if (!name || ! adress || ! ville || ! quartier || !phone) {
        return errorResponse(
            "Champs obligatoires.",
            400
        );
    }

    //  --- Validation du format téléphone  ------------------------
    if (!/^\+[0-9]+$/.test(phone)) {
        return errorResponse("Format de téléphon einvalide. Veuillez utiliser le format international: +XXX...",
            400
        );
    }


    //  --- Appel de la fonction SQL SECURITY DEFINER   ------------
    //  La fonction create_pharmacy_with_gerant() effectut toutes les vérifications
    //  et créations de manière atomique (transaction implicite via plpgsql).
    const authClient = createAuthenticatedClient(token);

    const {data: pharmacieId, error: rpcError } = await authClient
        .rpc("create_pharmacy_with_gerant", {
            p_name:             name,
            p_adress:           adress,
            p_ville:            ville,
            p_quartier:         quartier,
            p_phone:            phone,
            p_user_id:          user.id,
            p_responsability:   "gerant",       //  Createur toujours gérant
            p_doc:               "",            //  justificatif soumis séparément
        }
    );

    if (rpcError) {
        //  Messages d'erreur levés par la fonction SQL (RAISE EXCEPTION)
        if (rpcError.message?.includes("non autorisé")) {
            return errorResponse(
                "Accès non autorisé.",
                403
            );
        }
        if (rpcError.message?.includes("appartient déjà")) {
            return errorResponse(
                "Vous appartenez déjà à une pharmacie. Retirez-vous d'abord de cette dernière.",
                409
            );
        }
        return errorResponse(
            `Erreur lors de la création : ${rpcError.message}`,
            500
        );
    }

    return successResponse(
        { pharmacie_id: pharmacieId },
        "Pharamcie créée avec succès. Soumettez maintenant votre justificatif via POST /justificatifs/pharamcis, puis attendez la validation de l'administrateur.",
        201
    );
}