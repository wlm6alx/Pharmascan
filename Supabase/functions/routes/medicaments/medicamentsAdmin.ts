/**
 * =====================================================================================
 *  routes/medicaments/medicamentsAdmin.ts
 *      POST  /admin/medicaments/qr  →  createQRCode()
 *      POST  /admin/medicaments     →  createMedicament()
 *      PUT   /admin/medicaments     →  updateMedicament()
 * =====================================================================================
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * HANDLER 1 — createQRCode()  :  POST /admin/medicaments/qr
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  Crée un QR Code physique (boîte / unité) dans QR_Code et enregistre
 *  sa traçabilité dans le bucket Supabase Storage "qr-tracabilite".
 *
 *  TRAÇABILITÉ STORAGE :
 *      Chaque création de QR Code est tracée dans le bucket privé "qr-tracabilite".
 *
 *      Structure du répertoire (dossiers) :
 *          <categorie_medicament>/<nom_medicament>/
 *
 *      Nom du fichier de traçabilité (embarque qui, quand, quel QR) :
 *          <id_createur> -> <timestamp ISO> -> <QRCode_id>
 *
 *      "->" est le séparateur de champ dans le NOM DU FICHIER.
 *      Il n'apparaît pas dans les UUIDs ni les timestamps ISO 8601 —
 *      c'est un caractère hors de l'alphabet alphanumérique standard,
 *      utilisé comme marqueur fiable pour filtrer et reconnaître les composants.
 *
 *      Contenu du fichier : le chemin (path) fourni par le créateur.
 *      Ce chemin peut être un path dans un autre bucket storage (référence croisée).
 *      Il est copié tel quel dans le fichier de traçabilité.
 *
 *      Exemple de chemin complet dans le bucket "qr-tracabilite" :
 *          Antibiotiques/Amoxicilline 500mg/a3f2...uuid -> 2026-03-05T14:22:10.000Z -> b4e1...uuid
 *
 *      Exemple de contenu du fichier :
 *          path: storage/medicaments/qr/b4e1...uuid.png
 *
 *  BODY JSON :
 *      medicament_id   uuid    requis — médicament auquel ce QR est lié
 *      path            string  requis — chemin du fichier QR dans le storage
 *
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * HANDLER 2 — createMedicament()  :  POST /admin/medicaments
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  Crée un médicament générique dans la table medicament.
 *  Accessible : admin ET pharmacien affilié à une pharmacie validée.
 *  visibility = true par défaut (visible dès création).
 *
 *  BODY JSON :
 *      name            string  requis
 *      categorie       string  optionnel
 *      description     string  optionnel
 *      image_path      string  requis   — chemin de l'image dans le storage
 *      date_fabricate  string  requis   — format YYYY-MM-DD
 *      date_expirate   string  requis   — format YYYY-MM-DD
 *      qr_code_id      uuid    requis   — UUID d'un QR Code existant à lier
 *
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * HANDLER 3 — updateMedicament()  :  PUT /admin/medicaments
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  Modifie les champs d'un médicament existant (patch partiel).
 *  Accessible : admin ET pharmacien affilié à une pharmacie validée.
 *
 *  BODY JSON (tous optionnels sauf medicament_id) :
 *      medicament_id   uuid    requis
 *      name            string  optionnel
 *      categorie       string  optionnel
 *      description     string  optionnel
 *      image_path      string  optionnel
 *      date_fabricate  string  optionnel — YYYY-MM-DD
 *      date_expirate   string  optionnel — YYYY-MM-DD
 *      visibility      boolean optionnel
 *
 *
 * SÉCURITÉ (commune) :
 *  - JWT requis + userState = true
 *  - Rôle admin ou pharmacien requis
 *  - Pharmacien : doit être affilié à une pharmacie validate=true AND exist=true
 *  - Pas de RLS FOR INSERT/UPDATE sur medicament → vérification TypeScript + client admin
 *
 * =====================================================================================
 */

import { getAdminClient, getAdminSecret }    from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
    AuthenticatedUser,
}                                            from "@/middleware/auth.ts";

// =====================================================================================
//  Utilitaire interne — vérification accès médicament
// =====================================================================================

/**
 * Vérifie que l'utilisateur est admin OU pharmacien affilié à une pharmacie validée.
 *
 * Un pharmacien non affilié (pharmacie_id = NULL) ou dont la pharmacie n'est pas
 * validate=true AND exist=true ne peut pas créer ni modifier de médicaments.
 *
 * @param user          Profil authentifié
 * @param adminClient   Client admin Supabase
 * @returns             true si autorisé
 */
