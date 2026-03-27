/**
 * ======================================================================
 *  routes/justificatifs/Pharmacien/createJustifPharmacien.ts
 *  POST /justificatifs/pharmacien
 * ======================================================================
 * 
 * Upload du document justificatif d'un pharmacien vers Supabase Storage et
 * enregistrement du chemin dans public.justif_pharmacien.
 * 
 * ----------------------------------------------------------------------
 * CONTEXTE -   Flux d'inscription d'un pharmacien  :
 *  1.  POST /auth/register                     ->  Crée public.users (role='user')
 *  2.  POST /auth/login                        ->  Ouvre la session
 *  3.  POST /users/pharmacien (Phase 1)        ->  acceptation des clauses
 *  4.  POST /justificatifs/pharamcien (ICI)    ->  upload du justificatif
 *  5.  POST /users/pharmacien (Phase 2)        ->  Promotion role='pharmacien'
 * 
 * -----------------------------------------------------------------------
 * FORMAT DE REQUÊTE    :
 *  Content-Type    :   multipart/form-data
 *  Champ fichier   :   "document" (png, jpg, jpeg, pdf -   max 20 Mo)
 * 
 *  Pas de body JSON    -   le fichier est transmis directement en binaire.
 *  Le client ne fournit pas document_path  -   Il est construit ici.
 * 
 * ------------------------------------------------------------------------
 * CONSTRUCTION DE document_path (côté backend  -   non fourni par le client)   :
 * 
 *  document_path   =   "/Justificatifs/PharmaciensUsers/${user.id}/${documentName}"
 * 
 *  user.id         :   UUID du pharmacien connecté -> Répertoire dédié (traçabilité)
 *  documentName    :   Nom original du fichier envoyé par le client
 * 
 *  Exemple :   "a3f2...uuid/diplome_plarmacien.pdf"
 * 
 *  Ce chemin est la clé dans bucket Storage "justificatifs-pharmacien"
 *  Et la valeur stockée dans public.justif_pharmacien.document_path.
 *  Il permet de récupérer, afficher ou retravailler le fichier ultérieurement.
 * 
 * ------------------------------------------------------------------------
 * BUCKET SUPABASE STORAGE  :
 *  Nom     :   "justificatifs-pharmacien"
 *  Accès   :   privé   -   Jamais accessible sans clé de service ou signal URL
 * 
 * -------------------------------------------------------------------------
 * POLITIQUE RLS    :
 *  -   "Pharmacien can insert own doc"
 *  -   "Pharamcien manage own justificatif"
 * 
 * SECURITE :   
 *  -   JWT requis + userState = true
 *  -   Rôle 'user' ou 'pharmacien' accepté (phase 4 et suivantes du flux)
 *  -   user_id forcé à auth.uid()  -   non modifiable par le client
 *  -   docuent_path construit côté backend-API -   non fourni ni falsifiable par le client
 *  -   TYPE MIME acceptés  :   image/png, image/jpeg, application/pdf
 *  -   Rollback Storage si l'insertion SQL échoue (cohérence fichier <-> base)
 * 
 * REPONSE SUCCES 201   :
 *  { success: true, data: { justif_id, user_id, document_path, created_at } } 
 * =========================================================================
 */

import { getAdminClient, getAdminSecret }               from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse
}                                                       from "@/middleware/auth.ts";

// _________________________________________________________________________

/** Types MIME autorisés pour les justificatifs */
const ALLOWED_MIME_TYPES    = ["image/png", "image/jpeg", "image/jpg", "application.pdf"];

/** Taille maximale autorisée: 20 Mo */
const MAX_FILE_SIZE_BYTES   = 20 * 1024 * 1024;

/** Nom du bucket Supabase Storage dédié aux justificatifs pharmaciens */
const BUCKET_NAME           = "justificatifs-pharamcien";

// =========================================================================
//  Handler principal
// =========================================================================

/**
 * Gère POST /justificatifs/pharmacien.
 * 
 * Reçoit le fichier en multipart/form-data, l'uploade dans le bucket privé
 * Supabase Storage, puis enregistre le chemin construit dans la table SQL.
 * 
 * @param req   Requête HTTP entrante (multipart/form-data, champ "document")
 * @returns     Response JSON standardisée
 */

