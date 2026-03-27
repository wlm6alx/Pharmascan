/**
 * =================================================================
 * routes/patients/patients.ts  -   Gestion du proil patient
 * =================================================================
 * 
 * Contient trois routes :
 *  - getPatient            :   GET /patients/me
 *  - updatePatient         :   PUT /patients/me
 *  - updatePatientProvate  :   PUT /patients/private
 * =================================================================
 */

import { 
    getAuthenticatedUser, 
    requireRole, 
    errorResponse, 
    successResponse,
    extractToken
}                                       from "@/middleware/auth.ts";
import { createAuthenticatedClient }    from "@/supabaseClient.ts";

//  ================================================================

/**
 *  ================================================================
 *  getPatient  -   Consultation du profil patient
 *  ================================================================
 * 
 * RÔLE :
 *  Retourne le profil patient de l'utilisateur connecté.
 *  La politique RLS "Patient sees own data" filtre automatiquement.
 * 
 * ENDPOINT :   GET /patients/me
 * 
 * REPONSE SUCCESS (200)    :
 *  { success: true, patient : { gender, birthDate, urgence_phone, adress, created_at } }
 * =================================================================
 */
export async function getPatient(req: Request): Promise<Response> {
    try {
        //  --- Authentification    --------------------------------
        const token = extractToken(req);
        const currentUser = await getAuthenticatedUser(token);
        if ("error" in currentUser) return errorResponse(currentUser.error, currentUser.status);
        requireRole(currentUser.user, ["patient"]);

        //  Crée un client authentifié - LES RLS filtrent sur auth.uid()
        const authClient = createAuthenticatedClient(token);

        //  Lecture du profil patient - RLS garantissant qu'on n e lit que le sien
        //  On ne sélectionne jamais user_id (UUID)
        const { data: patient, error } = await authClient
            .from("patients")
            .select("gender, birthDate, urgence_phone, adress, created_at")
            .maybeSingle();
        
        if (error) return errorResponse(`Erreur: ${error.message}`, 500);
        if (!patient) return errorResponse(
            "Profil patient introuvable.",
            404
        );

        return successResponse({ patient });
    } catch (err) {
        return errorResponse(
            err instanceof Error ? err.message : "Erreur inconnue",
            err instanceof Error && err.message.includes("Non authentifié") ? 401 :
            err instanceof Error && err.message.includes("Accès refusé") ? 403 : 500
        )
    }  
}
//  ================================================================

/**
 *  ================================================================
 *  updatePatient   -   Mise à jour du profil patient
 *  ================================================================
 * 
 * RÔLE :
 *      Permet au patient de modifier ses informations de profil.
 * 
 * ENDPOINT :   PUT /patient/me
 * 
 * BODY JSON attendu (optionnels)   :
 *      { gender?, birthDate?, urgence_phone?, adress? }
 *  ================================================================
 */
export async function updatePatient(req: Request): Promise<Response> {
    try {
        const token = extractToken(req);
        const currentUser = await getAuthenticatedUser(token);
        if ("error" in currentUser) return errorResponse(currentUser.error, currentUser.status);
        requireRole(currentUser.user, ["patient"]);

        const body = await req.json();
        const { gender, birthDate, urgence_phone, adress } = body;

        if (!gender && !birthDate && !urgence_phone && !adress) {
            return errorResponse(
                "Au moins un champ à modifier doit être fourni.",
                400
            );
        }

        if (gender && !["M", "F"].includes(gender)) {
            return errorResponse (
                "gender doit être 'M' ou 'F'.",
                400
            );
        }

        const updateFields: Record<string, unknown> = {};
        if (gender)             updateFields.gender = gender;
        if (birthDate)          updateFields.birthDate = birthDate;
        if (urgence_phone)      updateFields.urgence_phone = urgence_phone;
        if (adress)             updateFields.adress = adress;

        const authClient = createAuthenticatedClient(token);

        //  RLS "Patient sees owwn data" garantit qu'on ne modifie que son propre profil
        const { error } = await authClient.from ("patients").update(updateFields);
        //  Don't need .ed() -  RLS ilter on auth.uid() aurmatically

        if (error) return errorResponse(
            `Erreur lors de la mise à jour: ${error.message}`,
            500
        );

        return successResponse({ message: "Profil patient mis à jour avec succès." });
    } catch(err) {
        return errorResponse(
            err instanceof Error ? err.message:     "Erreur inattendue",
            err instanceof Error && err.message.includes("Non authentifié") ? 401 :
            err instanceof Error && err.message.includes("Accès refusé") ? 403 : 500
        );
    }  
}

//  ================================================================

/**
 *  ================================================================
 *  updatePatientPrivate    -   Mise à jour des données provées patient
 *  ================================================================
 * 
 * RÔLE :
 *  Permet au patient de modifier ses données privées
 *  (historiqeu de scans, pharmacie favorite).
 * 
 * ENDPOINT :   PUT /patients/private
 * 
 * BODY JSON attendu (optionnels)   :
 *  { HistoriqeuScan?, PharmacieFavorite? }
 * 
 *  ================================================================
 */
export async function updatePatientPrivate(req: Request): Promise<Response> {
    try {
        const token = extractToken(req);
        const authUser = await getAuthenticatedUser(token);
        if ("error" in authUser) return errorResponse(authUser.error, authUser.status);
        requireRole(authUser.user, ["patient"]);

        const { HistoriqueScan, PharmacieFavorite } = await req.json();

        if (!HistoriqueScan && !PharmacieFavorite) {
            return errorResponse(
                "Aumoins un champ doit être fourni.",
                400
            );
        }

        const updateFields: Record<string, unknown> = {
            update_at: new Date().toISOString(),
        };
        if (HistoriqueScan)         updateFields.HistoriqueScan = HistoriqueScan;
        if (PharmacieFavorite)      updateFields.PharmacieFavorite = PharmacieFavorite;

        const authClient = createAuthenticatedClient(token);

        //  La politique RLS "Patient accesses own private data" filtre automatiquement
        const { error } = await authClient
            .from("patient_private_data")
            .update(updateFields);

        if (error) return errorResponse(`Erreur lors de la mise à jour: ${error.message}`, 500);

        return successResponse({ message: "Données privées mises à jour avec succès."});
    } catch(err) {
        return errorResponse(
            err instanceof Error ? err.message : "Erreur inattendue",
            err instanceof Error && err.message.includes("Non authentifié") ? 401 :
            err instanceof Error && err.message.includes("Accès refusé") ? 403 :500
        );
    }  
}