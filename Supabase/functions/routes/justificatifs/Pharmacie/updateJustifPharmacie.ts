/**
 * ==============================================================
 * routes/justificatifs/Pharmacien/updateJustifPharamacie.ts
 * PUT /justificatifs/pharmacie
 * ==============================================================
 * 
 * Remplacement du document justificatif d'un pharmacie.
 * 
 * ______________________________________________________________
 * USAGE :
 *  Après refis de validation par l'admin (admin_refuse_pharmacy), le gérant
 *  soumet un nouveau document pour une nouvelle validation.
 *  L'ancien fichier est supprimé de Supabase Storage avant l'upload du nouveau.
 *  validate est remis à false  -> l'admin devra valider le nouveau document.
 * 
 * ______________________________________________________________
 * FORMAT DE REQUÊTE    :
 *  Content-Type    : multiart/form-data
 *  Champ fichier   :   "document"  (png, jpg, jpeg, pdf - max 20 Mo)
 * 
 *  Pas de body JSON    -   Le fichier est transmis directement en binaire
 *  Le client ne fournit pas document_path  -   il est construit ici.
 * 
 * _______________________________________________________________
 * CONSTRUCTION DE document_path (côté backend) :
 * 
 *  document_path = "${user.id}/${documentName}"
 * 
 *  Même convention que createJustifPharmacei   -   Cohérence de la structure
 *  du bucket "justificatifs-pharmacie".
 * 
 * _______________________________________________________________
 * OPERATION COMPLETE   :
 *  1.  Vérification de l'existence de l'entrée SQL existante
 *  2.  Suppression de l'ancien fichier dans Supabase Storage
 *  3.  Upload du nouveau fichier dans Supabase Storage
 *  4.  Mise à jour de document_path et update_at dans public.justif_pharmacie
 * 
 * _______________________________________________________________
 * RESTRICTION  :
 *  Seul le gérant de la pharmacei peut modifier le justificatif.
 * 
 * SECURITE :
 *  -   JWT requis + userState = true
 *  -   Rôle 'pharmacien' requis
 *  -   Vérification responsability = 'gerant'
 *  -   document_path construit côté backend - non fourni ni falsifiable par le client
 *  -   Rollback Storage si la mise à jour SQL échoue
 * 
 * REPONSE SUCCESS 200  :
 *  { success: true, date: {justif_id, pharmacie_id, document_path, validate, update_at } }
 * 
 * ===============================================================
 */

import { createAuthenticatedClient }            from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }       from "@/supabaseAdminClient.ts";
import { extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
 }                                              from "@/middleware/auth.ts";

// ---------------------------------------------------------------

/** Types MIME autorisés */
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdff"];

/** Taille maximale :   10 Mo */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Bucket Supabase Storage */
const BUCKET_NAME = "justificatis-pharmacie";

// ===============================================================
//  Handler principal
// ===============================================================

/**
 * Gère PUT /justificatifs/p^harmacie.
 * 
 * @param req   Requête HTTP entrante (multipart/form-data, champ "document")
 * @returns     Response JSON standardisée
 */
