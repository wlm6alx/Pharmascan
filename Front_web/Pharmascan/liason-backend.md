# Liaison Frontend ↔ Backend / Base de données (Supabase)

Ce document liste **tous les points de liaison** entre le frontend (`Front_web/Pharmascan`) et le backend/base de données via **Supabase** : Auth, PostgreSQL (tables), Storage (buckets) et RPC.

## Configuration (env + client Supabase)

- **Fichier**: `Front_web/Pharmascan/.env`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Client**: `src/lib/supabase.js`
  - Exporte `supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - Exporte `isSupabaseConfigured` (bannière d’alerte affichée dans `src/App.jsx`)

## Authentification (Supabase Auth)

### Session globale / écoute des changements
- **Fichier**: `src/contexts/AuthContext.jsx`
- **Appels**:
  - `supabase.auth.getSession()`
  - `supabase.auth.onAuthStateChange(...)`
  - `supabase.auth.signOut()`
- **But**: maintenir `user` et `loading` pour protéger les routes.

### Connexion
- **Fichier**: `src/pages/Login.jsx`
- **Appels**:
  - `supabase.auth.signInWithPassword({ email, password })`
  - **Fallback REST** (si erreur réseau type “Failed to fetch”):
    - `POST ${SUPABASE_URL}/auth/v1/token?grant_type=password`
    - Headers: `apikey`, `Authorization: Bearer <anon>`
    - Puis `supabase.auth.setSession({ access_token, refresh_token })`
- **DB après Auth**:
  - `from('pharmacists').select('*').eq('user_id', authUser.id).maybeSingle()`
  - Si absent: `ensurePharmacistRow(supabase, authUser)` (voir section RPC/Helpers)

### Inscription
- **Fichier**: `src/pages/Register.jsx`
- **Appels Auth**:
  - `supabase.auth.signUp({ email, password, options: { data: ... } })`
    - `options.data` contient des infos “profil” (pharmacie, adresse, etc.) utilisées côté backend (triggers/RPC/insert).
- **Après inscription**:
  - Si `authData.session` existe: le frontend tente de récupérer `pharmacists` puis d’upload les fichiers (attestation / photo) et met à jour `pharmacies`.
  - Sinon (confirmation email): redirection vers `/login` avec un message.

### Mot de passe oublié
- **Fichier**: `src/pages/ForgotPassword.jsx`
- **Appel**:
  - `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- **Remarque production**: le `redirectTo` doit correspondre à une URL autorisée dans Supabase Auth (Redirect URLs).

### Changement de mot de passe (profil)
- **Fichier**: `src/pages/Profile.jsx`
- **Appel**:
  - `supabase.auth.updateUser({ password: formData.newPassword })`

## Base de données (PostgreSQL via PostgREST)

Les tables suivantes sont appelées depuis le frontend.

### Table `pharmacists`
Usages:
- **Récupérer la pharmacie courante** (obtenir `pharmacy_id`)
- **Créer/assurer la ligne pharmacien** (via helpers + RPC)

Fichiers / requêtes:
- `src/pages/Login.jsx`: select par `user_id`
- `src/pages/Medications.jsx`: `select('pharmacy_id') ... eq('user_id', user.id)`
- `src/pages/Availability.jsx`: `select('pharmacy_id') ...`
- `src/pages/Notifications.jsx`: `select('pharmacy_id') ...`
- `src/pages/Dashboard.jsx`: `select('pharmacy_id') ... maybeSingle()`
- `src/components/Layout.jsx`: `select('id, pharmacy_id') ... maybeSingle()`
- `src/pages/Pharmacy.jsx`, `src/pages/Status.jsx`: `select('*, pharmacies(*)')` (embed)

### Table `pharmacies`
Usages:
- créer / modifier les informations de la pharmacie
- mettre à jour `operational_status`, `is_on_duty`, documents (URLs), etc.

Fichiers / requêtes:
- `src/pages/Profile.jsx`:
  - `from('pharmacies').update(updateData).eq('id', row.id)`
  - création possible via helper `resolveOrCreatePharmacy(...)`
- `src/pages/Pharmacy.jsx`:
  - `update(...)` / `insert(...)`
  - puis `from('pharmacists').update({ pharmacy_id: data.id })...`
- `src/pages/Status.jsx`:
  - `update({ operational_status })`
  - `update({ is_on_duty })`
