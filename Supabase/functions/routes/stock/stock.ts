/**
 * =====================================================================
 * routes/stock/stock.ts
 *      GET     /stocks ->  getStock()
 *      POST    /stocks ->  addStock()
 *      PUT     /stocks ->  updateStock()
 * =====================================================================
 * 
 * ---------------------------------------------------------------------
 *  HANDLER 1   -   getStock()  :   GET /stocks?pharmacei_id=<uuid>
 * ---------------------------------------------------------------------
 *  Consulte le stock d'une pharmacie
 * 
 *  Deux niveaux d'accès    :
 *      -   Public (ANON)   :
 *          Lecture via la vue stock_public_view - champs : stock_id, medicament_id, pharmacy_id,
 *          available. Pas de qualité, ni de prix exposés. Seules les pharmacies validate=true AND
 *          exist=true sont visibles
 *          (RLS "All users can see stock availability").
 *      -   Pharmacien affilié ou admin:
 *          Lecture complète depuis stockMedicament - quantity, price, update_at inclus.
 * 
 * ---------------------------------------------------------------------
 *  HANDLER 2   -   addStock()  :   POST /stocks
 * ---------------------------------------------------------------------
 *  Ajoute un médicament au stock d'une pharmacie
 *  Réservé aux pharmaciens affiliés à cette pharmacie et à l'admin.
 *  La disponibilité (available) est calculée automatiquement par le trigger
 *  trg_sync_stock_available (quantity > 0 -> available = true).
 *  Contrainte unique   (pharmacy_id, medicament_id)    -   Doublon retourne 409.
 * 
 *  BODY JSON   :
 *      pharmacie_id    uuid    requis
 *      medicament_id   uuid    requis
 *      quantity        integer requis      -   >= 0
 *      price           number  optionnel   -   >= 0
 * 
 * ---------------------------------------------------------------------
 *  HANDLER 3   -   updateStock()   :   PUT /stocks
 * ---------------------------------------------------------------------
 *  Modifie la quantité et/ou le prix d'un stock existant.
 *  Réservé aux pharmaciens affiliés et à l'admin.
 *  Le trigger trg_sync_stock_available recalcule available automatiquement.
 * 
 *  BODY JSON   :
 *      stock_id        uuid    requis
 *      quantity        integer optionnel   -   >= 0
 *      price           number  optionnel   -   >= 0
 * 
 *  POLITIQUES RLS ACTIVES  :
 *      -   "All users can stock availability" FOR SELECT (pharmacie validate+erxist)
 *      -   "Pharmacien and admin read own stock" FOR SELECT (accès complet)
 *      -   Pas de RLS FOR INSERT/UPDATE    ->  Vérification TypeScript + client admin
 *  TRIGGER :
 *      -   trg_sync_stock_available    :   Recalcule available et update_at à chaque INSERT/UPDATE
 * 
 * =====================================================================
 */

import { supabase }                         from "@/supabaseClient.ts";
import { getAdminClient, getAdminSecret }   from "@/supabaseAdminClient.ts";
import {
    extractToken,
    getAuthenticatedUser,
    requireRole,
    successResponse,
    errorResponse,
    AuthenticatedUser,
}                                           from "@/middleware/auth.ts";

// =====================================================================
//  Utilitaire interne  -   Vérification affiliation pharmacien
// =====================================================================

/**
 * Vérifie que l'utiisateur est admin ou pharmacien affilié à la pharmacie cible.
 * 
 * @param user          Profil authentifié
 * @param pharmacieId   UUID de la pharmacie cible
 * @param adminClient   Client admin Supabase
 * @returns             true si autorisé   
 */
async function isStockAutorized(
    user:           AuthenticatedUser,
    pharmacieId:    string,
    //  deno-lint-ignore no-explicit-any
    adminClient: any
): Promise<boolean> {
    if (user.role === "admin") return true;

    if (user.role === "pharmacien") {
        //  Pharmacien must be affilied to one pharmacy
        const { data } = await adminClient
            .from("pharmacien")
            .select("pharmacie_id")
            .eq("user_id", user.id)
            .eq("pharmacy_id",pharmacieId)
            .single();
        return !!data;
    }

    return false;
}

// =====================================================================
//  HANDLER 1   -   Consulter le stock d'une pharmacie
// =====================================================================

/**
 * Gère GET /stocks?pharmacie_id=<uuid>
 * 
 * @param req   Requête HTYTP entrante
 * @returns     Response JSON standardisée
 */
