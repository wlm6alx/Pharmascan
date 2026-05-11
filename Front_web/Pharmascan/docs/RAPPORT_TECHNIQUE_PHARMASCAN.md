# Rapport technique — PharmaScan (espace pharmacien)

Documentation du dépôt **Front_web/Pharmascan** : architecture, logique métier, dépendances Supabase et scripts SQL fournis.  
**Date de référence du code** : mai 2026.

---

## 1. Vue d’ensemble

### 1.1 Rôle du produit

Application web **React** destinée aux **pharmaciens** : gestion de la **pharmacie** (fiche officine), **inventaire médicaments**, **disponibilité**, **statut ouvert/fermé** après validation admin, **profil** et **notifications**. L’accès est restreint aux comptes dont le rôle applicatif est **`pharmacien`** (via `public.users` et la RPC `get_current_app_role`).

### 1.2 Stack technique

| Couche | Technologie |
|--------|-------------|
| UI | React 18, JSX |
| Routage | `react-router-dom` (BrowserRouter) |
| Auth / BDD / Storage | `@supabase/supabase-js` (Auth, PostgREST, Storage) |
| Build | Vite |
| Styles | Tailwind CSS (`index.css`, `tailwind.config.js`) |
| Icônes | `lucide-react` |

### 1.3 Variables d’environnement

Fichier **`.env`** (préfixe Vite obligatoire) :

- **`VITE_SUPABASE_URL`** — URL du projet Supabase  
- **`VITE_SUPABASE_ANON_KEY`** — clé anonyme (exposée au navigateur ; la sécurité repose sur **RLS** et policies Storage)  
- **`VITE_MEDICAMENT_CODE_BARRES_COL`** (optionnel) — nom exact de la colonne code-barres en base si différent du défaut (`code_barre` dans `medicationSchema.js`)

`src/lib/supabase.js` exporte **`isSupabaseConfigured`** : si la config est invalide, un client « placeholder » est quand même créé pour éviter un crash au chargement, et une bannière s’affiche dans `App.jsx`.

---

## 2. Arborescence source (`src/`)

| Chemin | Rôle |
|--------|------|
| `main.jsx` | Monte React, `BrowserRouter`, `App` |
| `App.jsx` | Routes, `AuthProvider`, `ProtectedRoute`, redirection `/` → `/dashboard` |
| `contexts/AuthContext.jsx` | Session Supabase, filtre « pharmacien », cas mot de passe oublié |
| `components/Layout.jsx` | Shell connecté : sidebar, statut pharmacie, notifications, déconnexion |
| `components/SimpleNoticeModal.jsx` | Modale courte (ex. pharmacie manquante) |
| `components/PharmaScanLogo.jsx` | Logo |
| `pages/*.jsx` | Écrans par route |
| `lib/supabase.js` | Client Supabase |
| `lib/appUserRole.js` | Rôle applicatif (`get_current_app_role`) |
| `lib/pharmacySchema.js` | Constantes tables `pharmacie` / `pharmacien`, helpers téléphone, géoloc |
| `lib/pharmacyHelpers.js` | Résolution pharmacie, `ensurePharmacistRow`, événement profil |
| `lib/medicationSchema.js` | Table `medicaments`, bucket photos, colonne code-barres |
| `lib/barcodeValidation.js` | Normalisation / validation GTIN, conflits |
| `lib/medicationDates.js` | Dates fabrication / péremption (mois-année ↔ ISO) |
| `lib/medicationCategories.js` | Suggestions catégories |
| `lib/medicationDosageForm.js` | Formes galéniques, dosages |
| `lib/phoneCodes.js` | Indicatifs pays |
| `lib/locationData.js` | Données géographiques (villes / pays) |
| `lib/profileAddress.js` | Adresse profil |
| `legal/LegalDocuments.jsx` | Documents légaux (si utilisés dans le flux inscription) |

---

