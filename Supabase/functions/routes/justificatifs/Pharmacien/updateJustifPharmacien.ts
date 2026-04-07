/**
 * =============================================================================
 * routes/justificatifs/Pharmacien/updateJustifPharmacien.ts
 * PUT /justificatifs/pharmacien
 * =============================================================================
 *
 * Remplacement du document justificatif d'un pharmacien.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE :
 *  Quand un pharmacien souhaite remplacer son justificatif existant
 *  (document périmé, mauvaise qualité, changement de diplôme, etc.).
 *  L'ancien fichier est supprimé de Supabase Storage avant l'upload du nouveau.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMAT DE REQUÊTE :
 *  Content-Type : multipart/form-data
 *  Champ fichier : "document"  (png, jpeg, jpg, pdf — max 20 Mo)
 *
 *  Pas de body JSON — le fichier est transmis directement en binaire.
 *  Le client NE fournit PAS document_path — il est construit ici.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONSTRUCTION DE document_path (côté backend) :
 *
 *  document_path = "${user.id}/${documentName}"
 *
 *  Même convention que createJustifPharmacien — cohérence de la structure
 *  du bucket "justificatifs-pharmacien".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OPÉRATION COMPLÈTE :
 *  1. Vérification de l'existence de l'entrée SQL existante
 *  2. Suppression de l'ancien fichier dans Supabase Storage
 *  3. Upload du nouveau fichier dans Supabase Storage
 *  4. Mise à jour de document_path et update_at dans public.justif_pharmacien
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POLITIQUE RLS :
 *  - "Pharmacien manage own justificatif" FOR ALL USING (user_id = auth.uid())
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle 'pharmacien' requis
 *  - document_path construit côté backend — non fourni ni falsifiable par le client
 *  - Rollback Storage si la mise à jour SQL échoue
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: { justif_id, user_id, document_path, update_at } }
 *
 * =============================================================================
 */

import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
}                                           from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

/** Types MIME autorisés */
const ALLOWED_MIME_TYPES    = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];

/** Taille maximale : 20 Mo */
const MAX_FILE_SIZE_BYTES   = 20 * 1024 * 1024;

/** Bucket Supabase Storage */
const BUCKET_NAME           = "justificatifs-pharmacien";

// =============================================================================
//  Handler principal
// =============================================================================

/**
 * Gère PUT /justificatifs/pharmacien.
 *
 * @param req   Requête HTTP entrante (multipart/form-data, champ "document")
 * @returns     Response JSON standardisée
 */
export async function updateJustifPharmacien(req: Request): Promise<Response> {

    //  --- Garde 1 :   JWT requis  -------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    //  --- Garde 2 :   Session active  ---------------------------------------------
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    //  --- Garde 3 :   Rôle 'pharmacien' requis  ------------------------------------
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    //  --- Etape 1 :   Lecture du fichier multipart  --------------------------------
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
            "Champ 'document' manquant ou invalide. Fournissez un fichier (png, jpeg, pdf).",
            400
        );
    }

    const file = fileEntry as File;

    //  --- Etape 2 :   Validation du fichier  ---------------------------------------

    //  Vérification du type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return errorResponse(
            `Type de fichier non autorisé : "${file.type}". Types acceptés : image/png, image/jpeg, application/pdf.`,
            415
        );
    }

    //  Vérification de la taille maximale (10 Mo)
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return errorResponse(
            `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Taille maximale : 10 Mo.`,
            413
        );
    }

    //  Vérification du nom de fichier
    const documentName = file.name?.trim();
    if (!documentName) {
        return errorResponse("Le fichier envoyé ne possède pas de nom.", 400);
    }

    //  --- Etape 3 :   Chargement de l'entrée SQL existante  -----------------------
    //  Récupération de l'ancien document_path pour pouvoir supprimer l'ancien fichier
    //  dans Storage avant d'uploader le nouveau.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const { data: existing, error: findError } = await adminClient
        .from("justif_pharmacien")
        .select("justif_id, document_path")
        .eq("user_id", user.id)
        .single();

    if (findError || !existing) {
        return errorResponse(
            "Aucun justificatif à remplacer. Créez-en un d'abord via POST /justificatifs/pharmacien.",
            404
        );
    }

    //  --- Etape 4 :   Construction du nouveau chemin  -----------------------------
    //  Même convention que createJustifPharmacien
    const new_document_path = `${user.id}/${documentName}`;

    //  --- Etape 5 :   Suppression de l'ancien fichier dans Storage  ---------------
    //  Best-effort — si la suppression échoue, on continue l'upload du nouveau.
    //  L'ancien fichier devient orphelin dans Storage mais la base reste cohérente.
    if (existing.document_path) {
        const { error: deleteStorageError } = await adminClient.storage
            .from(BUCKET_NAME)
            .remove([existing.document_path]);

        if (deleteStorageError) {
            //  Non-bloquant — on log et on continue
            console.warn(
                `[updateJustifPharmacien] Suppression Storage échouée pour "${existing.document_path}":`,
                deleteStorageError.message
            );
        }
    }

    //  --- Etape 6 :   Upload du nouveau fichier dans Storage  ---------------------
    const fileBuffer = await file.arrayBuffer();

    const { error: storageError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(new_document_path, fileBuffer, {
            contentType:    file.type,
            upsert:         true,   //  true → écrase si même chemin (cas documentName identique)
        });

    if (storageError) {
        return errorResponse("Impossible d'enregistrer le nouveau fichier dans le stockage.", 500);
    }

    //  --- Etape 7 :   Mise à jour dans public.justif_pharmacien  -----------------
    //  update_at horodaté manuellement (pas de trigger automatique dans le schéma)
    const { data: justif, error: updateError } = await adminClient
        .from("justif_pharmacien")
        .update({
            document_path:  new_document_path,
            update_at:      new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("justif_id, user_id, document_path, update_at")
        .single();

    if (updateError || !justif) {
        //  Rollback Storage — on supprime le nouveau fichier uploadé
        await adminClient.storage
            .from(BUCKET_NAME)
            .remove([new_document_path]);

        return errorResponse("Impossible de mettre à jour le justificatif.", 500);
    }

    return successResponse(justif, "Justificatif remplacé avec succès.", 200);
}