/**
 * ===============================================================================
 *  supabaseClient.ts - Client Supabase STANDARD (RLS actifs)
 * ===============================================================================
 * 
 *  ROLE :
 *      Fournit le client Supabase utilisé pour TOUTES les opérations
 *      effectuées au nom d'un utilisateur. Le spolitiques RLS (Row Level
 *      Security) définies dans PostgeSQL s'appliquent pleinement.
 * 
 *  DEUX EXPORTS :
 *      -------------------------------------------------------------------------
 *      |                               | Client anonyme                        |
 *      |   Supabase                    | Avant authentification uniquement     |
 *      |                               | Ex: vérifier si username est libre    |
 *      ------------------------------------------------------------------------- 
 *      |                               | Client portant le JWT de l'user       |
 *      |   createAuthenticatedClient() | Après login - RLS filtrent selon      |
 *      |                               | auth.uid() et auth.jwt()              |
 *      -------------------------------------------------------------------------
 * 
 *  DIFFERENCE AVEC supabaseAdminClient.ts:
 *      Ce fichier utilise la clé ANON (publique, sans droits élevés).
 *      supabaseAdminClient.ts utilise la clé SERVICE_ROLE qui contourne
 *      les RLS - accès réservé aux opérations administratives critiques.
 * 
 *  CONFIGURATION SUPABASE REQUISE (Secret Edge Functions) :
 *      Dashboard -> Edge Functions -> Secrets -> Ajouter :
 *          SUPABASE_URL        = https://<ref>.supabase.co
 *          SUPABASE_ANAON_KEY  = clé anon du dashboard
 * 
 * 
 * ===============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---  Lecture des variables d'environnement ------------------------------------
//
//  Ces variables sont injectées par Supabase au démarrage de l'Edge Function.
//  Elles ne sont jamais inclues dans le code source - uniquement dans les Secrets.
//
//  Le "!" (non-null assertion) indique à TypeScript que la valeur sera toujours
//  présente en production. Si elle est absente, le serveur crashera immédiatement
//  au démarrage avec un message d'erreur explicite - comportement souhaité pour 
//  détecter une mauvaise configuration au plus tôt.

/** URL du projet Supabase. Format : https://<projet-ref>.supabase.co */
const SUPABASE_URL: string = Deno.env.get("SUPABASE_URL")!;

/**
 * Clé anonyme publique
 * Elle est destinée aux clients publics (Web, mobile).
 * Elle a des droits restreints - Entièrement contrôlés par les RLS.
 * Visible dans : Dashboard -> Settings -> API -> Project API Keys -> anon/public
 */
const SUPABASE_ANON_KEY: string = Deno.env.get("SUPABASE_ANON_KEY")!;

// ---  Guard de démarrage  -----------------------------------------------------
//
//  Vérifie la présence des variables critiques au démarrage de l'Edge function.
//  Si l'une d'elles est absente, le serveur crash immédiatement avec un message
//  explicite plutôt que de produire des erreurs cryptiques lors des requêtes.
//
//  Note:   SERVICE_ROLE_KEY, ADMIN&_CLIENT_SECRET et DB_RESET_SECRET ne sont pas
//  vérifiés ici - ils appartiennent à supabaseAdminClient.ts et aux routes admin.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        "[supabaseClient] Variables d'environnement manquantes.\n" +
        `   SUPABASE_URL        :${SUPABASE_URL ? " présente." : " manquante."}\n` +
        `   SUPABASE_ANON_KEY   : ${SUPABASE_ANON_KEY ? "présente." : " manquante."}\n` +
        "   Ces variables sont injectées automatiquement par Supabase Edge Functions.\n" +
        "   Vérifier que la fonction est bien déployée sur Supabase.",
    );
}

// ---  Options communes aux deux clients ---------------------------------------
//
//  Les Edge Functions Deno sont stateless: Elles naissent, traitent une requête,
//  et meurent. Il n'y a donc aucune session à persisiter entre deux appels. Ces 
//  options désactivent tous les mécanismes de persistance. 
const SUPABASE_CLIENT_OPTIONS = {
    auth: {
        //  Pas de localStorage/coodie côté serveur
        persistSession: false,
        //  Inutilis côté serveur - évite des comportements inattendus
        detectSessionInUrl: false,
        //  L'Edge Function est courte: Pas besoin de rafraîchir les tokens
        autoRefreshToken: false,
    },
};

//===============================================================================
// EXPORT 1 -   Client anonyme partagé
//===============================================================================

/**
 * Client Supabase anonyme, sans identité utilisateur.
 * 
 *  A utiliser uniquement pour des opérations ne nécessitant pas d'authentification.
 *  Les RLS s'appliquent en mode "visiteur": Seules les données publiquement 
 *  accessibles sont visibles.
 * 
 * @usages
 *      - Vérifier si un username est disponible (register)
 *      - Résoudre un username en emaiil pour le login (avant auth)
 *      - Envoyer un email de reset de mot de passe (avant auth)
 *      - Lire les données publiques (liste de pharmacies validées)
 * 
 * @contre-exemple - NE PAS UTILISER pour:
 *      - Lire le profil d'un utilisateur connecté -> createAuthentificatedClient()
 *      - Toutes opérations d'écriture au nom d'un user -> createAuthenticatedClient()
 */
export const supabase: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_CLIENT_OPTIONS
);

//===============================================================================
//  EXPORT 2 -  Fabrique de clients authentifiés
//===============================================================================

/**
 *  Crée un client Supabase portant l'identité d'un utilisateur connecté.
 * 
 *  FONCTIONNEMENT :
 *      Le JWT Bearer de l'utilisateur est injecté dans le header HTTP
 *      "Authorization" de chaque requête envoyée à PostgREST (l'API REST
 *      auto-générée pas Supabase sur PostgreSQL).
 * 
 *      PostgREST décode ce JWT et expose deux fonctions SQL utilisées
 *      dans toutes les politiques RLS :
 *          -   auth.uid()  ->  UUID de l'utilisateur connecté
 *          -   auth.jwt()  -> Payload complet du JWT (contient le rôle custom)
 * 
 *      Ainsi, une requête comme:
 *          SELECT * FROM patients WHERE user_id = auth.uid()
 *      ...retourne uniquement les données de l'utilisateur porteur du JWT
 * 
 * @param token JWT extrait du header "Authorization: Bearer <token>"
 *              de la requête HTTP entrante.
 *              WARNING Passer le token NU, sans le préfixe "Bearer ".
 *  
 * @returns     Un SupabaseClient configuré pour cet utilisateur.
 *              Toutes les requêtes de ce client seront soumises aux RLS
 *              dans le contexte de l'utilisateur identifié par le token.
 * 
 * @example
 *  //  Dans un header de route :
 *  const token = req.headers.get("Autorization")?.replace("Bearer ", "") ?? "";
 *  const userClient = createAuthenticatedClient(token);
 * 
 *  //  Requête filtrée automatiquement par les RLS
 *  const { data } = await userClient.from("patients").select("*");
 *  //  -> uniquement les données de l'utilisateur identifié par le JWT
 */

export function createAuthenticatedClient(token: string): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        //  Injection du JWT dans tous les headers de requêtes sortantes.
        //  Ce header est lu par PostgREST pour identifier l'utilisateur
        //  et activer les politiques RLS correspondantes.
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        ...SUPABASE_CLIENT_OPTIONS,
    });
}