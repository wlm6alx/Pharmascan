/**
 * ===============================================================
 * routes/justificatifs/Pharmacie/deleteJustifPharmacie.ts
 *                               —  DELETE /justificatifs/pharmacie
 * ===============================================================
 *
 * ROLE :
 *  Suppression du document justificatif d'une pharmacie.
 *
 * CONSÉQUENCE MÉTIER :
 *  Après suppression, la pharmacie n'a plus de justificatif.
 *  Elle reste dans la base (validate/exist inchangés) mais l'admin
 *  ne peut plus consulter le document lié.
 *  Un nouveau document devra être uploadé via POST avant toute
 *  revalidation.
 *
 * TABLE : public.justif_pharmacie
 *  Opération : DELETE WHERE pharmacie_id = ?
 *
 * RLS : pas de politique FOR DELETE explicite dans le schéma.
 *  La vérification d'appartenance (gérant) est faite dans ce handler.
 *  Le client admin est utilisé pour l'opération de suppression.
 *
 * ACCÈS : JWT requis — rôle 'pharmacien', gérant de la pharmacie concernée
 *
 * BODY ATTENDU (JSON) :
 *      pharmacie_id    string  requis — UUID de la pharmacie
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, message: "Justificatif supprimé." }
 *
 * ===============================================================
 */

import { createAuthenticatedClient }     from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret } from "@/supabaseAdminClient.ts";
import {
    extractToken, getAuthenticatedUser, requireRole,
    successResponse, errorResponse,
} from "@/middleware/auth.ts";

export async function deleteJustifPharmacie(req: Request): Promise<Response> {

    // ── Garde 1-2 : JWT + session active ────────────────────────────
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    const result = await getAuthenticatedUser(token);
    if ("error" in result) return errorResponse(result.error, result.status);
    const { user } = result;

    // ── Garde 3 : Rôle pharmacien ────────────────────────────────────
    if (!requireRole(user, ["pharmacien"])) {
        return errorResponse("Accès réservé aux pharmaciens.", 403);
    }

    // ── Étape 1 : Lecture du body ────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const pharmacie_id = typeof body.pharmacie_id === "string" ? body.pharmacie_id.trim() : null;
    if (!pharmacie_id) return errorResponse("Le champ 'pharmacie_id' est obligatoire.", 400);

    const authClient = createAuthenticatedClient(token);

    // ── Étape 2 : Vérifier que l'appelant est gérant de cette pharmacie ─
    const { data: pharmacienRow } = await authClient
        .from("pharmacien")
        .select("responsability")
        .eq("user_id", user.id)
        .eq("pharmacie_id", pharmacie_id)
        .maybeSingle();

    if (!pharmacienRow) {
        return errorResponse("Vous n'êtes pas affilié à cette pharmacie.", 403);
    }
    if (pharmacienRow.responsability !== "gerant") {
        return errorResponse("Seul le gérant peut supprimer le justificatif de la pharmacie.", 403);
    }

    // ── Étape 3 : Vérifier qu'un justificatif existe ─────────────────
    const { data: existing } = await authClient
        .from("justif_pharmacie")
        .select("justif_id")
        .eq("pharmacie_id", pharmacie_id)
        .maybeSingle();

    if (!existing) {
        return errorResponse("Aucun justificatif trouvé pour cette pharmacie.", 404);
    }

    // ── Étape 4 : Suppression ─────────────────────────────────────────
    // Pas de politique RLS FOR DELETE → client admin utilisé pour garantir l'opération
    // La vérification gérant ci-dessus remplace la RLS manquante
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        return errorResponse("Erreur de configuration serveur.", 500);
    }

    const { error: deleteError } = await adminResult.client
        .from("justif_pharmacie")
        .delete()
        .eq("pharmacie_id", pharmacie_id);

    if (deleteError) {
        return errorResponse("Impossible de supprimer le justificatif.", 500);
    }

    return successResponse(null, "Justificatif de pharmacie supprimé.", 200);
}