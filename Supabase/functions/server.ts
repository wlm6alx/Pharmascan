/**
 * ==================================================================================================================
 * server.ts    -   Point d'entrée principal du back-end API Pharmascan
 * ==================================================================================================================
 * 
 * Rôle:
 *  Ce fichier est le seul point d'entrée de l'application vers la base de données.
 *  Il reçoit toutes de requêtes HTTP et les redirige vers le handler
 * (bonne destination de la base de donnée) appropriée selon la méthode HTTP et
 *  le chemin (pathname).
 * 
 * ARCHITECTURE GENERALE:
 * 
 *  Client HTTP (Flutter, React, ...)
 *          |
 *          |   POST /auth/login    { username, password }
 *          ▼
 *  ------------------------
 *  |       server.ts       |   <-  Ce fichier
 *  |   Router principal    |
 *  ------------------------
 *              |
 *              |
 *  -----------------------------------------
 *  |   Extraction method + pathname        |
 *  |   Gestion OPTIONS (CORS preflight)    |
 *  |   Routing vers le handler approprié   |
 *  -----------------------------------------
 *              |
 *              |
 *              ▼
 *  -------------------------------------------------
 *  |   Handler (ex: loginUser.ts)                  |
 *  |       1 extractionToken                       |
 *  |       2 getAuthenticatedUser / veri non-auth  |
 *  |       3 Logique métier                        |
 *  |       4 successReponse / errorResponse        |
 *  -------------------------------------------------
 * 
 *  NOTES SUR LES TABLES MEDICAMENT ET QR_CODE:
 *      QR_Code:
 *          - Aucun client (même authentifié) ne peut lire ou écrire directement sur 
 *            cette table. Seules les fonctions SQL SECURITY DEFINER y accèdent.
 *          - L'INSERT direct dans QR_Code depuis le code TypeScript est impossible.
 *            Le QR Code doit être créé AVANT d'appeler create_medicament(), via une
 *            fonction SQL dédiée ou une route d'administration séparée.
 * 
 *      medicament:
 *          - SECURITY DEFINER : La vérification d'autorisation est faite en SQL. Tout
 *            pharmacien (même sans pharmacie assignée) OU admin peut créer. La route
 *            POST /admin/medicaments appelle cette fonction via .rpc(). 
 * 
 *          - Prend le PATH du QR Code (texte, pas l'UUID) et retourne :
 *              { is_valid, name, categorie, fabrication_date, expiration_date }
 *          - La route GET /medicaments/scan appelle cette fonction avec ?qr_path=<texte>.
 * 
 *          - RLS "Pharmacien or admin can create medicament" FOR INSERT:
 *              Tout pharmacien (sans condition d'affiliation) OU admin.
 * 
 * 
 *  LISTE COMPLETE DES ROUTES (39 endpoints):
 * 
 *  --- Authentiication ---------------------------------------------------------------------------------------------
 *      POST    /auth/register          Inscription user (par défaut patient)
 *      POST    /auth/login             Connexion username + password
 *      POST    /auth/reset-password    Demande de reset le password par email
 *      POST    /auth/update-password   Mise à jour du mot de passe
 * 
 *  --- Utilisateurs ------------------------------------------------------------------------------------------------
 *      GET     /users/me           Profil de l'utilisateur connecté
 *      GET     /users/profile      Profil d'un utilisateur par username (admin)
 *      PUT     /users/me           Mise à jour nom/prénom/téléphone/username
 *      POST    /users/patient      Création du profil patient
 *      POST    /users/pharmacien   Création du profil pharmacien
 * 
 *  --- Adaministration des utilisateurs ----------------------------------------------------------------------------
 *      POST    /admin/create       Création du compte admin
 *      POST    /admin/reset        Réinitialisation du compte admin
 *      PUT     /admin/user/state  Activation/desactivation d'un comtpe user (automatique) (connecté ou pas)
 * 
 *  --- Justificatifs pharmacien ------------------------------------------------------------------------------------
 *      POST    /justificatifs/pharmacien   Upload document justificatif  
 *      PUT     /justificatifs/pharmacien   Remplacement du document
 *      DELETE  /justificatifs/pharmacien   Suppression du document
 * 
 *  --- Justificatifs pharmacie -------------------------------------------------------------------------------------
 *      POST    /justificatifs/pharmacie   Upload document justificatif pharmacie 
 *      PUT     /justificatifs/pharmacie   Remplacement du document
 *      DELETE  /justificatifs/pharmacie   Suppression du document
 * 
 *  --- Pharmacies --------------------------------------------------------------------------------------------------
 *      POST    /pharmacie                  Créer une pharmacie (gérant)
 *      GET     /pharmacie                  Liste des pharmaciens publiques
 *      GET     /pharmacie/detail           Détails d'une pharmacie
 *      PUT     /pharmacie                  Modifier nom/téléphone
 *      PATCH   /pharmacie/status           Changer de statut open/close
 * 
 *  --- Administration des pharmacies -------------------------------------------------------------------------------
 *      POST    /admin/pharmacie/validate   Valider la création d'une pharmacie
 *      POST    /admin/pharmacie/refuse     Refuser la création d'une pharmacie
 *      DELETE  /admin/pharmacie            Désactiver/Supprimer un pharmacie
 * 
 *  --- Gestion des membres d'une pharmacie -------------------------------------------------------------------------
 *      POST    /pharmacie/join-key         Générer une clé d'invitation
 *      POST    /pharmacie/join             Rejoindre via une clé
 *      POST    /pharmacie/resign           Quitter sa pharmacie
 *      DELETE  /pharmacie/member           Exclure un pharmacien (gérant)
 * 
 *  --- Médicaments -------------------------------------------------------------------------------------------------
 *      GET     /medicaments                Liste publique des médicaments
 *      GET     /medicaments/detail         Détails d'un médicament
 *      GET     /medicaments/scan           Scanner un QR code / Vérifier un médicament par chemin QR()
 *                                          (?qr_path=<texte>) via verify_medicament_by_QR()
 *      POST    /admin/medicaments          Créer un médicament via create_medicament() (type de médicament) ou via create_qr_code() (medicament individuel appartenant à la table medicament)
 *                                          (admin et pharmaciens dans une pharmacie)
 *      PUT     /admin/medicaments          Modifier un médicament (admin et pharmaciens dans une pharmacie)
 * 
 *  --- Stocks ------------------------------------------------------------------------------------------------------
 *      GET     /stocks                     Consulter le stock d'une pharmacie
 *      POST    /stocks                     Afouter un médicament au stock
 *      PUT     /stocks                     Modifier quantité/prix du stock
 * 
 *  --- Patients ----------------------------------------------------------------------------------------------------
 *      GET     /patients/me                Profil patient de l'utilisateur
 *      PUT     /patients/me                Modifier le profil patient
 *      PUT     /patients/private           Modifier les données privées
 * 
 * 
 * ==================================================================================================================
 */

