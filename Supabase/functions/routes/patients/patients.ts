/**
 * =================================================================================
 *  routes/patients/patients.ts
 *      GET /patients/me        ->  getPatient()
 *      PUT /patients/me        ->  updatePatient()
 *      PUT /patients/private   ->  updatePatientPrivate()
 * =================================================================================
 * 
 * ---------------------------------------------------------------------------------
 *  HANDLER 1   -   getPatient()    :   GET /patients/me
 * ---------------------------------------------------------------------------------
 *  Retourne le profil patient de l'utilisateur connecté.
 *  Données de la table patients (gender, birthDate, urgence_phone, adress).
 *  N'inclut pas les données privées (HistoriqueScan, PharmacieFavorite) -
 *  Celles-ci sont des patient_private_data et non exposées ici par défaut.
 * 
 *  RLS :   "Patient sees own data" FOR SELECT USING (auth.uid() = user_id)
 * 
 * ---------------------------------------------------------------------------------
 *  HANDLER 2   -   updatePatient() :   PUT /patients/me
 * ---------------------------------------------------------------------------------
 *  Modifie les informations du profil patient (patch partiel).
 * 
 *  BODY JSON (tous optionnels, au moins un requis) :
 *      gender          "M" | "F" | "Other" miroir du CHECK SQL
 *      birthDate       string YYYY-MM-DD
 *      urgence_phone   string +XXXXX       (null = supprimer)
 *      adress          string              (null = supprimer)
 * 
 * ---------------------------------------------------------------------------------
 *  HANDLER 3   -   updatePatientPrivate()  :   PUT /patients/private
 * ---------------------------------------------------------------------------------
 *  Modifie les données privées du patient.
 * 
 *  CHAMP MODIFIABLE    :
 *      PharmacieFavorite   string  optionnel   -   UUID ou nom de la pharmacie favorite
 * 
 *  CHAMP EN LECTURE SEULE  -   HistoriqueScan  :
 *      HistoriqueScan est alimenté exclusivement par scanQRCode() (getMedicament.ts).
 *      Le patient ne peut pas le modifier directement via cette route.
 *      Toute tentative de modification de HistoriqueScan retourne une erreur 403.
 *      Cela garantit l'intégrité de la traçabilité des scans.
 * 
 *  RLS :   "Patient accesses own private data" FOR SELECT USING (auth.uid() = patient_id)
 *  Pas de RLS FOR UPDATE sur patient_private_data  ->  client admin requis pour l'écriture.*
 *  L'autorisation est garantie par les gardes JWT + requireRole.
 * 
 * ---------------------------------------------------------------------------------
 *  SECURITE (commune)  :
 *      - JWT requis + userState = true
 *      - requireRole   : 'patient' uniquement
 * 
 * =================================================================================
 */

import { createAuthenticatedClient }        from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";
import { 
    getAuthenticatedUser, 
    requireRole, 
    errorResponse, 
    successResponse,
    extractToken
}                                           from "@/middleware/auth.ts";

// =================================================================================
//  HANDLER 1   -   Proil patient
// =================================================================================

/**
 * Gère GET /patients/me.
 * 
 * @param req   Requête HTTP entrante
 * @returns     Response JSON standardisée
 */
export async function getPatient(req: Request): Promise<Response> {
    
    // ---  Garde 1 :   JWT requis  ------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  --------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 :   Rôle 'patient' requis   ------------------------------------
    if (!requireRole(user, ["patient"])) {
        return errorResponse("Accès réservé aux patients.", 403);
    }

    // ---  Etape 1 :   Récupération du profil patient  ----------------------------
    //  Client authentifié  -   RLS "Patient sees own data" filtre user_id = auth.uid().
    const authClient = createAuthenticatedClient(token);

    const { data: patient, error } = await authClient
        .from("patients")
        .select("user_id, gender, birthDate, urgence_phone, adress, created_at")
        .eq("user_id", user.id)
        .single();

    if (error || !patient) {
        return errorResponse(
            "Profil patient introuvable. Créez votre profil.",
            404
        );
    }

    return successResponse(patient, "Profil patient récupéré.", 200);
}
// =================================================================================
//  HANDLER 2   -   Modifier le profil patient
// =================================================================================

