/**
 * =====================================================================================
 *  routes/medicaments/getMedicament.ts
 *      GET /medicaments/detail  →  getMedicament()
 *      GET /medicaments/scan    →  scanQRCode()
 * =====================================================================================
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * HANDLER 1 — getMedicament()  :  GET /medicaments/detail?medicament_id=<uuid>
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  Retourne le détail complet d'un médicament visible par son UUID.
 *  Route publique — RLS filtre visibility = true pour les anonymes.
 *
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * HANDLER 2 — scanQRCode()  :  GET /medicaments/scan?qr_path=<chemin>
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  Identifie un médicament par le chemin textuel de son QR Code (QR_Code.path).
 *  Retourne : is_valid, name, categorie, date_fabricate, date_expirate.
 *
 *  TRAÇABILITÉ PATIENT (si JWT présent et rôle = 'patient') :
 *      Le scan est enregistré dans patient_private_data.HistoriqueScan.
 *
 *      Format d'une entrée dans HistoriqueScan (champ TEXT cumulatif) :
 *
 *          <QRCode_id> -> <timestamp ISO> -> <résultat>
 *
 *      "->" est le séparateur de champ.
 *      Il n'apparaît pas dans les UUIDs ni dans les timestamps ISO 8601 —
 *      il peut donc servir de délimiteur fiable lors du parsing ultérieur.
 *
 *      Résultat possible :
 *          "valide:<medicament_id>"          si le QR correspond à un médicament visible
 *          "invalide"                        si le QR est inconnu ou le médicament invisible
 *
 *      Chaque scan est une nouvelle ligne (\n) dans le champ TEXT.
 *      Exemple de lecture : split('\n').filter(Boolean).map(e => e.split(' -> '))
 *
 *      Exemple d'entrée :
 *          a3f2...uuid -> 2026-03-05T14:22:10.000Z -> valide:b4e1...uuid
 *          inconnu -> 2026-03-05T14:25:00.000Z -> invalide
 *
 *      Si le profil patient_private_data n'existe pas encore, il est créé automatiquement.
 *
 * POLITIQUES RLS :
 *  - "Public can visible medicaments" FOR SELECT USING (visibility = true)
 *  - "A medicament has a QR Code" FOR SELECT (QR_Code lié à un médicament)
 *  - "Patient accesses own private data" FOR SELECT (lecture privée patient)
 *  - patient_private_data : pas de RLS FOR UPDATE → client admin requis pour l'écriture.
 *
 * =====================================================================================
 */

import { supabase, createAuthenticatedClient }  from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }        from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    successResponse,
    errorResponse,
}                                                from "@/middleware/auth.ts";

// =====================================================================================
//  Handler 1 — Détail d'un médicament
// =====================================================================================

/**
 * Gère GET /medicaments/detail?medicament_id=<uuid>.
 *
 * @param req   Requête HTTP entrante
 * @returns     Response JSON standardisée
 */
export async function getMedicament(req: Request): Promise<Response> {

    //  --- Etape 1 :   Extraction du paramètre obligatoire  ------------------------
    const url          = new URL(req.url);
    const medicamentId = url.searchParams.get("medicament_id")?.trim() ?? null;

    if (!medicamentId) {
        return errorResponse("Le paramètre 'medicament_id' est obligatoire.", 400);
    }

    //  --- Etape 2 :   Récupération du médicament  ----------------------------------
    //  Client ANON — RLS "Public can visible medicaments" filtre visibility = true.
    //  Un médicament invisible retournera 0 résultat → 404.
    const { data: medicament, error } = await supabase
        .from("medicament")
        .select("medicament_id, name, categorie, description, image_path, date_fabricate, date_expirate, created_at")
        .eq("medicament_id", medicamentId)
        .single();

    if (error || !medicament) {
        return errorResponse("Médicament introuvable ou non disponible.", 404);
    }

    return successResponse(medicament, "Médicament récupéré.", 200);
}

// =====================================================================================
//  Handler 2 — Scan QR Code + traçabilité patient
// =====================================================================================

/**
 * Gère GET /medicaments/scan?qr_path=<chemin>.
 *
 * @param req   Requête HTTP entrante
 * @returns     Response JSON standardisée
 */