//  import { serve } from "https://deno.land/std@0.95.0/http/server.ts";

//  --- Imports des utilitaires middleware --------------------------------------------------------------------------
import { corsPreflightResponse, errorResponse } from "@/middleware/auth.ts";

//  ----------- Imports des handlers - Authentiication --------------------------------------------------------------
import { registerUser }                         from "@/routes/auth/registerUser.ts";
import { loginUser }                            from "@/routes/auth/loginUser.ts";
import { resetPassword }                        from "@/routes/auth/resetPassword.ts";
import { updatePassword }                       from "@/routes/auth/updatePassword.ts";

//  ------------ Imports des handlers - Utilisateurs ----------------------------------------------------------------
import { getUser }                              from "@/routes/users/getUser.ts";
import { updateUser }                           from "@/routes/users/updateUser.ts";
import { createPatient }                        from "@/routes/users/createPatient.ts";
import { createPharmacien }                     from "@/routes/users/createPharmacien.ts";

//  ----------- Imports des handlers - Administration des utilisateurs ----------------------------------------------
import { createAdmin }                          from "@/routes/users/createAdmin.ts";
import { resetAdmin }                           from "@/routes/users/resetAdmin.ts";
import { tooggleUserState }                     from "@/routes/users/toogleUserState.ts";

//  ------------- Imports des handlers - Justiicatis pharmacien -----------------------------------------------------
import { createJustifPharmacien }               from "@/routes/justificatifs/Pharmacien/createJustifPharmacien.ts"; 
import { updateJustifPharmacien }               from "@/routes/justificatifs/Pharmacien/updateJustifPharmacien.ts";
import { deleteJustifPharmacien }               from "@/routes/justificatifs/Pharmacien/deleteJustifPharmacien.ts";