## 3. Routage et protection (`App.jsx`)

### 3.1 Routes publiques

- **`/login`** — Connexion  
- **`/register`** — Inscription  
- **`/forgot-password`** — Demande de lien de réinitialisation  
- **`/reset-password`** — Saisie du nouveau mot de passe (lien e-mail Supabase)

### 3.2 Routes protégées

Toutes sous **`ProtectedRoute`** : si `loading`, écran « Chargement… » ; si pas de `user`, redirection vers **`/login`** ; sinon contenu enveloppé dans **`Layout`**.

Routes : `/dashboard`, `/pharmacy`, `/medications`, `/availability`, `/status`, `/profile`, `/notifications`.

### 3.3 Redirection racine

**`/`** → **`/dashboard`** (replace).

---

## 4. Authentification et autorisation

### 4.1 Flux Supabase Auth

- Session lue via **`supabase.auth.getSession()`** au démarrage.
- Abonnement **`onAuthStateChange`** pour les changements (connexion, refresh, déconnexion, **PASSWORD_RECOVERY**).

### 4.2 Règle « pharmacien uniquement »

1. **`appUserRole.js`** appelle la RPC **`get_current_app_role`** (retour texte : rôle dans `public.users`).
2. **`isPharmacistAppUser`** exige **`role === 'pharmacien'`** (`APP_ROLE_PHARMACIEN`).
3. **`AuthContext`** — fonction **`applySession`** :
   - pas de user → `setUser(null)` ;
   - sinon appel **`isPharmacistAppUser`** ;
   - si erreur RPC ou rôle incorrect → **`signOut`** + `setUser(null)` ;
   - sinon **`setUser(authUser)`**.

4. **`Login.jsx`** refait la même vérification **après** `signInWithPassword` (ou fallback REST) **avant** `navigate('/dashboard')`, pour afficher un message clair si le rôle ne convient pas.

### 4.3 Connexion réseau fragile (`Login.jsx`)

**`signInWithFallback`** : si `signInWithPassword` échoue avec **`Failed to fetch`** / **NetworkError**, nouvelle tentative via **`fetch`** sur **`/auth/v1/token?grant_type=password`**, puis **`supabase.auth.setSession`**. Utile derrière proxy / CORS / instabilité du client JS.

### 4.4 Mot de passe oublié / réinitialisation

- **`ForgotPassword.jsx`** : `resetPasswordForEmail` avec **`redirectTo`** vers **`/reset-password`** sur l’origine courante.
- **`ResetPassword.jsx`** : détection lien recovery (hash / événements), formulaire mot de passe, **`updateUser({ password })`**, déconnexion, redirection **`/login`** avec `state.passwordReset`.
- **`AuthContext`** : sur **`PASSWORD_RECOVERY`** ou chemin contenant **`reset-password`** avec session, **ne pas** enchaîner tout de suite sur **`applySession`** (évite déconnexion pendant le flux) ; définit l’utilisateur à partir de la session de récupération.

### 4.5 Ligne `pharmacien` après login

**`Login.jsx`** charge **`pharmacien`** ; si absent, tente **`ensurePharmacistRow`** (voir §5). L’accès au dashboard n’est pas bloqué si la ligne manque encore (warning console) — à aligner avec la politique produit.

---

## 5. Modèle métier « pharmacie » (`pharmacySchema.js` + `pharmacyHelpers.js`)

### 5.1 Tables cibles (noms utilisés dans le code)

- **`public.pharmacie`** (`T_PHARMACIE`) — officine : adresse, téléphone, coords, `status` (`open` / `close`), `validate`, chemins fichiers, etc.
- **`public.pharmacien`** (`T_PHARMACIEN`) — lien **`user_id`** ↔ **`pharmacie_id`**, justificatifs, rôle/responsabilité.

### 5.2 `ensurePharmacistRow(supabase, user)`

Garantit une ligne **`pharmacien`** pour **`auth`** :

