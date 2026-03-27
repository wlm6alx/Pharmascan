/**
 * ================================================================
 * types/index.ts - Types TypeScript partagés dans tout le projet
 * ================================================================
 * 
 * Centralise les interfaces et types TypeScript utilisés par les routes.
 * Ces types reflètent fidèlement la structure des tables SQL du projet.
 * 
 * WARNING:     Le champ "password" n'apparait jamais ici:
 *              Supabase stocke le mot de passe chiffré dans auth.users (table unterne),
 *              jamais dans public.users. Le mot de passe n'est donc jamais manipulé
 *              directement dans ce backend.
 * ================================================================
 */

//  ---------------------------------------------------------------
//  Enumérations (correspondent aux ENUM SQL)
//  ---------------------------------------------------------------

//  Correspond à CREATE TYPE user_role AS ENUM
export type UserRole = "admin" | "pharmacien" | "patient" | "user";

//  Correspond à CREATE TYPE pharmacie_status AS ENUM
export type PharmacieStatus = "open" | "close";

//  Correspond à CREATE TYPE responsability_pharm AS ENUM
export type ResponsabilityPharm = "gerant" | "pharmacien";

//  ---------------------------------------------------------------
//  Interfaces des tables
//  ---------------------------------------------------------------

/**
 * Profil public d'un utilisateur (table public.users)
 * WARNING:     id (UUID) n'est jamais exposé dans les réponses JSON
 */
export interface UserProfile {
    name: string;
    surname: string | null;
    phone: string | null;
    username: string;               //  Identifiant unique visible (UNIQUE)
    email: string;                  //  Email (UNIQUE, synchronisé avec auth.users)
    role: UserRole;
    userState: boolean;
    create_at?: string;
}

/**
 * Pharmacie (table public.pharmacie)
 * WARNING:     pharmacie_id (UUID) n'est jamais exposé dans les réponses JSON
 */
export interface Pharmacie {
    name: string;
    adress: string;
    ville: string;
    quartier: string;
    phone: string;                  //  Format phone_type SQL (+237...)
    status: PharmacieStatus;
    validate: boolean;
    exist: boolean;
    created_at?: string;
}

/**
 * Identifiants alternatifs d'une pharmacie (jamais les UUIDs)
 * Utilisés pour identifier une pharmacie dans les requêtes
 */
export interface PharmacieIdentifier {
    name: string;
    adress: string;
    ville: string;
    quartier: string;
    phone: string;
}

/**
 * Médicament (table public.medicament)
 * WARNING:     medicament_id et codeQR (UUIDs) ne sont pas exposés directement
 */
export interface Medicament {
    name: string;
    categorie: string | null;
    description: string | null;
    image_path: string;
    date_fabricate: string;             //  Format ISO date
    date_expirate: string;              //  Format ISO date
    visibility: boolean;
    created_at?: string;
}

/**
 * Identifiants alternatifs d'un médicament ( ombinaison NOT NULL unique)
 */
export interface MedicamentIdentifier {
    name: string;
    date_fabricate: string;
    date_expirate: string;
}

/**
 * Stock d'un médicament dans une pharmacie (table public.stockMedicament)
 */
export interface StockMedicament {
    quantity: number;
    price: number | null;
    available: boolean;
    update_at?: string;
    created_at?: string;
}

/**
 * Patient (table public.patients)
 */
export interface Patient {
    gender: "M" | "F" | "Other" | null;
    birthDate: string | null;           //  ormat ISO date
    urgence_phone: string | null;
    adress: string | null;
    created_at?: string;
}

/**
 * Données privées patient (table public.patient_private_data)
 */
export interface PatientPrivateData {
    HistoriqueScan: string | null;
    PharmacieFavorite: string | null;
}

/**
 * Pharmacien (table public.pharmacien)
 */
export interface Pharmacien {
    username: string;                   //  Identifiant alternatif (UNIQUE dans users)
    responsability: ResponsabilityPharm;
    created_at?: string;
}