export async function updateJustifPharmacie(req: Request): Promise<Response> {
    
    //  --- Garde 1:    JWT requis  ------------------------------
    const token = extractToken(req);
    if(!token) return errorResponse("authentification requise.", 401);

    //  --- Garde 2 :   Session active  --------------------------
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    //  --- Garde 3:    Role 'pharmacien' requis    --------------
    if(!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès non autorisé.", 403);
    }    

    //  --- Etape 1:    Vérification que l'appelant est gérant  --
    //  Seul le gérant peut remplacer le justiicati de sa pharmacie
    const authClient = createAuthenticatedClient(token);

    const { data: pharmacienRow, error: pharmError } = await authClient
        .from("pharmacien")
        .select("pharmacie_id, responsability")
        .eq("user_id", user.id)
        .single();
    
    if (pharmError || !pharmacienRow?.pharmacie_id) {
        return errorResponse("Vous n'êtes affilié à aucune pharmacie.", 403);
    }

    if (pharmacienRow.responsability !== "gerant") {
        return errorResponse(
            "Accès non autorisé.",
            403
        );
    }

    const pharmacie_id = pharmacienRow.pharmacie_id;

    //  --- Etape 2:    Lecture du fichier multipart    ---------
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return errorResponse(
            "Format de requête invalide. Envoyez le fichier en multipart/form-data avec le champ 'document'.",
            400
        );
    }

    const fileEntry = formData.get("document");
    if (!fileEntry || !(fileEntry instanceof File)) {
        return errorResponse(
            "Champ 'document' manquant ou invalide. Fournissez un fichier (png, jpg, jpeg, pdf).",
            400
        );
    }

    const file = fileEntry as File;

    //  --- Etape 3:    Validation du fichier   ----------------
    
    //  Vérification du type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return errorResponse(
            `Type de fichier non autorisé : "${file.type}". Types acceptés : image/png, image/jpeg, image/jpg, document/pdf.`,
            415
        );
    }

    //  Vérification de la taille maximale
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return errorResponse(
            `Fichier trop volimuneux (${(file.size / 1024 / 1024).toExponential(1)} Mo.) Taille maximale : 10 Mo.`,
            413
        );
    }

    //  Vérification du nom de fichier
    const documentName = file.name?.trim();
    if (!documentName) {
        return errorResponse("le fichier envoyé ne possède pas de nom.", 400);
    }

    //  --- Etape 4:   Récupération de l'entrée SQL existante --
    //  On récupère l'ancien document_path pour supprimer l'ancien filchier Storage.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const { data: existingJustif, error: findError } = await adminClient
        .from("justif_pharmacie")
        .select("justif_id, document_path")
        .eq("pharmacie_id", pharmacie_id)
        .single();

    if (findError ||!existingJustif) {
        return errorResponse(
            "Aucun justificatif à remplacer. Soumettez d'abord.",
            404
        );
    }

    //  --- Etape 5:    Construction du nouveau chemin  -------
    const new_document_path = `${user.id}/${documentName}`;

    //  --- Etape 6:    Suppression de l'ancien fichier dans Storage
    //  Best-effort -   non-bloquant si l'ancien chemin est vide (pharmacie crée via RPC)
    if (existingJustif.document_path) {
        const { error: deleteStorageError } = await adminClient.storage
            .from(BUCKET_NAME)
            .remove([existingJustif.document_path]);

        if (deleteStorageError) {
            //  Non-bloquant    -   On log et continue
            console.warn(
                `[updateJustifPharmacie] Suppression Storage échoyée pour "${existingJustif.document_path}":`,
                deleteStorageError.message
            );
        }
    }

    //  --- Etape 7:    Upload du nouveau fichier dans Storage  -
    const fileBuffer = await file.arrayBuffer();

    const { error: storageError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(new_document_path, fileBuffer, {
            contentType:    file.type,
            upsert:         true,       //  true    -> écrase si même chemin (documentName identique)
        });

    if (storageError) {
        return errorResponse("Impossible d'enregistrer le nouveau fichier dans le storage.", 500);
    }

    //  --- Etape 8 :   Mise à jour dans public.justif_pharmacie
    //  Validate remis à false  -> l'admin devra valider le nouveau document
    //  validate_at effacé      -> pas encore validé
    //  upload_by mis à jour    -> traçabilité du gérant qui a re-soumis
    //  update_at horodaté manuellement (pas de trigger dans le schéma)
    const { data: justif, error: updateError } = await adminClient
        .from("justif_pharmacie")
        .update({
            document_path:  new_document_path,
            upload_by:      user.id,                    //  gérant qui re-soumet
            validate:       false,                      //  nouveau document    =   nouvelle validation requise
            validate_at:    null,                       //  effacement de la validation précédente
            update_at:      new Date().toISOString(),
        })
        .eq("pharmacie_id", pharmacie_id)
        .select("justif_id, pharmacie_id, document_path, validate, update_at")
        .single();

    if (updateError || !justif) {
        //  Rollback Storage    - On supprime le nouveau fichier iploadé
        await adminClient.storage
            .from(BUCKET_NAME)
            .remove([new_document_path]);

        return errorResponse("Impossible de mettre à jour le justificatif.", 500);
    }

    return successResponse(
        justif,
        "Justiicatiff remplacé. En attente de validation par l'administrateur.",
        200
    );
}