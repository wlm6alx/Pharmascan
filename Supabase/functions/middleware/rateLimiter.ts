// ============================================================================
// middleware/rateLimiter.ts  —  Rate limiting par IP
// ============================================================================
//
// RÔLE :
//  Limite le nombre de requêtes par IP et par fenêtre de temps.
//  Protège contre les attaques par force brute (login, register)
//  et les abus de l'API en général.
//
// IMPLÉMENTATION :
//  Stockage en mémoire (Map) — suffisant pour une Edge Function isolée.
//  Pour une protection distribuée, utiliser Supabase KV ou Upstash Redis.
//
// LIMITES PAR ROUTE :
//  - /auth/login          : 5 tentatives / 15 min par IP
//  - /auth/register       : 3 créations / heure par IP
//  - /auth/reset-password : 3 demandes / heure par IP
//  - Autres routes        : 100 requêtes / minute par IP

// Stockage en mémoire : Map<ip_route, { count, resetAt }>
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitRule {
    maxRequests: number;    // nombre max de requêtes autorisées
    windowMs:    number;    // fenêtre de temps en millisecondes
}

// Table des règles par route sensible
const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
    "/auth/login":          { maxRequests: 5,   windowMs: 15 * 60 * 1000 },
    "/auth/register":       { maxRequests: 3,   windowMs: 60 * 60 * 1000 },
    "/auth/reset-password": { maxRequests: 3,   windowMs: 60 * 60 * 1000 },
    "/auth/refresh":        { maxRequests: 30,  windowMs: 60 * 60 * 1000 },
    "default":              { maxRequests: 100, windowMs: 60 * 1000       },
};

/**
 * Vérifie et enregistre une requête pour le rate limiting.
 *
 * @param ip        Adresse IP du client (extraite du header CF-Connecting-IP ou X-Forwarded-For)
 * @param pathname  Chemin de la route pour appliquer la règle adaptée
 * @returns         { allowed: true } ou { allowed: false, retryAfter: number }
 */
export function checkRateLimit(
    ip:       string,
    pathname: string
): { allowed: boolean; retryAfter?: number } {

    // Sélectionner la règle selon la route (exacte ou défaut)
    const rule = RATE_LIMIT_RULES[pathname] ?? RATE_LIMIT_RULES["default"];

    // Clé unique par combinaison IP + route
    const key  = `${ip}:${pathname}`;
    const now  = Date.now();

    // Lire l'entrée existante
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        // Première requête ou fenêtre expirée → initialiser le compteur
        rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
        return { allowed: true };
    }

    if (entry.count >= rule.maxRequests) {
        // Limite atteinte → retourner le temps restant en secondes
        return {
            allowed:    false,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
    }

    // Incrémenter le compteur dans la fenêtre courante
    entry.count += 1;
    rateLimitStore.set(key, entry);
    return { allowed: true };
}

/**
 * Extrait l'adresse IP réelle du client depuis les headers HTTP.
 * Cloudflare (utilisé par Supabase Edge Functions) injecte CF-Connecting-IP.
 *
 * @param req   Requête HTTP entrante
 * @returns     Adresse IP sous forme de chaîne, ou "unknown"
 */
export function extractClientIP(req: Request): string {
    return (
        req.headers.get("CF-Connecting-IP")   ??  // Cloudflare (priorité)
        req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
        req.headers.get("X-Real-IP")          ??
        "unknown"
    );
}