//  -------------- Imports des handlers - Justiicatis pharmacie -----------------------------------------------------
import { createJustifPharmacie }                from "@/routes/justificatifs/Pharmacie/createJustifPharmacie.ts";
import { updateJustifPharmacie }                from "@/routes/justificatifs/Pharmacie/updateJustifPharmacie.ts";
import { deleteJustifPharmacie }                from "@/routes/justificatifs/Pharmacie/deleteJustifPharmacie.ts";

//  ---------- Imports des handlers - Pharmacies --------------------------------------------------------------------
import { createPharmacie }                      from "@/routes/pharmacie/createPharmacie.ts";
import { listPharmacies }                       from "@/routes/pharmacie/listPharmacies.ts";
import { getPharmacie }                         from "@/routes/pharmacie/getPharmacie.ts";
import { updatePharmacie }                      from "@/routes/pharmacie/updatePharmacie.ts";
import { updateStatusPharmacie }                from "@/routes/pharmacie/updateStatusPharmacie.ts";

//  ---------- Imports des handlers - Administration pharmacies -----------------------------------------------------
import {
    adminValidatePharmacie,
    adminRefusePharmacie,
    adminDeletePharmacie,
}                                               from "@/routes/pharmacie/adminPharmacie.ts";

//  ---------- Import des handlers - Membres pharmacie --------------------------------------------------------------
import {
    requestJoinKey,
    joinPharmacie,
    resignPharmacie,
    removeMember,
}                                               from "@/routes/pharmacie/joinPharmacie.ts";

//  ---------- imports des handlers - Medicaments -------------------------------------------------------------------
import { listMedicament }                       from "@/routes/medicaments/listMedicaments.ts";
import { getMedicament, scanQRCode }            from "@/routes/medicaments/getMedicament.ts";
import {
    createMedicament
    createMedicamentType,
    updateMedicament,
}                                               from "@/routes/medicaments/medicamentsAdmin.ts";

//  ---------- Imports des handlers - Stock -------------------------------------------------------------------------
import {
    getStock,
    addStock,
    updateStock,
}                                               from "@/routes/stock/stock.ts";

//  ---------- Import des handlers - Patients -----------------------------------------------------------------------
import {
    getPatient,
    updatePatient,
    updatePatientPrivate,
}                                               from "@/routes/patients/patients.ts";

//  =================================================================================================================
//  SERVEUR DENO - Démarrage et routing
//  =================================================================================================================

/**
 * Deno.serve() démarre le serveur HTTP qui écoute sur le port défini
 * par la variable d'environnement PORT (injectée par Supabase Edge Functions).
 * 
 * Chaque requête HTTP entrante est traitée par la fonction fléchée asynchrone.
 * La fonction retourne toujours une Response - jamais undefined. 
 */