async function isMedicamentAuthorized(
    user:        AuthenticatedUser,
    // deno-lint-ignore no-explicit-any
    adminClient: any
): Promise<boolean> {

    //  Admin : toujours autorisé
    if (user.role === "admin") return true;

    //  Pharmacien : vérifier l'affiliation à une pharmacie validée et existante
    if (user.role === "pharmacien") {
        const { data: pharm } = await adminClient
            .from("pharmacien")
            .select("pharmacie_id")
            .eq("user_id", user.id)
            .single();

        if (!pharm?.pharmacie_id) return false;

        const { data: pharmacie } = await adminClient
            .from("pharmacie")
            .select("pharmacie_id")
            .eq("pharmacie_id", pharm.pharmacie_id)
            .eq("validate", true)
            .eq("exist", true)
            .single();

        return !!pharmacie;
    }

    return false;
}

// =====================================================================================
//  Handler 1 — Créer un QR Code physique + traçabilité storage
// =====================================================================================

/**
 * Gère POST /admin/medicaments/qr.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createQRCode(req: Request): Promise<Response> {

    //  --- Garde 1 :   JWT requis  -------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    //  --- Garde 2 :   Session active  ---------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    //  --- Garde 3 :   Rôle admin ou pharmacien  -----------------------------------
    if (!requireRole(user, ["admin", "pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens et à l'administrateur.", 403);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    //  --- Garde 4 :   Pharmacien doit être affilié à une pharmacie validée  ------
    const authorized = await isMedicamentAuthorized(user, adminClient);
    if (!authorized) {
        return errorResponse(
            "Vous devez être affilié à une pharmacie validée pour créer un QR Code.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  -------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const medicamentId = typeof body.medicament_id === "string" ? body.medicament_id.trim() : null;
    const path         = typeof body.path          === "string" ? body.path.trim()          : null;

    if (!medicamentId) return errorResponse("Le champ 'medicament_id' est obligatoire.", 400);
    if (!path)         return errorResponse("Le champ 'path' (chemin du QR Code) est obligatoire.", 400);

    //  --- Etape 2 :   Vérification que le médicament existe  ----------------------
    const { data: med, error: medError } = await adminClient
        .from("medicament")
        .select("medicament_id, name, categorie")
        .eq("medicament_id", medicamentId)
        .single();

    if (medError || !med) {
        return errorResponse("Médicament introuvable.", 404);
    }

    //  --- Etape 3 :   Insertion dans QR_Code  -------------------------------------
    //  Pas de RLS FOR INSERT sur QR_Code → client admin requis.
    const { data: qrCode, error: qrInsertError } = await adminClient
        .from("QR_Code")
        .insert({ path })
        .select("QRCode_id, path, create_at")
        .single();

    if (qrInsertError || !qrCode) {
        return errorResponse("Impossible de créer le QR Code.", 500);
    }

    //  --- Etape 4 :   Traçabilité dans le bucket Supabase Storage  ---------------
    //
    //  Structure dans le bucket "qr-tracabilite" :
    //
    //  DOSSIERS (structure de répertoire) :
    //      <categorie>/<nom_medicament>/
    //      Représentent l'identité du médicament (qr_code.medicament_id.categorie
    //      et qr_code.medicament_id.name selon la nomenclature du projet).
    //
    //  NOM DU FICHIER :
    //      <id_createur> -> <timestamp ISO> -> <QRCode_id>
    //      Représente qui a créé (pharmacien ou admin), quand, et quel QR Code.
    //      "->" est le séparateur — hors de l'alphabet UUID/ISO/alphanumérique.
    //
    //  CONTENU DU FICHIER :
    //      Le chemin (path) fourni par le créateur, copié tel quel.
    //      Si path est un chemin dans un autre bucket, c'est une référence croisée.
    //
    //  Exemple de chemin complet :
    //      Antibiotiques/Amoxicilline 500mg/a3f2...uuid -> 2026-03-05T14:22:10Z -> b4e1...uuid
    //
    await recordQRCodeTracabilite(adminClient, user.id, med, qrCode.QRCode_id, path);

    return successResponse(
        { ...qrCode, medicament_id: medicamentId },
        "QR Code créé avec succès.",
        201
    );
}

// =====================================================================================
//  Utilitaire interne — traçabilité storage pour création de QR Code
// =====================================================================================

/**
 * Enregistre la traçabilité de la création d'un QR Code dans Supabase Storage.
 *
 * Structure dans le bucket "qr-tracabilite" :
 *
 *  DOSSIERS :  <categorie_medicament>/<nom_medicament>/
 *  FICHIER  :  <id_createur> -> <timestamp_ISO> -> <QRCode_id>
 *  CONTENU  :  Le path du QR Code fourni (copié tel quel comme référence croisée)
 *
 * Le nom du fichier embarque trois informations séparées par "->" :
 *  1. id_createur   : UUID du pharmacien ou admin ayant généré le QR
 *  2. timestamp_ISO : moment de création (ISO 8601)
 *  3. QRCode_id     : UUID du QR Code nouvellement créé
 *
 * "->" est hors de l'alphabet alphanumérique standard (UUID, ISO, noms de médicaments),
 * ce qui en fait un délimiteur fiable pour filtrer et reconnaître les composants.
 *
 * @param adminClient   Client admin Supabase
 * @param createurId    UUID du créateur
 * @param med           Données du médicament { name, categorie }
 * @param qrCodeId      UUID du QR Code créé
 * @param qrPath        Chemin fourni par le créateur (copié dans le contenu du fichier)
 */
