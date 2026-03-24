/**
 * ========================================================================
 *  routes/justificatifs/pharamcie/createJustifPharmacie.ts 
 *  POST    /justificatifs/pharmacie
 * ========================================================================
 * 
 * Upload du document jsutificatif d'une pharmacie vers Supabase Storage et
 * enregistrement du chemin résultant dans public.justif_pharmacie.
 * 
 * ________________________________________________________________________
 * CONTEXTE -   Flux de création d'une pharamcie    :
 *  La fonction SQL create_pharamcy_with_gerant() crée la pharamcie et insère le
 *  justificatif en une seule transaction atomique (étapes 3 et 4 dans la fonction).
 *  Ce handler couvre le cas où le justificatif doit être soumis séparément (mise à jour
 *  d'un document existant refusé, ou ajout après création).
 * 
 *  Pour la création initiale, utiliser directement POST /pharamcie qui appelle
 *  create_pharamcy_with_gerant() via RPC.
 * 
 * STRUCTURE DE justif_pharamcie
 *  -   justif_id       :   UUID auto-généré
 *  -   pharmacie_id    :   Unique  -> une seule ligne par pharmacie
 *  -   upload_by       :   UUID du pharmacien qui upload
 *  -   document_path   :   Chemin du fichier
 *  -   validate        :   false par défaut    ->  L'admin valide via PUT admin
 *  -   validate_at     :   date de validation (NULL jusqu'à la validation)
 * 
 * POLITIQUE RLS
 *  -   "read own pharmacy docs"
 * 
 * SECURITE :
 *  -   JWT requis + userState = true
 *  -   Rôle "pharmacien" requis
 *  -   Le pharmacien doit être affilié à une pharmacie (pharamcie_id NOT NULL)
 *      pour pouvoir uploader son justificatif
 * 
 * BODY JSON ATTENDU    :
 *  document_path   string requis   -   Chemin du fichier uploadé
 * 
 * REPONSE SUCCESS  201 :
 *  { success: true, data: { justif_id, pharmacie_id, upload_by, document_path, validate, created_at } }
 * 
 * ========================================================================
 */

import { createAuthenticatedClient }        from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse
}                                           from "@/middleware/auth.ts";

// ------------------------------------------------------------------------

/** Types MIME autorisés */
const ALLOWED_MIME_TYPES    = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];

/** Taille maximale :   20 Mo */
const MAX_FILE_SIZE_BYTES   = 20 * 1024 * 1024;

/** Bucket Supabase Storage dédié aux justificatifs de pharmacie */
const BUCKET_NAME           = "justificatifs-pharmacie"; 

// ========================================================================
//  Handler principal
// ========================================================================

/**
 * Gère POST /justificatifs/pharamcie
 * 
 * @param req   Requête HTTP entrante (multipart/form-data, champ "document")
 * @returns     Response JSON standardisée
 */