1. Select par **`user_id`**.
2. Sinon RPC **`ensure_pharmacist_for_current_user`** (définie dans les scripts SQL projet).
3. Sinon RPC **`bootstrap_pharmacist_if_missing`**.
4. Sinon **`INSERT`** minimal sur **`pharmacien`**.

Utilisé par **Pharmacy**, **Medications** (chargement `pharmacie_id`), **Status**, et **Login** (secours).

### 5.3 `resolvePharmacyForPharmacist`

- Si la requête embarque une relation **`pharmacie`**, normalisation tableau/objet.
- Sinon **`SELECT * FROM pharmacie WHERE pharmacie_id = …`**.

### 5.4 `resolveOrCreatePharmacy`

Crée une ligne **`pharmacie`** minimale + **`UPDATE pharmacien`** avec **`pharmacie_id`** (parcours « première officine » / assistant création).

### 5.5 Statut opérationnel affiché

**`getOperationalStatus`** / **`isPharmacyOpenForDisplay`** : priorité à **`statut_operationnel`** si présent, sinon **`status === 'open'`**, sinon valeurs legacy `ouvert` / `ferme` / `occupe`.

### 5.6 Événement global **`PHARMACY_PROFILE_UPDATED_EVENT`**

Chaîne **`'pharmacy-profile-updated'`**. **`Pharmacy.jsx`** (et **`Profile.jsx`**) peut l’émettre après sauvegarde ; **`Layout`**, **`Medications`**, **`Status`** écoutent pour rafraîchir listes / compteurs sans recharger la page.

---

## 6. Pages — logique par écran

### 6.1 `Dashboard.jsx`

- Résout **`pharmacie_id`** via **`pharmacien`** (select direct ; pas `ensurePharmacistRow` dans la version actuelle — à harmoniser si besoin).
- Charge **`medicaments`** via **`T_MEDICAMENT`** (`medicationSchema.js`).
- Agrégations : stats, top produits, répartition catégories, alertes péremption / stock faible.
- Mapping colonnes BDD → UI : `nom`, `quantite`, `code_barres` via **`medicamentBarcodeFromRow`**, etc.

### 6.2 `Pharmacy.jsx`

- **`ensurePharmacistRow`** + **`resolvePharmacyForPharmacist`**.
- Édition formulaire ; **`handleSubmit`** update ou **`resolveOrCreatePharmacy`** ; **`handleCreatePharmacy`** insert + lien **`pharmacien`**.
- Émission **`PHARMACY_PROFILE_UPDATED_EVENT`** après succès.
- Affichage statut validation via **`pharmacyValidationKey`**.

### 6.3 `Medications.jsx`

**Données**

- **`fetchMedications`** : **`ensurePharmacistRow`**, puis **`pharmacie_id`**, puis **`SELECT *`** sur **`T_MEDICAMENT`**, tri **`cree_le`** (si la colonne existe en BDD).
- En cas d’erreur sur la requête médicaments, le code peut **conserver** `pharmacie_id` déjà résolu (évite faux « pas de pharmacie »).

**Saisie**

- Validation formulaire : forme galénique, code-barres (longueur / format via **`barcodeValidation`**), photos (1 à 3), conflit code-barres **`findBarcodeConflict`**.
- **Insert/Update** : payload colonnes françaises attendues (`nom`, `categorie`, `quantite`, `date_production`, `date_expiration`, `forme`, `fabricant`, `prix`, `pharmacie_id`, `urls_photos`, etc.) ; code-barres via **`[M_COL_CODE_BARRES]`**.

**Stockage images**

- Bucket **`BUCKET_MEDICATION_PHOTOS`** (`medication-photos`), chemin **`{user.id}/medications/{medicationId}/photo-n.ext`**, **`getPublicUrl`**.

**UX**