/**
 * Gère PUT /patients/me
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function updatePatient(req: Request): Promise<Response> {
    
    // ---  Garde 1 :   JWT requis  ------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  --------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 :   Rôle 'patient' requis   ------------------------------------
    if (!requireRole(user, ["patient"])) {
        return errorResponse("Accès réservé aux patients.", 403);
    }

    // ---  Etape 1 :   Lecture du body JSON    ------------------------------------
    let body: Record<string, unknown> = {};
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSOON attendu.", 400);
    }

    // ---  Etape 2 :   Construction des champs à mettre à jour (patch partiel) ----
    const updates:  Record<string, unknown> = {};

    if (typeof body.gender === "string") {
        //  Validation - miroir du CHECK constraint SQL : gender IN ('M', '', 'Other')
        const gender = body.gender.trim();
        if (!["M", "F", "Other"]. includes(gender)) {
            return errorResponse("Le champ 'gender' doit être 'M', 'F' ou 'Other'.", 400);
        }
        updates.gender = gender;
    }

    if (typeof body.birthDate === "string") {
        //  Validation du format YYYY-MM-DD
        const birthDate = body.birthDate.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            return errorResponse("Format 'birthDate' invalide. Attendu: YYYY-MM-DD.", 400);
        }
        updates.birthDate = birthDate;
    }

    if (typeof body.urgence_phone === "string") {
        //  Validation miroir du domaine phone_type SQL (+XXXXX)
        //  Chaîne vide = suppression (null)
        const phone = body.urgence_phone.trim();
        if (phone && !/^\+[0-9]+$/.test(phone)) {
            return errorResponse("ormat 'urgence_phone' invalide. Attendu : +XXXXX.", 400);
        }
        updates.urgence_phone = phone || null;
    }

    if (typeof body.adress === "string") {
        //  Chaîne vide = suppression (null)
        updates.adress = body.adress.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
        return errorResponse(
            "Aucun champ à mettre à jour. Champos modiiables : gender, birthDate, urgence_phone, adress.",
            400
        );
    }

    // ---  Etape 3 :   Mise à our dans patients    --------------------------------
    //  Client authentiié   -   RLS "Patient sees own data" garantit user_id = auth.uid()
    const authClient = createAuthenticatedClient(token);

    const { data: updated, error: updateError } = await authClient
        .from("patients")
        .update(updates)
        .eq("user_id", user.id)
        .select("user_id, gender, birthDate, urgence_phone, adress, created_at")
        .single();

    if (updateError || !updated) {
        return errorResponse("Impossible de mettre à jour le proil patient.", 500);
    }

    return successResponse(updated, "Proil patient mis à jour avec succès.", 200);
}

// =================================================================================
//  HANDLER 3   -   Modiier les données privées patient
// =================================================================================

/**
 * Gère PUT /patients/private.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     response JSON standardisée
 */
export async function updatePatientPrivate(req: Request): Promise<Response> {
        
    // ---  Garde 1 :   JWT requis  ------------------------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  --------------------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 :   Rôle 'patient' requis   ------------------------------------
    if (!requireRole(user, ["patient"])) {
        return errorResponse("Accès réservé aux patients.", 403);
    }

    // ---  Etape 1 :   Lecture du body JSON    ------------------------------------
    let body: Record<string, unknown> = {};
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSOON attendu.", 400);
    }

    // ---  Garde 4 :   Protection de HistoriqueScan    ----------------------------
    //  HistoriqueScan est alimenté exclusivement par scanQRCode() (getMedicament.ts).
    //  Il est en lecture seule ici pour garantir l'intégrité de la traçabilité des scans.
    //  Toute tentative de modification directe est refusée explicitement.
    if (body.HistoriqueScan !== undefined) {
        return errorResponse(
            "L'historique de scan est en lecture seule. Il est alimenté automatiquement lors des scans.",
            403
        );
    }

    // ---  Etape 2 :   Construction des champs modifiables -----------------------
    //  Seul PharmacieFavorite est modifiable directement par le patient.
    const updates: Record<string, unknown> = {};
    
    if (typeof body.PharmacieFavorite === "string") {
        //  Accepte un UUID, un nom ou une chaîne vide (null = supprimer)
        updates.PharmacieFavorite = body.PharmacieFavorite.trim()   || null;
    }

    if (Object.keys(updates).length === 0) {
        return errorResponse(
            "Aucun champ à mettre à jour. Champ modifiable : PharamcieFavorite.",
            400
        );
    }

    updates.update_at = new Date().toDateString();

    // ---  Etape 3 :   Mise à jour ou création dans patient_private_data   -------
    //  Pas de RLS FOR UPDATE sur patient_private_data  -> client admin requis.
    //  L'autorisation est garantie par les gardes JWT + requireRole + user.id ci-dessus.
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    //  Vérification de l'existence du profil privé
    const { data: existing } = await adminClient
        .from("patient_private_data")
        .select("patient_id")
        .eq("patient_id", user.id)
        .single();

    if (existing) {
        //  Profil existant - mise à jour
        const { data, error } = await adminClient
            .from("patient_private_data")
            .update(updates)
            .eq("patient_id", user.id)
            .single();

        if (error ||!data) {
            return errorResponse("Impossible de mettre à jour les données privées., 500");
        }
        return successResponse(data, "Données privées mises à jour avec succès.", 200);
    } else {
        //  Proil inexistant    -   création (premier accès aux données privées)
        const { data, error } = await adminClient
            .from("patient_private_data")
            .insert({
                patient_id:         user.id,
                PharmacieFavorite:  updates.PharamcieFavorite ?? null,
            })
            .select("patient_id, PharmacieFavorite, update_at")
            .single();

        if (error || !data) {
            return errorResponse("Impossible de créer les données privées.", 500);
        }
        return successResponse(data, "Données privées crées avec succès.", 201);
    }
}