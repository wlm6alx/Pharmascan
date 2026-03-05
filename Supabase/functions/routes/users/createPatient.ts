/**
 * =============================================================================
 * routes/users/createPatient.ts  —  POST /users/patient
 * =============================================================================
 *
 * Crée le profil étendu patient dans public.patients pour un utilisateur
 * déjà inscrit et connecté via /auth/register + /auth/login.
 *
 * CONTEXTE — Flux complet d'inscription patient :
 *  1. POST /auth/register  (role="patient") → crée public.users avec role='patient'
 *  2. POST /auth/login                      → démarre la session (userState=true)
 *  3. POST /users/patient  (ce handler)     → crée public.patients + lie par users.id
 *
 *  Sans l'étape 3, l'utilisateur reste avec les droits limités de 'patient' sans
 *  profil étendu (pas d'historique de scan, pas de pharmacie favorite, etc.).
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true (session active)
 *  - requireRole : 'patient' uniquement
 *  - Le trigger enforce_patient_role (BEFORE INSERT sur patients) vérifie en SQL
 *    que l'utilisateur a bien role='patient' dans public.users
 *  - Liaison par user_id = auth.uid() via le client authentifié
 *
 * BODY ATTENDU (JSON) — tous les champs sont optionnels :
 *      gender        "M" | "F" | "Other"
 *      birthDate     string   format YYYY-MM-DD
 *      urgence_phone string   format +XXXXX
 *      adress        string
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { user_id, gender, birthDate, urgence_phone, adress, created_at } }
 *
 * TRIGGERS SQL impliqués :
 *  - enforce_patient_role (BEFORE INSERT) : vérifie role='patient' dans users
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, 
    getAuthenticatedUser, 
    requireRole, 
    successResponse, 
    errorResponse }                     from "@/middleware/auth.ts";

// ============================================================================================================================
//  Handler principal
// ============================================================================================================================

/**
 * Gère POST /users/patient.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createPatient(req: Request): Promise<Response> {

    // ── Garde 1 : JWT requis ───────────────────────────────────────────────────
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ── Garde 2 : Validation JWT + session active (userState = true) ───────────
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ── Garde 3 : Rôle 'patient' requis ───────────────────────────────────────
    //  L'utilisateur doit avoir role='user' ou 'patient' - 'user' sera promu ici.
    //  requireRole retourne boolean - on gère le reus explicitement.
    //  On accepte 'user' (rôle par défaut après register) et 'patient' (déjà promu).
    if (!requireRole(user, ["user", "patient"])) {
        return errorResponse("Ce compte ne peut pas créer un proil patient", 403);
    }

    // ── Étape 1 : Lecture du body JSON ─────────────────────────────────────────
    let body: Record<string, unknown> = {};
    try {
        body = await req.json();
    } catch {
        // Body vide ou absent → tous les champs sont optionnels, pas d'erreur
    }

    // Extraction et validation des champs optionnels
    const gender        = typeof body.gender        === "string" ? body.gender.trim()        : null;
    const birthDate     = typeof body.birthDate     === "string" ? body.birthDate.trim()     : null;
    const urgence_phone = typeof body.urgence_phone === "string" ? body.urgence_phone.trim() : null;
    const adress        = typeof body.adress        === "string" ? body.adress.trim()        : null;

    // Validation gender — doit correspondre au CHECK constraint SQL
    if (gender !== null && !["M", "F", "Other"].includes(gender)) {
        return errorResponse("Le champ 'gender' doit être 'M', 'F' ou 'Other'.", 400);
    }

    // Validation birthDate — format YYYY-MM-DD
    if (birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return errorResponse("Format de date invalide. Format attendu : YYYY-MM-DD.", 400);
    }

    // Validation urgence_phone — miroir du domaine phone_type SQL
    if (urgence_phone !== null && !/^\+[0-9]+$/.test(urgence_phone)) {
        return errorResponse("Format téléphone d'urgence invalide. Format attendu : +XXXXX", 400);
    }

    // ── Étape 2 : Insertion dans public.patients ───────────────────────────────
    // Client authentifié → auth.uid() = user.id actif dans les RLS et triggers
    // Le trigger enforce_patient_role vérifie en SQL que role = 'patient'
    // La liaison se fait via user_id = user.id (clé étrangère → public.users)
    const authClient = createAuthenticatedClient(token);

    const { data: patient, error: insertError } = await authClient
        .from("patients")
        .insert({
            user_id:       user.id,   // liaison avec public.users par UUID
            gender:        gender        ?? null,
            birthDate:     birthDate     ?? null,
            urgence_phone: urgence_phone ?? null,
            adress:        adress        ?? null,
        })
        .select("user_id, gender, birthDate, urgence_phone, adress, created_at")
        .single();

    if (insertError || !patient) {
        // Profil patient déjà existant (doublon sur la clé primaire user_id)
        if (insertError?.message?.includes("duplicate key")) {
            return errorResponse("Un profil patient existe déjà pour ce compte.", 409);
        }
        // Trigger enforce_patient_role : rôle invalide côté SQL
        if (insertError?.message?.includes("invalide") || insertError?.message?.includes("requis")) {
            return errorResponse("Votre rôle ne permet pas la création d'un profil patient.", 403);
        }
        return errorResponse("Impossible de créer le profil patient.", 500);
    }

    // ---  Etape 3 :   Promotion du rôle de users.role = 'patient' -----------------
    //  Si l'utilisateur avait encore role='user' (défaut après register), on le passe à
    //  'patient' maintenant que son profil patient est créé.
    //  Cette mise à jour active les RLS et triggers spécifiques au rôle patient.
    //  Client admin utilisé - pas de politique RLS FOR UPDATE sur users pour ce cas
    if (user.role === "user") {
        const adminResult = (await import ("@/supabaseAdminClient.ts")).getAdminClient(
            (await import("@/supabaseAdminClient.ts")).getAdminSecret(), "admin"
        );
        if (!("error" in adminResult)) {
            await adminResult.client
                .from("users")
                .update({ role: "patient "})
                .eq("id", user.id);
        }
    } 

    return successResponse(patient, "Profil patient créé avec succès.", 201);
}