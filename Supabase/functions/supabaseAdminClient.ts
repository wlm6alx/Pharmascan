/**
 * ======================================================================
 *  supanbaseAdminClient.ts -   Client Supabase ADMIN (RLS contournées)
 * ======================================================================
 * 
 * ROLE :
 *  Fournit le client Supabase utilisant la clé SERVICE_ROLE_KEY.
 *  Ce client bypass complètement les politiques RLS - il a un accès
 *  total et non restreint à toutes les tables de la base de données.
 * 
 * WARING:  USAGE STRICTEMENT LIMITE A:
 *  -   Création du premier admin (seeding) via createAdmin.ts
 *  -   Réinitialisation des credentials admin via resetAdmin.ts
 *  -   Chargement du profil utilisateur dans le middleware auth.ts
 *      (opération interne avant que le client authentifié soit disponible)
 *  -   Rollback de comptes orphelins (auth;users sans public.users)
 * 
 * POURQUOI UNE FACTORY ET NON UN SINGLETON :
 *  Le client admin est protégé par ADMIN_CLIENT_SECRET ou DB_RESET_SECRET 
 *  selon la route. La factory getAdminClient() force l'appelant à fournir 
 *  explicitement le secret vérifié en amont - évite toute utilisation 
 *  accidentelle sans vérification préalable du secret.
 * 
 * SECRETS REQUIS (définis via supabase secrets set)    :
 *  -   SERVICE_ROLE_KEY        :   Clé Supabase - Settings -> API Keys -> Secret key
 *  -   ADMIN_CLIENT_SECRET     :   protection routes admin/* (min 32 chars)
 *  -   DB_RESET_SECRET         :   protection de route /admin/reset(min 48 chars)
 * 
 * ======================================================================
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

//  --- Lecture des variables d'environnement   -------------------------
//
//  Ces 3 variables sont défines dans la CLI 
//      (SERVICE_ROLE_KEY, ADMIN_CLIENT_SECRET et DB_RESET_SECRET)
//
//  Elles ne sont jamais incluses dans le code source.
//  SUPABASE_URL est réutilisée ici - injectée automatiquement par Supabase/

//  Clé SERVICE_ROLE - bypass total des RLS.
const SERVICE_ROLE_KEY: string = Deno.env.get("SERVICE_ROLE_KEY")!;

//  URL du projet Supabase - injectée automatiquement par Supabase Edge Functions.
const SUPABASE_URL: string = Deno.env.get("SUPABASE_URL")!;

//  Secret protégeant les routes /admin/* - min 32 chars.
const ADMIN_CLIENT_SECRET: string = Deno.env.get("ADMIN_CLINT_SECRET")!;

//  Secret protégeant la route /admin/reset - min 48 chars.
const DB_RESET_SECRET: string = Deno.env.get("DB_RESET_SECRET")!;

//  --- Guard de démarrage  ---------------------------------------------
//
//  Vérifie la présence de toutes les variables critiques au démarrage.
//  Un secret manquant est détecté immédiatement plutôt qu'en cours d'exécution.
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_CLIENT_SECRET || !DB_RESET_SECRET) {
    throw new Error (
        "[supabaseAdminClient]  Variables d'environnement manquantes.\n" +
        `   SUPABASE_URL            : ${SUPABASE_URL ? " présente." : " MANQUANTE."}\n` +
        `   SERVICE_ROLE_KEY        : ${SERVICE_ROLE_KEY ? " présente." : " MANQUANTE."}\n` +
        `   ADMIN_CLIENT_SECRET     : ${ADMIN_CLIENT_SECRET ? " présente." : " MANQUANTE."}\n` +
        `   DB_RESET_SECRET         : ${DB_RESET_SECRET ? " présente." : " MANQUANTE."}\n` +
        "   Définir les secrets manquants via: supabase secrets set NOM=\"valeur\"",
    );
}

//  --- Options du client Admin -----------------------------------------
//
//  Même options stateless que supabaseClient.ts    -   l'Edge Function ne persiste
//  aucune session entre les requêtes.
const ADMIN_CLIENT_OPTIONS = {
    auth: {
        persistSession: false,
        detectSessionInUrl: false,
        autoRefresToken: false,
    },
};

// ======================================================================
//  EXPORT -    Factory de client admin
// ======================================================================

/**
 * Retourne le client Supabase admin après vérification du secret fourni.
 * 
 * POURQUOI UNE FACTORY :
 *  Forcer l'appelant à fournir et vérifier explicitement un secret avant
 *  d'obtenir le client admin. Evite toute utilisation accidentelle du client
 *  admin sans contrôle d'accès préalable.
 * 
 * QUELS SECRETS UTILISER   :
 *  -   Routes  /admin/create, /admin/user/*, /admin/pharmacie/*    -> ADMIN_CLIENT_SECRET
 *  -   Route   /admin/reset                                        -> DB_RESET_SECRET
 *  -   Middleware auth.ts (chargement profil)                      -> ADMIN_CLIENT_SECRET
 * 
 * @param provideSecret Secret fourni par l'appelant (extrait du header ou de l'env).
 *                      Sera comapré à ADMIN_CLIENT_SECRET ou DB_RESET_SECRET
 *                      selon le contexte d'appel.
 * 
 * @param secretType    Type de secret à vérifier (défaut : "admin").
 *                      "admin" -> ADMIN_CLIENT_SECRET
 *                      "reset" -> DB_RESET_SECRET
 * 
 * @returns             { client: SupabaseClient } si le secret est valide
 *                      { error: string } si le secret est invalide
 * 
 * @example
 *  // Dans creaateAdmin.ts :
 *  const result = getAdminClient(providedSecret, "admin");
 *  if ("error" in result) return errorResponse(result.error, 401);
 *  const { client } = result;
 * 
 *  // Dans resetAdmin.ts   :
 *  const result = getAdminClient(provideSecret, "reset");
 *  if ("error" in result) return errorResponse(result.error, 401);
 *  const { client } = result:
 * 
 *  // Dans middleware/auth.ts  (chargement profil - pas de secret HTTP):
 *  const result = getAdminClient(ADMIN_CLIENT_SECRET, "admin");
 *  if ("error" in result) throw new Error(result.error);
 *  const { client } = result;
 */