- Modale « pharmacie requise » (**`SimpleNoticeModal`** + **`NOTICE_NEED_PHARMACY`**).
- Toasts bas d’écran succès/erreur (remplace **`alert`** pour enregistrement / suppression).

### 6.4 `Availability.jsx`

- Liste **`medicaments`** pour la pharmacie du pharmacien.
- Toggle **`disponible`**, mise à jour **`quantite`** + disponibilité dérivée du stock.
- Filtre recherche nom + code-barres (**`medicamentBarcodeFromRow`**).

### 6.5 `Status.jsx`

- **`ensurePharmacistRow`** + **`resolvePharmacyForPharmacist`**.
- Affichage validation ; si pharmacie absente, bandeau avec lien Ma Pharmacie.
- Mise à jour **`pharmacie.status`** `open` / `close` si validée.
- Écoute **`PHARMACY_PROFILE_UPDATED_EVENT`**.

### 6.6 `Profile.jsx`

- Formulaire riche : coordonnées, fichiers (attestation, photo, justificatif), mot de passe, carte/OSM.
- Upload vers buckets **`pharmacy-documents`** / **`pharmacy-photos`** (voir scripts Storage).
- Notifications **`showNotice`** (variant success/error).

### 6.7 `Notifications.jsx`

- CRUD sur table **`notifications`** (liste, marquer lu, supprimer).
- Dépend de la table et des policies décrites dans **`supabase_notifications_table.sql`** (si présent dans le dépôt / à déployer).

### 6.8 `Register.jsx`

- Inscription Supabase + métadonnées **`raw_user_meta_data`** (flow `register_flow: 'pharmascan'`) pour triggers **`handle_new_user_pharmascan`** (création pharmacie/pharmacien côté serveur si configuré).

### 6.9 `Layout.jsx`

- Charge pharmacie pour **badge ouvert/fermé**, **validation**, **photo profil** (`profile_path`).
- Compteur **notifications non lues** : requête sur **`notifications`** ; erreurs **`PGRST205` / `42P01`** ignorées silencieusement (table absente).
- Interrupteur ouvert/fermé : uniquement si **`pharmacyValidationStatus === 'approuvee'`**, sinon message **`alert`**.
- Navigation responsive, **`signOut`** avec confirmation.

### 6.10 Documents légaux

**`legal/LegalDocuments.jsx`** — contenu légal réutilisable (selon intégration dans Register / footer).

### 6.11 `ForgotPassword.jsx` / `ResetPassword.jsx`

- **ForgotPassword** : envoi du lien Supabase (`resetPasswordForEmail`), `redirectTo` = **`/reset-password`** sur l’origine du site.
- **ResetPassword** : détection flux recovery (`type=recovery` dans l’URL, événements `PASSWORD_RECOVERY` / `SIGNED_IN`), validation de la force du mot de passe, **`updateUser({ password })`**, **`signOut`**, redirection vers **`/login`** avec message. Cartographie d’erreurs Supabase (ex. mot de passe identique à l’ancien) vers le français.

---

## 7. Bibliothèques métier (`lib/`)

### 7.1 `barcodeValidation.js`

- **`normalizeBarcodeDigits`** : NFKC + suppression non-chiffres.
- **`isValidGtinChecksum`** / **`isValidGtin`** : contrôle modulo 10 GS1 (longueurs 8, 12, 13, 14 ; repli UPC 12 → EAN-13 avec zéro initial).
- **`isValidBarcodeEntry`** : règles « souples » pour saisie manuelle (4–14 chiffres) vs GTIN strict.
- **`findBarcodeConflict`** : unicité logique du code-barres dans la liste courante.

### 7.2 `medicationDates.js`

Conversion entre champs formulaire mois/année et dates ISO en base (`date_production`, `date_expiration`), tri / affichage.

### 7.3 `medicationDosageForm.js` & `medicationCategories.js`

Suggestions dynamiques à partir de l’inventaire existant ; groupes de formes ; valeur « Autre ».