export async function createJustifPharmacien(req: Request): Promise<Response> {
    
    //  --- Garde 1 :   JWT requis  ----------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Autehntification requise.", 401);

    //  --- Garde 2 :   Session active (userState = true)   ----------------
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    //  --- Garde 3 :   Rôle 'user' ou 'pharmacien' requis  ----------------
    //  'user'      : en phase 4 du flux (avant promotion)
    //  'pharmacien': peut re-soumettre un justificatif (renouvellement)
    if(!requireRole(user, ["user", "pharmacien"])) {
        return errorResponse("Accès non autorisé pour ce rôle.", 403);
    }

    //  --- Etape 1 :   Lecture du fichier multipart    --------------------
    //  Le client envoie un formulaire multipart avec le champ "document".
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return errorResponse(
            "Format de requête invalide. Envoyez le fichier en multipart/form-data avec le champ 'document'.",
            400
        );
    }

    //  Extraction du fichier depuis le champ "document"
    const fileEntry = formData.get("document");
    if (!fileEntry || !(fileEntry instanceof File)) {
        return errorResponse(
            "Champ 'document' manquant ou invalide. Fournissez un fichier (png, jpeg, jpg ou pdf).",
            400
        );
    }

    const file = fileEntry as File;

    //  --- Etape 2 :   Vaidation du fichier    ----------------------------

    //  Vérification du type MIME - miroir des types acceptés par l'admin
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return errorResponse(
            `Type de fichier non autorisé : "${file.type}". Types acceptés : image/png, image/jpeg, image/jpg, fichier/pdf.`,
            415
        );
    }

    //  Vérification de la taille maximale (20 Mo)
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return errorResponse(
            `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Taille maximale: 20 Mo.`,
            413
        );
    }

    //  Vérification que le fichier a un nom
    const documentName = file.name?.trim();
    if (!documentName) {
        return errorResponse("Le fichier envoyé n'a pas de nom.", 400);
    }

    //  --- Etape 3 :   Construction du chemin de stocjage (côté backend)  -
    //
    //  document_path = "${user.id}/{documentName}"
    //
    //  Deux composants :
    //      1. user.id      -> répertoire dédié à l'utilisateur (isolement + traçabilité)
    //      2. documentName -> nom original du fichier (repère humain)
    //
    //  Ce chemin est la clé dans le bucket Storage et la valeur en base SQL.
    //  Il permet de retrouver, afficher ou retravailler le fichier ultérieurement.
    const document_path = `${user.id}/${documentName}`;

    //  --- Etape 4 :   Upload dans le bucket Supabase Storage privé    ----
    //  Client admin requis - l'écriture dans un bucket privé requiert la clé de service.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    //  Lecture du conten u binaire du fichier envoyé
    const fileBuffer = await file.arrayBuffer();

    const { error: storageError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(document_path, fileBuffer, {
            contentType:    file.type,  //  type MIME conservé pour l'affichage ultérieur
            upsert:         false,      //  false -> refus si le fichier existe déjà
        }); 

    if (storageError) {
        //  Fichier déjà présent à ce chemin Storage
        if (storageError.message?.includes("already exists") ||
            storageError.message?.includes("duplicate")) {
                return errorResponse(
                    "Un fichier similaire existe déjà à ce chemin. Utilisez PUT /justificatifs/pharmacien pour le remplacer.",
                    409
                );
            }
            return errorResponse("Impossible d'enregistrer le fichier dans le stockage.", 500);
    }

    //  --- Etape 5 :   Insertion dans public.justif_pharmacien ------------
    //  Enregistrement du chemin construit par le backend dans la table SQL.
    //  Si l'insertion SQL échoue, le fichier Storage est supprimé (rollback).
    const { data: justif, error: insertError } = await adminClient
        .from("justificatif_pharmacien")
        .insert({
            user_id:        user.id,        //  Forcé - non fourni par le client
            document_path:  document_path,  //  Construit à l'étape 3
        })
        .select("justif_id, user_id, document_path, created_at")
        .single();

    if (insertError || !justif) {
        //  Rollback Storage - On supprime le fichier déjà uploadé pour gardé la cohérence
        await adminClient.storage
            .from(BUCKET_NAME)
            .remove([document_path]);

        if (insertError?.message?.includes("duplicate key")) {
            return errorResponse(
                "Un justificatif existe déjà pour ce compte. Utilisez PUT /justificatifs/pharmacien pour le remplacer.",
                409
            );
        }
        return errorResponse("Impossible d'enregistrer le justificatif.", 500);
    }

    return successResponse(
        justif,
        "Justificatif enregistré avec succès. Finalisez votre profil via POST /users/pharmacien.",
        201
    );
}