export async function getStock(req: Request): Promise<Response> {

    //  --- Etape 1 :   Extraction du parmaètre obligatoire ------------
    const url           =   new URL(req.url);
    const pharmacieId   = url.searchParams.get("pharmacie_id")?.trim()  ??  null;

    if (!pharmacieId) {
        return errorResponse("Le paramètre 'pharmacie_id' est obligatoire.", 400);
    }

    //  --- Etape 2 :   Détermination du niveau d'accès ----------------
    //  JWT optionnel   -   Si présent et valide, accès complet pour pharmacien/admin.
    //  Sans JWT ou rôle insuffisant    -> vue publique (stock_public_view).
    const token = extractToken(req);
    let isPrivileged = false;

    if (token) {
        const authResult = await getAuthenticatedUser(token);
        if (!("error" in authResult)) {
            const user = authResult.user;

            if (user.role === "admin") {
                //  Admin   :   accès complet sur toutes les pharmacies
                isPrivileged = true;
            } else if (user.role === "pharmacien") {
                //  Pharmacien  :   accès complet uniquement sur sa propre pharmacie
                const adminResult = getAdminClient(getAdminSecret(), "admin");
                if(!("error" in adminResult)) {
                    isPrivileged = await isStockAutorized(user, pharmacieId, adminResult.client);
                }
            }
        }
    }

    //  --- Etape 3 :   Requête selon le niveau d'accès ---------------
    if (isPrivileged) {
        //  Accès complet   :   Quantité, prix, update_at inclus
        const adminResult = getAdminClient(getAdminSecret(), "admin");
        if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);

        const { data: stock, error } = await adminResult.client
            .from("stockMedicament")
            .select("stock_id, medicament_id, pharmacy_id, quantity, price, available, update_at, create_at")
            .eq("pharmacy_id", pharmacieId)
            .order("created_at", { ascending: false });

        if (error) return errorResponse("Impossible de récupérer le stock.", 500);

        return successResponse(
            stock ?? [],
            `${stock?.length ?? 0} entrée de stock.`,
            200
        );
    } else {
        //  Accès public    :   Vue limitée via stock_public_view
        //  Client ANON -   RLS "All users can see stock availability"
        //  (Seules les pharmacies validate=true AND exist=TRUE sont exposées)
        const { data: stock, error } = await supabase
            .from("stock_public_view")
            .select("stock_id, medicament_id, pharamcy_id, available")
            .eq("pharmacy_id", pharmacieId);

        if (error) return errorResponse("Impossible de récupérer la disponibilité du stock.", 500);

        return successResponse(
            stock ?? [],
            `${stock?.length ?? 0} médicament(s) en stock.`,
            200
        );
    }
}

// ===================================================================
//  HANDLER 2   -   Ajouter un médicament au stock
// ===================================================================