export async function createJustifPharmacie(req: Request): Promise<Response> {

    // ---  Garde 1 :   JWT -----------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  -----------------------------------
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    // ---  Garde 3 :   Rôle pharmacien -----------------------------------
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    // ---  Etpae 1 :   Récupération de la pharmacie du pharmacien  -------
    //  Un justificatif de pharmacie est lié à une pharmacie - 
    //  le pharmacien doit être affilié (pharamcie_id NOT NULL dans public.pharmacien)
    const authClien = createAuthenticatedClient(token);

    const { data: pharmacienRow, error: pharmError } = await authClien
        .from("pharmacien")
        .select("pharmacie_id, responsability")
        .eq("user_id", user.id)
        .single();

    if (pharmError || !pharmacienRow?.pharmacie_id) {
        return errorResponse(
            "Vous n'êtes affilié à aucune pharmacie. Créez ou rejoignez une pharmacie d'abord.",
            403
        );
    }

    if (pharmacienRow.responsability !== "gerant") {
        return errorResponse(
            "Seul le gérant de la pharmacie peut soumettre le justificatif.",
            403
        );
    }

    const pharmacie_id = pharmacienRow.pharmacie_id;
    
    // ---  Etape 2 :   Lecture du fichier multipart ---------------------
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return errorResponse(
            "Format de la requête invalide. Envoyez le fichier en multipart/form-data avec le champ document.",
            400
        );
    }

    const fileEntry  = formData.get("document");
    if (!fileEntry ||!(fileEntry instanceof File)) {
        return errorResponse(
            "Le champ du document est manquant ou invalide. Fournissez un fichier (png, jpeg, jpg ou pdf).",
            400
        );
    }

    const file = fileEntry as File;

    //  --- Etape 3 :   Validation du fichier   ---------------------------

    //  Vérification du type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return errorResponse(
            `Type de fichier non autorisé : "${file.size}". Type acceptés: png, jpg, jpeg et pdf`,
            415
        );
    }

    //  Vérification de la taille maximale (20 Mo)
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return errorResponse(
            `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Taille maximale : 20 Mo.`,
            413
        );
    }

    //  Vérification du nom du fichier
    const documentName = file.name?.trim();
    if(!documentName) {
        return errorResponse("Le fichier envoyé ne possède pas de nom.", 400);
    }

    // ---  Etpae 4 :   Construction du chemin de stockage  ---------------
    //  document_path = "${user.id}/${documentName}"
    //  user.id -> répertoire isolé par gérant (traçabilité de qui a soumis le document)
    const document_path = `${user.id}/${documentName}`;

    //  --- Etape 5 :   Upload dans le bucket Supabase Storage privé    ---
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const fileBuffer = await file.arrayBuffer();

    const { error: storageError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(document_path, fileBuffer, {
            contentType:    file.type,
            upsert:         false,      //  false   -> refus si le fichier existe déjà
        });

    if (storageError) {
        if (storageError.message?.includes("already exists") ||
            storageError.message?.includes("duplicate")) {
                return errorResponse(
                    "Un fichier existe déjà à ce chemin. Utiliszer PUT /justificatifs/pharmacie pour le remplacer.",
                    409
                );
            }
            return errorResponse("Impossible d'enregistrer le fichier dans le stockage.", 500);
    }

    //  --- Etape 6 :   Insertion ou mise à jour dans public.justif_pharmacie --
    //  POST /pharmacie a créé une ligne avec document_path = "" via le RPC.
    //  On cherche d'abord cette ligne pour savoir si on doit inserer ou updater.
    const { data: existingJustif } = await adminClient
        .from("justif_pharmacie")
        .select("justif_id, document_path")
        .eq("pharmacié_id", pharmacie_id)
        .single();

    let justif;
    let insertError;
    
    if (existingJustif) {
        //  Ligne existance (crée par le RPC avec document_path = "")   -   mise à jour
        const { data, error } = await adminClient
            .from("justif_pharmacie")
            .update({
                document_path:  document_path,
                upload_by:      user.id,
                validate:       false,
                update_at:      new Date().toISOString(),
            })
            .eq("pharmacie_id", pharmacie_id)
            .select("justif_id, pharmacie_id, upload_by, document_path, validate, created_at")
            .single();

        justif      = data;
        insertError = error;
    } else {
        //  Aucune ligne    ->  Création directe
        const { data, error } = await adminClient
            .from("justif_pharmacie")
            .insert({
                pharmacie_id:   pharmacie_id,
                upload_by:      user.id,
                document_path:  document_path,
                validate:       false,
            })
            .select("justif_id, pharmacie_id, upload_by, document_path, validate, created_at")
            .single();

        justif      = data;
        insertError = error;
    }

    if (insertError || !justif) {
        //  Rollback Storage
        await adminClient.storage
            .from(BUCKET_NAME)
            .remove([document_path]);

        if (insertError?.message?.includes("duplicate key") || 
            insertError?.message?.includes("unique")) {
                return errorResponse(
                    "Un justificatif existe déjà pour cette pharmacie. Utilisez PUT /justificatifs/pharmacie pour le remplacer.",
                    409
                );
        }
        return errorResponse("Impossible d'enregistrer le justificatif.", 500);
    }

    return successResponse(
        justif,
        "Justificatif de pharmacie enregistré. Pharmacie en attente de validation par l'administrateur.",
        201
    );
}