async function recordQRCodeTracabilite(
    // deno-lint-ignore no-explicit-any
    adminClient:    any,
    createurId:     string,
    med:            { name: string; categorie: string | null },
    qrCodeId:       string,
    qrPath:         string
): Promise<void> {
    try {
        const timestamp = new Date().toISOString();

        //  Nettoyage des segments de chemin — retirer les caractères interdits
        //  dans les noms de dossiers Supabase Storage (/ \ : * ? " < > |)
        const safeCategorie = (med.categorie ?? "SansCategorie")
            .replace(/[\/\\:*?"<>|]/g, "_");
        const safeName      = med.name
            .replace(/[\/\\:*?"<>|]/g, "_");

        //  Nom du fichier : trois composants séparés par " -> "
        //  <id_createur> -> <timestamp_ISO> -> <QRCode_id>
        const fileName    = `${createurId} -> ${timestamp} -> ${qrCodeId}`;

        //  Chemin complet dans le bucket
        const storagePath = `${safeCategorie}/${safeName}/${fileName}`;

        //  Contenu du fichier : le path fourni par le créateur, copié tel quel.
        //  Sert de référence croisée si path pointe vers un autre bucket storage.
        const fileContent = `path: ${qrPath}`;

        //  Upload dans le bucket privé "qr-tracabilite"
        //  upsert: false → chaque trace est unique (pas de remplacement)
        const { error } = await adminClient.storage
            .from("qr-tracabilite")
            .upload(storagePath, new TextEncoder().encode(fileContent), {
                contentType:    "text/plain",
                upsert:         false,
            });

        if (error) {
            console.error("[recordQRCodeTracabilite] Upload échoué:", error);
        }
    } catch (err) {
        //  Traçabilité non-bloquante — le QR Code est déjà créé en base
        console.error("[recordQRCodeTracabilite] Exception:", err);
    }
}

// =====================================================================================
//  Handler 2 — Créer un médicament générique
// =====================================================================================

/**
 * Gère POST /admin/medicaments.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createMedicament(req: Request): Promise<Response> {

    //  --- Garde 1 :   JWT requis  -------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    //  --- Garde 2 :   Session active  ---------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    //  --- Garde 3 :   Rôle admin ou pharmacien  -----------------------------------
    if (!requireRole(user, ["admin", "pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens et à l'administrateur.", 403);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    //  --- Garde 4 :   Pharmacien doit être affilié à une pharmacie validée  ------
    const authorized = await isMedicamentAuthorized(user, adminClient);
    if (!authorized) {
        return errorResponse(
            "Vous devez être affilié à une pharmacie validée pour créer un médicament.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  -------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const name           = typeof body.name           === "string" ? body.name.trim()           : null;
    const categorie      = typeof body.categorie      === "string" ? body.categorie.trim()      : null;
    const description    = typeof body.description    === "string" ? body.description.trim()    : null;
    const image_path     = typeof body.image_path     === "string" ? body.image_path.trim()     : null;
    const date_fabricate = typeof body.date_fabricate === "string" ? body.date_fabricate.trim() : null;
    const date_expirate  = typeof body.date_expirate  === "string" ? body.date_expirate.trim()  : null;
    const qr_code_id     = typeof body.qr_code_id     === "string" ? body.qr_code_id.trim()     : null;

    if (!name)           return errorResponse("Le champ 'name' est obligatoire.", 400);
    if (!image_path)     return errorResponse("Le champ 'image_path' est obligatoire.", 400);
    if (!date_fabricate) return errorResponse("Le champ 'date_fabricate' (YYYY-MM-DD) est obligatoire.", 400);
    if (!date_expirate)  return errorResponse("Le champ 'date_expirate' (YYYY-MM-DD) est obligatoire.", 400);
    if (!qr_code_id)     return errorResponse("Le champ 'qr_code_id' (UUID du QR Code) est obligatoire.", 400);

    //  Validation format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date_fabricate)) {
        return errorResponse("Format 'date_fabricate' invalide. Attendu : YYYY-MM-DD.", 400);
    }
    if (!dateRegex.test(date_expirate)) {
        return errorResponse("Format 'date_expirate' invalide. Attendu : YYYY-MM-DD.", 400);
    }

    //  Validation logique : expiration doit être postérieure à fabrication
    if (new Date(date_expirate) <= new Date(date_fabricate)) {
        return errorResponse("La date d'expiration doit être postérieure à la date de fabrication.", 400);
    }

    //  --- Etape 2 :   Vérification que le QR Code existe  -------------------------
    const { data: qrRow, error: qrError } = await adminClient
        .from("QR_Code")
        .select("QRCode_id")
        .eq("QRCode_id", qr_code_id)
        .single();

    if (qrError || !qrRow) {
        return errorResponse(
            "QR Code introuvable. Créez d'abord le QR Code via POST /admin/medicaments/qr.",
            404
        );
    }

    //  --- Etape 3 :   Insertion dans medicament  ----------------------------------
    //  Pas de RLS FOR INSERT sur medicament → client admin requis.
    //  visibility = true par défaut — médicament visible dès création.
    const { data: medicament, error: insertError } = await adminClient
        .from("medicament")
        .insert({
            name,
            categorie:      categorie   ?? null,
            description:    description ?? null,
            image_path,
            codeQR:         qr_code_id,
            date_fabricate,
            date_expirate,
            visibility:     true,
        })
        .select("medicament_id, name, categorie, description, image_path, date_fabricate, date_expirate, visibility, created_at")
        .single();

    if (insertError || !medicament) {
        return errorResponse("Impossible de créer le médicament.", 500);
    }

    return successResponse(medicament, "Médicament créé avec succès.", 201);
}

// =====================================================================================
//  Handler 3 — Modifier un médicament (patch partiel)
// =====================================================================================

/**
 * Gère PUT /admin/medicaments.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function updateMedicament(req: Request): Promise<Response> {

    //  --- Garde 1 :   JWT requis  -------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    //  --- Garde 2 :   Session active  ---------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    //  --- Garde 3 :   Rôle admin ou pharmacien  -----------------------------------
    if (!requireRole(user, ["admin", "pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens et à l'administrateur.", 403);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    //  --- Garde 4 :   Pharmacien doit être affilié à une pharmacie validée  ------
    const authorized = await isMedicamentAuthorized(user, adminClient);
    if (!authorized) {
        return errorResponse(
            "Vous devez être affilié à une pharmacie validée pour modifier un médicament.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  -------------------------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const medicamentId = typeof body.medicament_id === "string" ? body.medicament_id.trim() : null;
    if (!medicamentId) return errorResponse("Le champ 'medicament_id' est obligatoire.", 400);

    //  --- Etape 2 :   Construction des champs à mettre à jour (patch partiel)  ---
    const updates: Record<string, unknown> = {};

    if (typeof body.name        === "string")  updates.name        = body.name.trim();
    if (typeof body.categorie   === "string")  updates.categorie   = body.categorie.trim();
    if (typeof body.description === "string")  updates.description = body.description.trim();
    if (typeof body.image_path  === "string")  updates.image_path  = body.image_path.trim();
    if (typeof body.visibility  === "boolean") updates.visibility  = body.visibility;

    if (typeof body.date_fabricate === "string") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date_fabricate)) {
            return errorResponse("Format 'date_fabricate' invalide. Attendu : YYYY-MM-DD.", 400);
        }
        updates.date_fabricate = body.date_fabricate;
    }
    if (typeof body.date_expirate === "string") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date_expirate)) {
            return errorResponse("Format 'date_expirate' invalide. Attendu : YYYY-MM-DD.", 400);
        }
        updates.date_expirate = body.date_expirate;
    }

    if (Object.keys(updates).length === 0) {
        return errorResponse(
            "Aucun champ à mettre à jour. Champs modifiables : name, categorie, description, image_path, date_fabricate, date_expirate, visibility.",
            400
        );
    }

    //  --- Etape 3 :   Mise à jour dans medicament  --------------------------------
    const { data: updated, error: updateError } = await adminClient
        .from("medicament")
        .update(updates)
        .eq("medicament_id", medicamentId)
        .select("medicament_id, name, categorie, description, image_path, date_fabricate, date_expirate, visibility, created_at")
        .single();

    if (updateError || !updated) {
        return errorResponse("Médicament introuvable ou impossible de le mettre à jour.", 404);
    }

    return successResponse(updated, "Médicament mis à jour avec succès.", 200);
}