/**
 * Gère POST /stocks.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function addStock(req: Request): Promise<Response> {

    //  --- Garde 1 :   JWT requis  -----------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentiication requise.", 401);

    //  --- Garde 2 :   Session active  -------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;
    
    //  --- Garde 3 :   Rôle admin/pharmacien   -----------------------
    if (!requireRole(user, ["admin", "pharmacien"])) {
        return errorResponse("Accès refusé.", 403);
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  -----------
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const pharmacieId   =   typeof  body.pharmacie_id   === "string"    ? body.pharmacie_id.trim()  : null;
    const medicamentId  =   typeof  body.medicament_id  === "string"    ? body.medicament_id.trim() : null;
    const quantity      =   typeof  body.quantity       === "number"    ? body.quantity             : null;
    const price         =   typeof  body.price          === "number"    ? body.price                : null;

    if (!pharmacieId)       return errorResponse("Champ 'pharmacie_id' obligatoire.", 400);
    if (!medicamentId)      return errorResponse("Champ 'medicament_id' obligatoire.", 400);
    if (quantity === null)  return errorResponse("Le champ 'quantity' est obligatoire.", 400);

    if (!Number.isInteger(quantity) || quantity < 0) {
        return errorResponse("Le champ 'quantity' doit être un entier >= 0.")
    }
    if (price !== null && price < 0) {
        return errorResponse("Le champ 'price' ne peut pas être < 0.", 400);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    //  --- Garde 4 :   Vérification affiliation pharamcien -----------
    const authorized = await isStockAutorized(user, pharmacieId, adminClient);
    if (!authorized) {
        return errorResponse("Vous n'êtes pas affilié à cette pharmacie.", 403);
    }

    //  --- Etape 2 :   Insertion dans stockMedicament  ---------------
    //  Pas de RLS FOR INSERT sur stockMedicament -> client admin requis
    //  Le trigger trg_sync_stock_available calcule available et update_at automatiquement
    //  update_at est fourni ici car la colonne est NOT NULL    -> le trigger l'écrasera.
    const { data: stock, error: insertError } = await adminClient
        .from("stockMedicament")
        .insert({
            pharmay_id:     pharmacieId,
            medicament_id : medicamentId,
            quantity:       quantity,
            price:          price ?? null,
            update_at:      new Date().toISOString(),
        })
        .select("stock_id, medicament_id, pharmacy_id, quantity, price, available, update_at, create_at")
        .single();

    if (insertError || !stock) {
        if (insertError?.message?.includes("duplicate key")) {
            return errorResponse(
                "Ce médicament est déjà enregistré dans le stock de la pharmacie. Veuillez modifier la quantité.",
                409
            );
        }
        if (insertError?.message?.includes("check")) {
            return errorResponse("Quantité ou prix invalide (valeur négative).", 400);
        }
        return errorResponse("Impossible d'ajouter le médicament au stock.", 500);
    }

    return successResponse(stock, "Médicament ajouté avec succès.", 201);
}

// ====================================================================
//  HANDLER 3   -   Modifier une entrée de stock
// ====================================================================

/**
 * Gère PUT /stocks.
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function updateStock(req: Request): Promise<Response> {
    
    // ---  Garde 1 :   JWT requis  -----------------------------------
    const token = extractToken(req);
    if (!token) return errorResponse("Authentification requise.", 401);

    // ---  Garde 2 :   Session active  -------------------------------
    const authResult = await getAuthenticatedUser(token);
    if ("error" in authResult) return errorResponse(authResult.error, authResult.status);
    const user = authResult.user;

    // ---  Garde 3 !   Rôle admin / pharmacien -----------------------
    if (requireRole(user, ["admin", "pharmacien"])) {
        return errorResponse("Accès non autorisé.", 403)
    }

    // ---  Etape 1 :   Lecture et validation du body JSON  -----------
    let body: Record<string, unknown>;
    try{
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    const stockId   = typeof body.stock_id  === "string" ? body.stock_id.trim() : null;
    const quantity  = typeof body.quantity  === "number" ? body.quantity        : null;
    const price     = typeof body.price     === "number" ? body.price           : null;

    if (!stockId) return errorResponse("Le champ 'stock_id' est obligatoire.", 400);

    if (quantity === null && price === null) {
        return errorResponse("Fournissez au moins un champ à modifier : 'quantity' ou 'price'.", 400);
    }
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) {
        return errorResponse("Le champ 'quantity' doit être un entier positif.", 400);
    }
    if ( price !== null && price < 0) {
        return errorResponse("Le champ 'price' doit être positif.", 400);
    }

    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) return errorResponse("Erreur de configuration serveur.", 500);
    const adminClient = adminResult.client;

    // ---  Etape 2 :   Chargement du stock pour vérifier l'affiliation
    //  On récupère pharmacy_id pour vérifier que le pharmacien est bien affilié
    //  à la pharmacie propriétaire de ce stock
    const { data: existingStock, error: findError } = await adminClient
        .from("stockMedicament")
        .select("stock_id, pharmacy_id")
        .eq("stock_id", stockId)
        .single();

    if (findError || !existingStock) {
        return errorResponse("Entrée de stock introuvable.", 404);
    }

    // ---  Garde 4 :   Vérification affiliation pharmacien -----------
    const authorized = await isStockAutorized(user, existingStock.pharmacy_id, adminClient);
    if (!authorized) {
        return errorResponse("Vous n'avez pas accès à ce stock.", 403);
    }

    // ---  Etape 3 :   Construction des champs à mettre à jour -------
    const updates: Record<string, unknown> = {};
    if (quantity !== null) updates.quantity = quantity;
    if (price   !== null) updates.price = price;
    
    // ---  Etape 4 :   Mise à jour dans stockMedicament    -----------
    //  Le trigger trg_sync_stock_available recalcule automatiquement available et update_at automatiquement.
    const { data: updated, error: updateError } = await adminClient
        .from("stocjkMedicament")
        .update(updates)
        .eq("stock_id", stockId)
        .select("stock_id, medicament_id, pharmacy_id, quantity, price, available, update_at, create_at")
        .single();

    if (updateError || !updated) {
        return errorResponse("Impossible de mettre à jour le stock.", 500);
    }

    return successResponse(updated, "Stock mis à jour avec succès.", 200);
}