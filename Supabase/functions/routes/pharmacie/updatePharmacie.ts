/**
 * =============================================================================
 * routes/pharmacie/updatePharmacie.ts  —  PUT /pharmacie
 * =============================================================================
 *
 * Modification du nom et du téléphone d'une pharmacie.
 *
 * CHAMPS MODIFIABLES (selon la fonction SQL update_pharmacy) :
 *  - name  : nouveau nom
 *  - phone : nouveau numéro (format +XXXXX)
 *
 * CHAMPS NON MODIFIABLES VIA CETTE ROUTE :
 *  - adress, ville, quartier  : données structurelles — modification via admin
 *  - validate, exist           : gérées par l'admin
 *  - status                    : géré via PATCH /pharmacie/status
 *
 * OPÉRATION VIA RPC :
 *  Appelle la fonction SQL SECURITY DEFINER update_pharmacy() qui effectue
 *  directement l'UPDATE sans contrôle RLS supplémentaire.
 *  La vérification d'appartenance est faite côté TypeScript en amont.
 *
 * POLITIQUE RLS :
 *  - "Pharmacien can update pharmacy status" FOR UPDATE
 *    USING (pharmacie_id IN (SELECT pharmacie_id FROM pharmacien WHERE user_id = auth.uid()))
 *  Note : la RLS couvre UPDATE en général — la fonction SQL SECURITY DEFINER
 *         bypass les RLS, mais la vérification TypeScript garantit l'appartenance.
 *
 * SÉCURITÉ :
 *  - JWT requis + userState = true
 *  - Rôle "pharmacien" requis
 *  - Vérification que l'appelant appartient à la pharmacie ciblée
 *
 * BODY ATTENDU (JSON) :
 *      pharmacie_id    string  requis — UUID de la pharmacie à modifier
 *      name            string  optionnel
 *      phone           string  optionnel — format +XXXXX
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: { pharmacie_id, name, phone } }
 *
 * =============================================================================
 */

import { createAuthenticatedClient }    from "@/supabaseClient.ts";
import { extractToken, getAuthenticatedUser, requireRole, successResponse, errorResponse } from "@/middleware/auth.ts";

// ─────────────────────────────────────────────────────────────────────────────

export async function updatePharmacie(req: Request): Promise<Response> {

    // ── Garde 1 : JWT ────────────────────────────────────────────────────────
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ── Garde 2 : Session active ──────────────────────────────────────────────
    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    // ── Garde 3 : Rôle pharmacien ─────────────────────────────────────────────
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    // ── Étape 1 : Lecture du body ─────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const pharmacie_id = typeof body.pharmacie_id === "string" ? body.pharmacie_id.trim() : null;
    const name         = typeof body.name         === "string" ? body.name.trim()         : null;
    const phone        = typeof body.phone        === "string" ? body.phone.trim()        : null;

    if (!pharmacie_id) return errorResponse("Le champ 'pharmacie_id' est obligatoire.", 400);

    // Au moins un champ à modifier
    if (!name && !phone) {
        return errorResponse("Fournissez au moins 'name' ou 'phone' à modifier.", 400);
    }

    // Validation phone si fourni
    if (phone && !/^\+[0-9]+$/.test(phone)) {
        return errorResponse("Format téléphone invalide. Format attendu : +XXXXX", 400);
    }

    // ── Étape 2 : Vérification d'appartenance ─────────────────────────────────
    // Le pharmacien doit appartenir à la pharmacie qu'il tente de modifier
    const authClient = createAuthenticatedClient(token);

    const { data: membership } = await authClient
        .from("pharmacien")
        .select("pharmacie_id")
        .eq("user_id",     user.id)
        .eq("pharmacie_id", pharmacie_id)
        .single();

    if (!membership) {
        return errorResponse("Vous n'appartenez pas à cette pharmacie.", 403);
    }

    // ── Étape 3 : Appel RPC update_pharmacy ───────────────────────────────────
    // La fonction SQL SECURITY DEFINER update_pharmacy(p_pharmacie_id, p_name, p_phone)
    // effectue directement l'UPDATE — la vérification d'appartenance est faite ci-dessus
    // On passe les valeurs actuelles si non modifiées (la fonction écrase les deux)
    const { data: currentPharm } = await authClient
        .from("pharmacie")
        .select("name, phone")
        .eq("pharmacie_id", pharmacie_id)
        .single();

    const finalName  = name  ?? currentPharm?.name;
    const finalPhone = phone ?? currentPharm?.phone;

    const { error: rpcError } = await authClient.rpc("update_pharmacy", {
        p_pharmacie_id: pharmacie_id,
        p_name:         finalName,
        p_phone:        finalPhone,
    });

    if (rpcError) {
        return errorResponse("Impossible de modifier la pharmacie.", 500);
    }

    return successResponse(
        { pharmacie_id, name: finalName, phone: finalPhone },
        "Pharmacie mise à jour avec succès.",
        200
    );
}