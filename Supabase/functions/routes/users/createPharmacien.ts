/**
 * =============================================================================
 * routes/users/createPharmacien.ts  —  POST /users/pharmacien
 * =============================================================================
 *
 * Crée le profil pharmacien dans public.pharmacien pour un utilisateur
 * déjà inscrit (via /auth/register avec role="pharmacien") et connecté.
 *
 * CONTEXTE — Flux complet d'inscription pharmacien :
 *  1. POST /auth/register  (role="pharmacien") → crée public.users avec role='pharmacien'
 *  2. POST /auth/login                         → démarre la session (userState=true)
 *  3. POST /justificatifs/pharmacien           → upload du justificatif (document requis)
 *  4. POST /users/pharmacien  (ce handler)     → crée l'entrée dans public.pharmacien
 *                                                 + vérifie enforce_pharmacien_role()
 *
 * CE QUE CE HANDLER FAIT :
 *  Il crée une ligne dans public.pharmacien en liant le user existant (public.users)
 *  via user_id = users.id. La liaison confirme que cet utilisateur reçoit les
 *  privilèges et contraintes de pharmacien (RLS, triggers, politiques pharmacie).
 *
 *  La fonction SQL enforce_pharmacien_role() est déclenchée AVANT l'insertion
 *  (trigger trg_enforce_pharmacien_role sur public.users AFTER UPDATE).
 *  Elle vérifie que l'utilisateur a bien un justificatif dans justif_pharmacien.
 *  Si absent → exception SQL → 403.
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - requireRole : 'pharmacien' uniquement
 *    (le rôle doit avoir été positionné à 'pharmacien' lors de /auth/register)
 *  - pharmacie_id = NULL à la création (non encore affilié à une pharmacie)
 *  - Un pharmacien ne peut avoir qu'une entrée dans public.pharmacien (clé primaire user_id)
 *
 * BODY ATTENDU (JSON) :
 *      responsability  "gerant" | "pharmacien"   optionnel (défaut: "pharmacien")
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { user_id, pharmacie_id, responsability, created_at } }
 *
 * TRIGGERS SQL impliqués :
 *  - trg_enforce_pharmacien_role (AFTER UPDATE sur users) :
 *    vérifie la présence d'un document dans justif_pharmacien
 *
 * =============================================================================
 */

import { createAuthenticatedClient }   from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ============================================================================================================================
//  Handler principal
// ============================================================================================================================

/**
 * Gère POST /users/pharmacien.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createPharmacien(req: Request): Promise<Response> {

    // ── Garde 1 : JWT requis ───────────────────────────────────────────────────
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ── Garde 2 : Validation JWT + session active (userState = true) ───────────
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ── Garde 3 : Rôle 'pharmacien' requis ────────────────────────────────────
    // Le rôle doit être 'pharmacien' — positionné lors du /auth/register
    // Si l'user est 'patient' ou 'user', il ne peut pas créer ce profil
    if (!requireRole(user, ["user", "pharmacien"])) {
        return errorResponse("Cecompte ne peut pas créer un profil pharmacien.", 403);
    }

    // ── Étape 1 : Lecture du body JSON ─────────────────────────────────────────
    let body: Record<string, unknown> = {};
    try {
        body = await req.json();
    } catch {
        // Body absent → responsability par défaut
    }

    // Responsabilité — "gerant" ou "pharmacien" (défaut : "pharmacien")
    const responsability: "gerant" | "pharmacien" =
        body.responsability === "gerant" ? "gerant" : "pharmacien";

    // ── Étape 2 : Insertion dans public.pharmacien ─────────────────────────────
    // Client authentifié → auth.uid() actif pour les RLS et triggers
    // La liaison se fait via user_id = user.id (clé primaire + clé étrangère → public.users)
    //
    // pharmacie_id = NULL → le pharmacien n'est pas encore affilié à une pharmacie.
    // Il devra ensuite :
    //   - Créer sa pharmacie via POST /pharmacie (s'il est gérant)
    //   - Rejoindre une pharmacie via POST /pharmacie/join (avec une clé d'invitation)
    //
    // La RLS "Pharmacien one pharmacy" (FOR INSERT) vérifie qu'il n'a pas déjà
    // une entrée dans public.pharmacien (clé primaire user_id garantit l'unicité)
    const authClient = createAuthenticatedClient(token);

    const { data: pharmacien, error: insertError } = await authClient
        .from("pharmacien")
        .insert({
            user_id:        user.id,         // liaison avec public.users
            pharmacie_id:   null,            // non affilié à la création
            responsability: responsability,
        })
        .select("user_id, pharmacie_id, responsability, created_at")
        .single();

    if (insertError || !pharmacien) {
        // Profil pharmacien déjà existant (user_id est clé primaire → doublon impossible)
        if (insertError?.message?.includes("duplicate key")) {
            return errorResponse("Un profil pharmacien existe déjà pour ce compte.", 409);
        }
        // Trigger trg_enforce_pharmacien_role : justificatif absent dans justif_pharmacien
        if (insertError?.message?.includes("justificatif")) {
            return errorResponse(
                "Justificatif requis. Uploadez d'abord votre document via POST /justificatifs/pharmacien.",
                403
            );
        }
        return errorResponse("Impossible de créer le profil pharmacien.", 500);
    }

    // ── Étape 3 : Promotion du rôle users.role = 'pharmacien' ─────────────────
    //  Si l'utilisateur avait encore role='user' (défaut après /auth/register),
    //  on le passe à 'pharmacien' maintenant que son profil pharmacien est créé.
    //  Cette mise à jour active les RLS et triggers spécifiques au rôle pharmacien
    //  (notamment trg_enforce_pharmacien_role sur les prochains UPDATE).
    //  Client admin utilisé — pas de politique RLS FOR UPDATE sur users pour ce cas.
    if (user.role === "user") {
        const adminResult = (await import("@/supabaseAdminClient.ts")).getAdminClient(
            (await import("@/supabaseAdminClient.ts")).getAdminSecret(), "admin"
        );
        if (!("error" in adminResult)) {
            await adminResult.client
                .from("users")
                .update({ role: "pharmacien" })
                .eq("id", user.id);
        }
    }

    return successResponse(pharmacien, "Profil pharmacien créé avec succès.", 201);
}