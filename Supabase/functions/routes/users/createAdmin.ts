/**
 * =============================================================================
 * routes/users/createAdmin.ts  —  POST /admin/create
 * =============================================================================
 *
 * Crée le compte administrateur unique du système.
 * Cette route est PUREMENT BACKEND — utilisée avant le déploiement (seeding).
 *
 * CONTRAINTE : UN SEUL ADMIN
 *  Le système n'autorise qu'un seul administrateur. Deux mécanismes SQL l'imposent :
 *  - trigger_check_single_admin : lève une exception si un admin existe déjà
 *  - unique_admin_role : index unique sur users(role) WHERE role='admin'
 *
 *  Cette route est désactivée fonctionnellement dès qu'un admin existe.
 *  Elle n'est jamais exposée dans l'interface utilisateur.
 *
 * DIFFÉRENCE AVEC registerUser :
 *  registerUser est pour les utilisateurs finaux (patient/pharmacien).
 *  createAdmin est une opération de seeding exécutée une seule fois par
 *  le développeur/DevOps avant la mise en production.
 *
 * SÉCURITÉ :
 *  - Protégé par ADMIN_CLIENT_SECRET (dans le body)
 *  - Pas de JWT requis — opération pré-déploiement
 *  - Utilise auth.admin.createUser() avec email_confirm=true
 *  - Rollback si public.users échoue après auth.users créé
 *
 * BODY ATTENDU (JSON) :
 *      adminSecret string  requis — doit correspondre à ADMIN_CLIENT_SECRET
 *      name        string  requis
 *      username    string  requis, >= 3 chars, unique
 *      email       string  requis
 *      password    string  requis, >= 12 chars, règles password_type
 *      surname     string  optionnel
 *      phone       string  optionnel
 *
 * RÉPONSE SUCCÈS 201 :
 *  { success: true, data: { id, name, username, email, role } }
 *
 * =============================================================================
 */

import { getAdminClient }               from "@/supabaseAdminClient.ts";
import { successResponse, errorResponse }                from "@/middleware/auth.ts";

// ============================================================================================================================
//  Handler principal
// ============================================================================================================================

/**
 * Gère POST /admin/create.
 *
 * @param req   Requête HTTP entrante (body JSON)
 * @returns     Response JSON standardisée
 */
export async function createAdmin(req: Request): Promise<Response> {

    // ── Étape 1 : Lecture et validation du body JSON ───────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return errorResponse("Corps de la requête invalide. JSON attendu.", 400);
    }

    // Extraction du secret admin — premier champ vérifié (fail fast)
    const adminSecret = typeof body.adminSecret === "string" ? body.adminSecret : null;
    if (!adminSecret) {
        return errorResponse("Le champ 'adminSecret' est obligatoire.", 400);
    }

    // ── Garde 1 : Vérification du secret ADMIN_CLIENT_SECRET ──────────────────
    // getAdminClient compare le secret fourni avec ADMIN_CLIENT_SECRET
    // Retourne { error } si incorrect → refus 403
    const adminResult = getAdminClient(adminSecret, "admin");
    if ("error" in adminResult) {
        return errorResponse("Accès refusé.", 403);
    }
    const adminClient = adminResult.client;

    // Extraction des autres champs
    const name     = typeof body.name     === "string" ? body.name.trim()                : null;
    const username = typeof body.username === "string" ? body.username.trim()            : null;
    const email    = typeof body.email    === "string" ? body.email.trim().toLowerCase() : null;
    const password = typeof body.password === "string" ? body.password                   : null;
    const surname  = typeof body.surname  === "string" ? body.surname.trim()             : null;
    const phone    = typeof body.phone    === "string" ? body.phone.trim()               : null;

    if (!name)     return errorResponse("Le champ 'name' est obligatoire.",     400);
    if (!username) return errorResponse("Le champ 'username' est obligatoire.", 400);
    if (!email)    return errorResponse("Le champ 'email' est obligatoire.",    400);
    if (!password) return errorResponse("Le champ 'password' est obligatoire.", 400);

    if (username.length < 3) return errorResponse("Le username doit contenir au moins 3 caractères.", 400);

    // Validation password — miroir du domaine password_type SQL
    if (password.length < 12)            return errorResponse("Mot de passe trop court (minimum 12 caractères).", 400);
    if (!/[A-Z]/.test(password))         return errorResponse("Mot de passe : au moins une majuscule requise.", 400);
    if (!/[a-z]/.test(password))         return errorResponse("Mot de passe : au moins une minuscule requise.", 400);
    if (!/[0-9]/.test(password))         return errorResponse("Mot de passe : au moins un chiffre requis.", 400);
    if (!/[^A-Za-z0-9]/.test(password))  return errorResponse("Mot de passe : au moins un caractère spécial requis.", 400);

    if (phone !== null && !/^\+[0-9]+$/.test(phone)) {
        return errorResponse("Format téléphone invalide. Format attendu : +XXXXX", 400);
    }

    // ── Étape 2 : Vérification anticipée — aucun admin ne doit exister ─────────
    // Le trigger SQL fait la même vérification, mais on préfère un message clair
    const { data: existingAdmin } = await adminClient
        .from("users")
        .select("id")
        .eq("role", "admin")
        .maybeSingle();

    if (existingAdmin) {
        return errorResponse(
            "Un compte administrateur existe déjà. Utilisez reset si vous souhaitez réinitialiser son profil.",
            409
        );
    }

    // ── Étape 3 : Création du compte auth.users ────────────────────────────────
    // auth.admin.createUser() : email_confirm=true → pas de vérification email
    // L'admin est créé avant le déploiement — la vérification email n'a pas de sens
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (authError || !authData?.user) {
        const msg = authError?.message?.includes("already registered")
            ? "Cette adresse email est déjà utilisée."
            : "Impossible de créer le compte auth.";
        return errorResponse(msg, 409);
    }

    const userId = authData.user.id;

    // ── Étape 4 : Création du profil public.users avec role='admin' ────────────
    // userState = false → l'admin n'est pas encore connecté
    // Le trigger trigger_check_single_admin bloque si un admin existe déjà
    const { data: profile, error: profileError } = await adminClient
        .from("users")
        .insert({
            id:        userId,
            name,
            surname:   surname ?? null,
            phone:     phone   ?? null,
            username,
            email,
            role:      "admin",   // forcé — jamais depuis l'input utilisateur
            userState: false,
        })
        .select("id, name, surname, username, email, role, created_at")
        .single();

    if (profileError || !profile) {
        // Rollback du compte auth créé
        await adminClient.auth.admin.deleteUser(userId);

        if (profileError?.message?.includes("seul administrateur")) {
            return errorResponse("Un compte administrateur existe déjà.", 409);
        }
        if (profileError?.message?.includes("Username already exists")) {
            return errorResponse("Ce username est déjà utilisé.", 409);
        }
        return errorResponse("Impossible de créer le profil administrateur.", 500);
    }

    // ── Étape 5 : Insertion dans public.admin (traçabilité) ───────────────────
    await adminClient.from("admin").insert({ user_id: userId });

    return successResponse(
        profile,
        "Compte administrateur créé. Connectez-vous via login.",
        201
    );
}