export function getAdminClient(
    providedSecret: string,
    secretType: "admin" | "reset" = "admin",
): { client: SupabaseClient } | { error: string } {

    //  Sélectionne le secret de référence selon le type demandé
    const expectedSecret = secretType === "reset" ? DB_RESET_SECRET : ADMIN_CLIENT_SECRET;

    //  Compare le secret fourni avec la valeur attendue
    //  la comparaison directe est suffiante ici car les secrets sont longs
    //  et ne transitent jamais par des canaux non sécurisés (HHTPS uniquement)
    if (!providedSecret || providedSecret !== expectedSecret) {
        return {
            error: "Accès refusé. Secret invalide."
        };
    }

    //  Secret valide - Créer et retourner le client admin
    //  Un nouveau client est créé à chaque appel (stateless - pas de soingleton)
    return {
        client: createClient(SUPABASE_URL, SERVICE_ROLE_KEY, ADMIN_CLIENT_OPTIONS),
    };
}

// ======================================================================
//  EXPORT  -   Accesseutrs des secrets (lecture seule, usage interne)
// ======================================================================

/**
 * Retourne ADMIN_CLIENT_SECRET pour le middleware auth.ts.
 * 
 * Le middleware a besoin du client admin pour charger le proil utilisateur,
 * mais il n'a pas de secret HTTP à vérifier (c'est une opération interne).
 * Cet accesseur lui permet d'appeler getAdminClient() avec le bon secret 
 * sans avoir à lire Deno.env directement depuis le middleware.
 * 
 * @returns ADMIN_CLIENT_SECRET défini dans les secrets Supabase 
 */
export function getAdminSecret(): string {
    return ADMIN_CLIENT_SECRET;
}

/**
 * Retourne DB_RESET_SECRET pour resetAdmin.ts.
 * 
 * @returns DB_RESET_SECRET défini dans les secrets Supabase
 */
export function getResetSecret(): string {
    return DB_RESET_SECRET;
}