Deno.serve(async (req: Request): Promise<Response> => {

    //  -- Extraction des informations de la requête ----------------------------------------------------------------
    //
    //  method      : "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
    //  url         : URL complète (ex: https://xyz.supabase.co/functions/v1/api/auth/login)
    //  pathname    : Chemin seul (ex: /auth/login)
    const method: string = req.method;
    const url: URL = new URL(req.url);
    const pathname: string = url.pathname;

    //  --  Gestion du CORS preflight (OPTIONS) ---------------------------------------------------------------------
    //
    //  Le snavigateurs envoient une requête OPTIONS avant toutes requête
    //  cross-origin (depuis un domaine différent). Cette réponse vide avec les headers
    //  CORS permet au navigateur de procéder
    //
    //  WARNING: Doit être la PREMIERE vérification - avant tout autre traitement.
    if (method == "OPTIONS")
        return corsPreflightResponse();

    //  --  Logging de la requête (développement uniquement) --------------------------------------------------------
    //
    //  WARNING: Désactiver ou filtrer en procudtion pour éviter de logger des données
    //      sensibles (tokens, passwords dans les body).
    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

    //  =============================================================================================================
    //  ROUTING  - Association pathname x method -> handler
    //  =============================================================================================================
    //
    //  Chaque bloc if/else if vérifie:
    //      1. Le pathname exact (correspondance de chaîne)
    //      2.  La méthode HTTP attendue
    //
    //  Si la méthode ne correspond pas au pathname, on retourne 405.
    //  Si aucun pathname ne correspond, on retourne 404 en bas de fichier.

    try {

        // ----------------------------------------------------------------------------------------------------------
        //  BLOC 1 - Authentification
        //      Routes sans JWT requis -    Chaque handler vérifie que l'user n'est pas 
        //      déjà connecté avant d'exécuter
        //  ---------------------------------------------------------------------------------------------------------

        if (pathname === "/auth/register") {
            //  POST uniquement - inscription d'un nouvel utilisateur
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await registerUser(req);
        }
        else if (pathname === "/auth/login") {
            //  POST uniquement - connexion avec username + password
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await loginUser(req);
        }
        else if (pathname === "/auth/reset-password") {
            //  POST uniquement - demande de réinitialisation par email
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await resetPassword(req);
        }
        else if (pathname === "/auth/update-password") {
            //  POST uniquement - mise à jour du mot de passe (avec token ou JWT)
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await updatePassword(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 2 - Profil utilisateur
        //  ---------------------------------------------------------------------------------------------------------
        
        else if (pathname === "/users/me") {
            if (method === "GET")       return await getUser(req, "me");
            if (method === "PUT")       return await updateUser(req);
            return methodNotAllowed(method, pathname);
        }

        else if (pathname === "/users/profile") {
            //  GET uniquement - Conultation d'un profil par username
            if (method !== "GET")       return methodNotAllowed(method, pathname);
            return await getUser(req, "profile");
        }

        else if (pathname === "/users/patient") {
            //  POST uniquement - création du profil patient étendu
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await createPatient(req);
        }

        else if (pathname === "/uses/pharmacien") {
            //  POST uniquement - création du profil pharmacien
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await createPharmacien(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 3  - Administration des utilisaterus
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/admin/create") {
            //  POST uniquement - Création de l'administrateur
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await createAdmin(req);
        }

        else if (pathname === "/admin/reset") {
            //  POST uniquement - Réinitialisation complète du compte admin
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await resetAdmin(req);
        }

        else if (pathname === "/admin/user/state") {
            //  PUT uniquement - Activer ou desactuver un compte utilisateur
            if (method !== "PUT")       return methodNotAllowed(method, pathname);
            return await tooggleUserState(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 4  -   Justificatifs pharmacien
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/justificatifs/pharmacien") {
            if (method === "POST")      return await createJustifPharmacien(req);
            if (method === "PUT")       return await updateJustifPharmacien(req);
            if (method === "DELETE")    return await deleteJustifPharmacien(req);
            return methodNotAllowed(method, pathname);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 5 -   Justificatifs pharmacie
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/justificatifs/pharmacie") {
            if (method === "POST")      return await createJustifPharmacie(req);
            if (method === "GET")       return await listPharmacies(req);
            if (method === "PUT")       return await updatePharmacie(req);
            return methodNotAllowed(method, pathname);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 6 -   Pharmacies (CRUD)
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/pharmacie") {
            if (method === "POST")      return await createPharmacie(req);
            if (method === "GET")       return await listPharmacies(req);
            if (method === "PUT")       return await updatePharmacie(req);
            return await methodNotAllowed(method, pathname);
        }

        else if (pathname === "/pharmacie/detail") {
            //  GET uniquement - Détails d'une pharmacie spécifique
            if (method !== "GET")       return methodNotAllowed(method, pathname);
            return await getPharmacie(req);
        }

        else if (pathname === "/pharmacie/status") {
            //  PATCH uniquement - Changer le statut open/close
            if (method !== "PATCH")     return methodNotAllowed(method, pathname);
            return await updateStatusPharmacie(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 7  -   Administration des pharamcies
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/admin/pharmacie/validate") {
            //  POST uniquement - Valider une pharmacie en attente
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await adminValidatePharmacie(req);
        }

        else if (pathname === "/admin/pharmacie/refuse") {
            //  POST uniquement - Refuser une pharmacei en attente
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await adminRefusePharmacie(req);
        }

        else if (pathname === "/admin/pharmacie") {
            //  DELETE uniquement - Desactiver une pharmacie existente
            if (method !== "DELETE")    return methodNotAllowed(method, pathname);
            return await adminDeletePharmacie(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 8 -    Gestion des membres d'une pharmacie
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/pharmacie/join-key") {
            //  POST uniquement - Générer une clé d'invitation (gérant)
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await requestJoinKey(req);
        }

        else if (pathname === "/pharmacie/join") {
            //  POST uniquement - Rejoindre une pharmacie via clé d'invitation
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await joinPharmacie(req);
        }

        else if (pathname === "/pharmacie/resign") {
            //  POST unqiuement - Quitter sa pharmacie actuelle
            if (method !== "POST")      return methodNotAllowed(method, pathname);
            return await resignPharmacie(req);
        }

        else if (pathname === "/pharmacie/member") {
            //  DELETE uniquement - Exclure un pharmacien (gérant uniquement)
            if (method !== "DELETE")    return methodNotAllowed(method, pathname);
            return await removeMember(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 9 -    Médicaments
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/medicaments") {
            //  GET uniquement - Liste publique des médicaments visibles
            if (method !== "GET")       return methodNotAllowed(method, pathname);
            return await listMedicament(req);
        }

        else if (pathname === "/medicaments/detail") {
            //  GET uniquement - Détail d'un médicament par 
            if (method !== "GET")       return methodNotAllowed(method, pathname);
            return await getMedicament(req);
        }

        else if (pathname === "/medicaments/scan") {
            //  GET uniquement - Scanner un QR_code pour identifier un médicament
            if (method !== "GET")       return methodNotAllowed(method, pathname);
            return await scanQRCode(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 10 -   Administration des médicaments
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/admin/medicaments") {
            if (method === "POST")      return await createMedicament(req);
            if (method === "POST")      return await createMedicamentType(req);
            if (method === "PUT")       return await updateMedicament(req);
            return methodNotAllowed(method, pathname);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 11 -   Stocks
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/stocks") {
            if (method === "GET")       return await getStock(req);
            if (method === "POST")      return await addStock(req);
            if (method === "PUT")       return await updateStock(req);
            return methodNotAllowed(method, pathname);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  BLOC 12 -   Patients
        //  ---------------------------------------------------------------------------------------------------------

        else if (pathname === "/patients/me") {
            if (method === "GET")       return await getPatient(req);
            if (method === "PUT")       return await updatePatient(req);
            return methodNotAllowed(method, pathname);
        }

        else if (pathname === "/patients/private") {
            //  PUT uniquement - Modifier les données privées du patient
            if (method !== "PUT")       return methodNotAllowed(method, pathname);
            return await updatePatientPrivate(req);
        }

        //  ---------------------------------------------------------------------------------------------------------
        //  FALLBACK - Route non trouvée (404)
        //  ---------------------------------------------------------------------------------------------------------
        //
        //  Si aucun bloc ci-dessus n'a matché, le pathame retourne 404.
        else {
            return errorResponse(
                `Route introuvable : ${method} ${pathname}`,
                404
            );
        }

    } catch (err: unknown) {
        //  --  Gestionnaire d'erreurs global -----------------------------------------------------------------------
        //
        //  Attaque toutes les erreurs non gérées par les hjandlers.
        //  Retourne un réponse 500 générique sans révéler les détails internes.
        //
        //  Le log console.error est pour les logs Supabase (Dashboard -> Logs)
        //  et non pour les clients HTTP.
        console.error(
            `[server.ts] Erreur non gérée sur ${method} ${pathname}:`,
            err instanceof Error ? err.message : String(err)
        );

        return errorResponse(
            "Une erreur interne est survenue. Réessayez plus tard.",
            500
        );
    }
});

//  =================================================================================================================
//  Utilitaires internes au serveur
//  =================================================================================================================

/**
 * Returne une réponse 405 Method Not Allowed.
 * 
 * Appelée quand un pathname correspond à une route existante, mais que la méthode
 * HTTP n'est pas supportée par cette route.
 * Ex: GET /auth/login -> 405 (seul POST est autorisé)
 * 
 * @param method   Méthode HTTP reçue (ex: "GET")
 * @param pathname Chemin demandé (ur le message d'erreur).
 */
function methodNotAllowed(method: string, pathname: string): Response {
    return new errorResponse(
        `Méthode ${method} non autorisée sur ${pathname}.`,
        405
    );
}