export async function scanQRCode(req: Request): Promise<Response> {

    //  --- Etape 1 :   Extraction du paramètre QR path  ----------------------------
    const url    = new URL(req.url);
    const qrPath = url.searchParams.get("qr_path")?.trim() ?? null;

    if (!qrPath) {
        return errorResponse("Le paramètre 'qr_path' est obligatoire.", 400);
    }

    //  --- Etape 2 :   Identification du QR Code  ----------------------------------
    //  Client ANON — RLS "A medicament has a QR Code" active.
    //  Recherche par le chemin textuel (QR_Code.path).
    const { data: qrRow, error: qrError } = await supabase
        .from("QR_Code")
        .select("QRCode_id, path")
        .eq("path", qrPath)
        .single();

    //  --- Etape 3 :   Identification du médicament lié  ---------------------------
    let isValid        = false;
    let medicamentData: { medicament_id: string; name: string; categorie: string | null; date_fabricate: string; date_expirate: string } | null = null;
    const qrCodeId     = qrRow?.QRCode_id ?? null;

    if (!qrError && qrRow) {
        //  QR Code trouvé — chercher le médicament lié visible (RLS visibility=true)
        const { data: med, error: medError } = await supabase
            .from("medicament")
            .select("medicament_id, name, categorie, date_fabricate, date_expirate")
            .eq("codeQR", qrRow.QRCode_id)
            .single();

        if (!medError && med) {
            isValid        = true;
            medicamentData = med;
        }
    }

    //  --- Etape 4 :   Construction de la réponse scan  ----------------------------
    const scanResult = isValid
        ? {
            is_valid:       true,
            name:           medicamentData!.name,
            categorie:      medicamentData!.categorie,
            date_fabricate: medicamentData!.date_fabricate,
            date_expirate:  medicamentData!.date_expirate,
        }
        : { is_valid: false };

    //  --- Etape 5 :   Traçabilité patient (JWT optionnel)  -----------------------
    //  Si un JWT valide est présent et que l'utilisateur est patient,
    //  on enregistre le scan dans patient_private_data.HistoriqueScan.
    //  L'échec de la traçabilité est non-bloquant : la réponse scan est prioritaire.
    const token = extractToken(req);
    if (token) {
        const authResult = await getAuthenticatedUser(token);
        if (!("error" in authResult) && authResult.user.role === "patient") {
            await recordPatientScan(authResult.user.id, qrCodeId, isValid, medicamentData);
        }
    }

    return successResponse(
        scanResult,
        isValid ? "QR Code valide." : "QR Code invalide ou médicament non disponible.",
        200
    );
}

// =====================================================================================
//  Utilitaire interne — enregistrement dans l'historique patient
// =====================================================================================

/**
 * Ajoute une entrée de scan dans patient_private_data.HistoriqueScan.
 *
 * FORMAT D'UNE ENTRÉE :
 *
 *      <QRCode_id|"inconnu"> -> <timestamp ISO> -> <résultat>
 *
 *  "->" est le séparateur de champ. Il n'apparaît pas dans :
 *  - les UUIDs (hexadécimal + tirets uniquement)
 *  - les timestamps ISO 8601 (chiffres, T, Z, : uniquement)
 *  - les résultats (alphanumérique + ":")
 *  → Délimiteur fiable pour le parsing côté client.
 *
 *  Résultats possibles :
 *      "valide:<medicament_id>"    — QR reconnu, médicament visible
 *      "invalide"                  — QR inconnu ou médicament invisible
 *
 *  Le champ HistoriqueScan est un TEXT cumulatif.
 *  Chaque scan est une nouvelle ligne (\n).
 *  Lecture : historique.split('\n').filter(Boolean).map(e => e.split(' -> '))
 *
 * @param patientUserId     UUID du patient (= patients.user_id = patient_private_data.patient_id)
 * @param qrCodeId          UUID du QR Code scanné (null si QR inconnu)
 * @param isValid           true si le scan a identifié un médicament visible
 * @param medicamentData    Données du médicament si isValid = true
 */
async function recordPatientScan(
    patientUserId:  string,
    qrCodeId:       string | null,
    isValid:        boolean,
    medicamentData: { medicament_id: string } | null
): Promise<void> {
    try {
        //  Client admin — patient_private_data n'a pas de RLS FOR UPDATE.
        //  L'autorisation est vérifiée en amont (JWT + role patient).
        const adminResult = getAdminClient(getAdminSecret(), "admin");
        if ("error" in adminResult) return;
        const adminClient = adminResult.client;

        //  Construction de l'entrée
        //      Format : <id_qr> -> <timestamp_ISO> -> <résultat>
        //      id_qr = UUID du QR Code, ou "inconnu" si le QR n'existe pas en base
        const idQr      = qrCodeId ?? "inconnu";
        const timestamp = new Date().toISOString();
        const resultat  = isValid
            ? `valide:${medicamentData!.medicament_id}`
            : "invalide";
        const newEntry  = `${idQr} -> ${timestamp} -> ${resultat}`;

        //  Lecture de l'entrée existante dans patient_private_data
        const { data: privateData } = await adminClient
            .from("patient_private_data")
            .select("patient_id, HistoriqueScan")
            .eq("patient_id", patientUserId)
            .single();

        if (privateData) {
            //  Profil existant — ajout de la nouvelle entrée à l'historique
            //  \n sépare les entrées pour permettre split('\n') côté client
            const updatedHistorique = privateData.HistoriqueScan
                ? `${privateData.HistoriqueScan}\n${newEntry}`
                : newEntry;

            await adminClient
                .from("patient_private_data")
                .update({ HistoriqueScan: updatedHistorique })
                .eq("patient_id", patientUserId);
        } else {
            //  Profil inexistant — création avec ce premier scan
            await adminClient
                .from("patient_private_data")
                .insert({
                    patient_id:     patientUserId,
                    HistoriqueScan: newEntry,
                });
        }
    } catch (err) {
        //  Traçabilité non-bloquante — on log sans propager
        console.error(`[recordPatientScan] Echec patientId=${patientUserId}:`, err);
    }
}