/**
 * =============================================================================
 * routes/auth/registerUser.ts  -   POST /auth/register
 * =============================================================================
 * 
 * Créer un compte utilisateur en 2 étapes atomiques:
 *  1 - Création dans auth.users via supabase.auth.admin.createUser()
 *  2 - Insertion du profil dans public.users (rôle patient par défaut)
 * 
 * Si l'étape 2 échoue, le compte auth est supprimé (rollback manuel)
 * Pour éviter les comptes orphelins (auth.users sans public.users).
 * 
 * BODY  ATTENDU JSON:
 *      name            string requis
 *      surname         string optionnel
 *      username        string requis, >= 3 chars, unique
 *      email           string requis, format email valide
 *      password        string requis >= 12 chars, maj+min+chiffre+special
 *      phone           string optionnel, format +XXXXX
 *      role            string optionnel, "admin" | "pharmacien" | "patient" | "user"
 * 
 * ACCES : Public - L'appelant ne doit pas être connecté.
 * =============================================================================
 */

import { getAdminClient, getAdminSecret }                               from "@/supabaseAdminClient.ts";
import { extractToken, 
    successResponse, 
    errorResponse}                                      from "@/middleware/auth.ts";
import { supabase }                                     from "@/supabaseClient.ts";
//  import { UserRole }                                     from "@/middleware/auth.ts";

//  
//  Handler principal
//

