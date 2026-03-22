# Guide de configuration Supabase

Ce guide vous explique comment configurer votre base de données Supabase pour l'application PharmaScan - Espace Pharmacien.

## Étapes de configuration

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez l'URL de votre projet et la clé anonyme (anon key)

### 2. Exécuter le schéma SQL

1. Dans votre projet Supabase, allez dans l'éditeur SQL
2. Copiez le contenu du fichier `supabase-schema.sql`
3. Collez-le dans l'éditeur SQL
4. Exécutez le script

Ce script va créer :
- Les tables `pharmacists`, `pharmacies`, et `medications`
- Les index pour améliorer les performances
- Les triggers pour mettre à jour automatiquement `updated_at`
- Les politiques de sécurité Row Level Security (RLS)

### 3. Configurer l'authentification

1. Dans Supabase, allez dans **Authentication** > **Settings**
2. Activez l'authentification par email
3. Configurez les paramètres selon vos besoins :
   - Confirmation d'email (recommandé pour la production)
   - Durée de session
   - etc.

### 4. Créer les buckets de stockage

1. Dans Supabase, allez dans **Storage**
2. Créez deux buckets :
   - **pharmacy-documents** : pour les attestations de pharmacie
     - Rendez-le public ou configurez les politiques RLS selon vos besoins
   - **pharmacy-photos** : pour les photos de pharmacie
     - Rendez-le public ou configurez les politiques RLS selon vos besoins
3. Configurez les politiques de stockage pour permettre l'upload aux utilisateurs authentifiés

### 5. Configurer les variables d'environnement

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez vos clés Supabase :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

Vous pouvez trouver ces valeurs dans :
- **Settings** > **API** > **Project URL** (pour l'URL)
- **Settings** > **API** > **anon public** (pour la clé)

### 6. Tester la connexion

1. Lancez l'application : `npm run dev`
2. Essayez de créer un compte pharmacien
3. Vérifiez dans Supabase que les données sont bien créées

## Structure des tables

### Table `pharmacists`
Contient les informations des pharmaciens.

### Table `pharmacies`
Contient les informations des pharmacies. Le statut peut être :
- `pending` : En attente de validation par l'administrateur
- `approved` : Validée par l'administrateur
- `rejected` : Rejetée par l'administrateur

### Table `medications`
Contient les médicaments associés à chaque pharmacie.

## Sécurité (RLS)

Les politiques Row Level Security sont configurées pour que :
- Chaque pharmacien ne puisse voir et modifier que ses propres données
- Les pharmaciens ne puissent gérer que les médicaments de leur propre pharmacie
- Les données soient protégées même si quelqu'un obtient la clé API

## Notes importantes

- **Ne partagez jamais** votre clé de service (service_role key) publiquement
- La clé anonyme (anon key) peut être utilisée côté client car les politiques RLS protègent les données
- Pour la production, activez la confirmation d'email
- Configurez les règles de mot de passe selon vos besoins de sécurité

## Dépannage

### Erreur : "relation does not exist"
- Vérifiez que vous avez bien exécuté le script SQL
- Vérifiez que vous êtes connecté au bon projet Supabase

### Erreur : "new row violates row-level security policy"
- Vérifiez que les politiques RLS sont bien créées
- Vérifiez que l'utilisateur est bien authentifié

### Erreur : "permission denied"
- Vérifiez que les politiques RLS permettent l'action souhaitée
- Vérifiez que l'utilisateur a les bonnes permissions