### 7.4 `phoneCodes.js` / `locationData.js` / `profileAddress.js`

Support téléphone international et adresses (profil / inscription).

---

## 8. Supabase — récapitulatif des intégrations

| Domaine | Usage dans le code |
|---------|-------------------|
| Auth | `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser`, `onAuthStateChange`, `getSession`, `setSession` |
| Tables | `pharmacien`, `pharmacie`, `medicaments`, `notifications`, `users` (indirect via RPC) |
| RPC | `get_current_app_role`, `ensure_pharmacist_for_current_user`, `bootstrap_pharmacist_if_missing` |
| Storage | `pharmacy-photos`, `pharmacy-documents`, `medication-photos` |

---

## 9. Scripts SQL fournis (dossier Pharmascan)

À exécuter dans **Supabase → SQL Editor** (ordre recommandé : schéma tables → RLS → Storage → RPC).

| Fichier | Objectif |
|---------|----------|
| `supabase_rpc_get_current_app_role.sql` | Fonction **`get_current_app_role()`** (SECURITY DEFINER), **GRANT EXECUTE** à `authenticated` |
| `supabase_rls_pharmacien_authenticated.sql` | GRANT + RLS **`pharmacien`** / **`pharmacie`**, RPC **`ensure_pharmacist_*`** / **`bootstrap_*`** |
| `supabase_handle_new_user_pharmascan.sql` | Trigger optionnel inscription (meta `register_flow`) |
| `supabase_rls_medicament_pharmascan.sql` | GRANT + RLS **`medicaments`**, fonction **`medicaments_user_may_access_pharmacy`** (SECURITY DEFINER) |
| `supabase_rls_users_self_select_pharmascan.sql` | **GRANT SELECT** + RLS **`public.users`** (ligne **`id = auth.uid()`**) pour éviter *permission denied* |
| `supabase_storage_pharmacy_buckets.sql` | Buckets **`pharmacy-photos`**, **`pharmacy-documents`**, **`medication-photos`** + policies **`storage.objects`** |
| `supabase_notifications_table.sql` *(si présent)* | Table **`notifications`**, index, RLS par **`pharmacie_id`** lié au pharmacien |

**Remarque** : d’autres scripts (ex. RLS **`pharmacie`** étendue) peuvent exister dans ton dépôt ; les ajouter à ce tableau pour garder une piste d’audit des migrations.

---

## 10. Sécurité — principes

- La clé **anon** est publique : toute exposition de données doit passer par **RLS** Postgres et **policies Storage**.
- Le rôle **pharmacien** est imposé côté client (**Login** + **AuthContext**) et doit être cohérent avec **`public.users`** / RPC.
- Les chemins Storage sont préfixés par **`auth.uid()`** dans les policies pour isoler les fichiers par utilisateur.

---

## 11. Déploiement front

- **`npm run build`** → sortie **`dist/`** (Vite).
- Hébergement statique (Netlify, Vercel, S3, etc.) avec **SPA fallback** vers `index.html` pour React Router.
- Configurer les **Redirect URLs** Supabase (login, reset-password, etc.) pour l’URL de production.

---

## 12. Pistes d’évolution / cohérence

1. **Une seule source** pour résoudre `pharmacie_id` partout (**`ensurePharmacistRow`** aussi dans **Dashboard** / **Layout** si tu vois des incohérences).
2. **Schéma `medicaments`** : aligner colonnes BDD (PK `id` vs `medicament_id`, `cree_le` vs `created_at`, etc.) avec le front.
3. Remplacer les **`alert`** restants (**Layout**, validations) par le même pattern « toast » que **Medications** / **Profile**.
4. Factoriser le composant **toast** pour éviter la duplication JSX entre pages.

---

*Document généré à partir du code source du projet PharmaScan. Pour toute divergence avec ta base Supabase réelle, prioriser les migrations et les noms de colonnes observés dans le **Table Editor**.*