- `src/components/Layout.jsx`:
  - `update({ operational_status })` via toggle (ouvert/fermé)

### Table `medications`
Usages:
- lister, créer, modifier, supprimer
- gérer disponibilité/quantité
- stocker `photo_urls` (tableau de strings) côté DB

Fichiers / requêtes:
- `src/pages/Medications.jsx`:
  - `select('*').eq('pharmacy_id', ...)`
  - `insert(...)`, `update(...)`, `delete()`
  - `update({ photo_urls: urls })` après upload Storage
- `src/pages/Availability.jsx`:
  - `update({ available: ... })`
  - `update({ quantity: ..., available: ... })`
- `src/pages/Dashboard.jsx`:
  - `select('*')` pour statistiques

### Table `notifications`
Usages:
- afficher la liste
- marquer comme lu
- supprimer
- compter les notifications non lues (Layout)

Fichiers / requêtes:
- `src/pages/Notifications.jsx`:
  - `select('*').eq('pharmacy_id', ...)`
  - `update({ read: true }).eq('id', ...)`
  - `delete().eq('id', ...)`
- `src/components/Layout.jsx`:
  - `select('id').eq('pharmacy_id', ...).eq('read', false)`

## Storage (Supabase Storage)

### Bucket `pharmacy-documents`
- **Fichier**: `src/pages/Profile.jsx` + `src/pages/Register.jsx`
- **Upload**:
  - `.from('pharmacy-documents').upload(\`\${user.id}/attestation-...\`, file)`
- **URL publique**:
  - `.getPublicUrl(path)`
- **Champ DB utilisé**: `pharmacies.attestation_url`

### Bucket `pharmacy-photos`
- **Fichier**: `src/pages/Profile.jsx` + `src/pages/Register.jsx`
- **Upload**:
  - `.from('pharmacy-photos').upload(\`\${user.id}/photo-...\`, file)`
- **URL publique**:
  - `.getPublicUrl(path)`
- **Champ DB utilisé**: `pharmacies.photo_url`

### Bucket `medication-photos`
- **Fichier**: `src/pages/Medications.jsx`
- **Upload (upsert)**:
  - `.from('medication-photos').upload(\`\${user.id}/medications/\${medicationId}/photo-\${i+1}.ext\`, file, { upsert: true })`
- **URL publique**:
  - `.getPublicUrl(path)` puis stockage en DB
- **Champ DB utilisé**: `medications.photo_urls` (TEXT[])

## RPC / Helpers (logique “backend” appelée depuis le frontend)

### `ensurePharmacistRow(...)`
- **Fichier**: `src/lib/pharmacyHelpers.js`
- **But**: garantir qu’une ligne existe dans `pharmacists` pour l’utilisateur connecté.
- **Appels RPC**:
  - `supabase.rpc('ensure_pharmacist_for_current_user')`
  - `supabase.rpc('bootstrap_pharmacist_if_missing')`
- **Fallback**: tentative d’`insert` direct dans `pharmacists` si RPC indisponible.

### Résolution pharmacie liée au pharmacien
- **Fichier**: `src/lib/pharmacyHelpers.js`
- Fonctions:
  - `resolvePharmacyForPharmacist(supabase, pharmacist)`
  - `resolveOrCreatePharmacy(supabase, pharmacist, insertRow)`
- **But**: récupérer `pharmacies` même si l’embed est bloqué (RLS), ou créer la pharmacie si absente.

## Événements (liaison “front ↔ état backend”)

- **Constante**: `PHARMACY_PROFILE_UPDATED_EVENT` dans `src/lib/pharmacyHelpers.js`
- **Émetteur**: `src/pages/Profile.jsx` après mise à jour
- **Écoute**: `src/components/Layout.jsx` pour rafraîchir statut + compteur notifications.

## Points “production” à valider

- **RLS**: les politiques doivent autoriser, pour l’utilisateur authentifié, l’accès aux lignes liées à sa `pharmacy_id` (tables `pharmacists`, `pharmacies`, `medications`, `notifications`).
- **Storage policies**: upload autorisé pour les buckets (`pharmacy-documents`, `pharmacy-photos`, `medication-photos`) + lecture publique si vous utilisez `getPublicUrl`.
- **Redirect URLs Auth**: la page “mot de passe oublié” utilise `redirectTo` → l’URL doit être whitelistée dans Supabase.