/**
 * Gère POST /auth/register.
 * 
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function registerUser(req: Request): Promise<Response> {
    //  --- Garde 0 :   Utilisateur déjà connecté   ?   ------------------------
    //  Si un token JWT est présent, l'utilisateur est déjà authentifié
    //  -> il ne doit pas pouvoir créer un nouveau compte depuis une session active
    const existingToken = extractToken(req);
    if (existingToken) {
        return errorResponse(
            "Vous êtes déjà connecté. Déconnectez-vous avant de créer un nouveau compte.",
            403
        );
    }

    //  --- Etape 1 :   Lecture et validation du body JSON  --------------------
    let body: Record<string, unknown>;
    try {
        //  Parsing du body - lève une exception si le JSON est malformé
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.",
            400
        );
    }

    //  Extraction et normalisation des champs
    const name          = typeof body.name      === "string" ?  body.name.trim()                : null;
    const username      = typeof body.username  === "string" ?  body.username.trim()            : null;
    const email         = typeof body.email     === "string" ?  body.email.trim().toLowerCase() : null;
    const password      = typeof body.password  === "string" ?  body.password                   : null;
    const surname       = typeof body.surname   === "string" ?  body.surname.trim()             : null;
    const phone         = typeof body.phone     === "string" ?  body.phone.trim()               : null;
    
    //  Le rôle est toujours 'user' à la création, neutre sans droits métier.
    //  il sera promu 'patient' par POST /users/patient ou 'pharmacien' par 
    //                  POST /users/pharmacien
    //  Cela évite d'exposer un rôle partiel (pharmacien sans justificatif, 
    //  patient sans profil) et attends la validation finale du compte pour selon son rôle donner ses privilèges et contraintes.
    const role       = "user" as const;

    //  Validation des champs obligatoires
    if (!name) return errorResponse("Le champ 'name' est obligatoire.", 400);
    if (!username) return errorResponse("Le champ 'username' est obligatoire.", 400);
    if (!email) return errorResponse ("Le champ 'email' est obligatoire.", 400);
    if (!password) return errorResponse("Le champ 'password' est obligatoire.", 400);

    //  Validation username - miroir du trigger trg_update_own_username (min 3 chars)
    if (username.length < 3) {
        return errorResponse("Le username doit contenir au moins 3 caractères.", 400);
    }

    //  Protection de username
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
    if(!usernameRegex.test(username)) {
        return errorResponse("Username invalide.", 400);
    }

    //  Validation email - miroie du domaine email_type SQL
    const emailRegex = /^[A-Za-z0-9._%\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
        return errorResponse("Format d'email invalide.", 400);
    }

    //  Validation password - miroir du domaine password_type SQL :
    //  min 12 caractères + 1 majuscule + 1 minuscule + 1 chiffre + 1 caractère spécial
    if (password.length < 12) {
        return errorResponse("Le mot de passe doit contenir au moins 12 caractères.", 400);
    }
    if (!/[A-Z]/.test(password)) {
        return errorResponse("Le mot de passe doit contenir au moins une majuscule.", 400);
    }
    if (!/[a-z]/.test(password)) {
        return errorResponse("Le mot de passe doit contenir au moins une minuscule.", 400);
    }
    if (!/[0-9]/.test(password)) {
        return errorResponse("Le mot de passe doit contenir au moins un choffre.", 400);
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return errorResponse("Le mot de passe doit contenir au moins un caractère spécial.", 400);
    }

    //  Validation phone (optionnel)    -   Miroir du domaine phone_type SQL (+XXX ...)
    if (phone !== null && !/^\+[0-9]+$/.test(phone)) {
        return errorResponse("Format téléphone invalide. Format attendu : +XXX...", 400);
    }

    //  --- Etape 2 :   Création du compte auth.users via Supabase Auth --------
    //  supabase (client ANON) est utilisé pour signUp  -   usage standard Supabase Auth.
    //  Supabase crée l'entrée dans auth.users avec email + password hashé (bcrypt).
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError || !authData?.user) {
        //  Ne pas révéler si l'email existe déjà (énumération d'emails = faille sécurité)
        const msg = authError?.message?.includes("already registered!")
            ? "Cette adresse email est déjà utilisée."
            : "Impossible de créer le compte. Vériiez vos inormations."
        return errorResponse(msg, 409);
    }

    //  UUID généré par Supabase Auth   -   clé primaire dans public.users (clé étrangère)
    const userId = authData.user.id;

    //  --- Etape 3 :   Création du profil public.users ------------------------
    //  Client admin pour insérer dans public.users -   bypasse les RLS
    //  (pas de politique RLS OR INSERT sur public.users dans le schéma)
    const adminResult = getAdminClient(getAdminSecret(), "admin");
    if ("error" in adminResult) {
        //  Problème de coniguration    -   rollback du compte auth créé juste avant
        await cleanupOrphanAuth(userId);
        return errorResponse("Erreur de coniguration serveur.", 500);
    }
    const adminClient = adminResult.client;

    const { data: profile, error: profileError } = await adminClient
        .from("users")
        .insert({
            id:             userId,
            name:           name,
            surname:        surname ?? null,
            phone:          phone ?? null,
            username:       username,
            email:          email,
            role:           role,
            userState:  false,
        })
        .select("id, name, surname, username, email, role, userState, created_at")
        .single();

    if (profileError || !profile) {
        //  insertion public.users échouée  -   rollback du compte auth pour éviter un orphelin
        await cleanupOrphanAuth(userId);

        //  Messages spécifiques depuis les triggers SQL
        if (profileError?.message?.includes("Username already exists")) {
            return errorResponse("Ce username est déjà utilisé.", 409);
        }
        if (profileError?.message?.includes("Username too short")) {
            return errorResponse("Le username doit contenir au moins 3 caractères.", 400);
        }

        return errorResponse("Impossible de créer le profil utilisateur.", 500);
    }

    //  --- Etape 4 :   Réponse succès  ----------------------------------------
    //  On ne retourne pas de JWT ici - L'utilisateur se connecte voa POST /auth/login.
    //  Supabase envoie un email de confirmation si la vérification emailest activée dans le projet.
    return successResponse(
        profile,
        "Inscription réussie. Connectez-vous via login",
        201
    );
}

//  ============================================================================
//  Utilitaire interne  -   rollback auth orphelin
//  ============================================================================

/**
 * Supprime le compte auth.users si la création de public.users a échoué.
 * 
 * Pourquoi :
 *  Si auth.users est créé masi que public.users échoue, l'utilisateur ne peut
 *  plus s'inscrire avec le même email (déjà dans auth.users) ni se connecter
 *  (pas de proil public.users).    Ce rollback nettoie cet état incohérent.
 * 
 * @param userId        UUID du compte auth.users à supprimer
 */
async function cleanupOrphanAuth(userId: string): Promise<void> {
    try {
        const adminResult = getAdminClient(getAdminSecret(), "admin");
        if ("error" in adminResult) return;
        //  Suppression via l'API Admin Supabase -  ignore les erreurs (best effort)
        await adminResult.client.auth.admin.deleteUser(userId);
    } catch {
        //  Rollback best-effort    :   on log sans propager l'erreur au client
        console.error(`[registerUser] Echec rollback auth orphelin userId = ${userId}`); 
    }
}