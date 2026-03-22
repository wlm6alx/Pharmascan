# PharmaScan - Espace Pharmacien

Application React pour la gestion des interfaces pharmacien du système PharmaScan.

## Fonctionnalités

### Authentification
- Création de compte pharmacien
- Création de compte avec pharmacie
- Connexion/Déconnexion

### Gestion de pharmacie
- Création et modification de pharmacie
- Gestion de la localisation (latitude/longitude)
- Statut de validation (en attente, validée, rejetée)
- Gestion de la pharmacie de garde

### Gestion des médicaments
- Ajout de médicaments
- Modification et suppression
- Recherche de médicaments
- Gestion de la disponibilité en temps réel
- Mise à jour des quantités

### Statut de la pharmacie
- Mise à jour du statut d'ouverture (ouverte, fermée, occupée)
- Activation/désactivation de la pharmacie de garde

### Profil
- Gestion du profil pharmacien
- Modification des informations personnelles

## Installation

1. Installer les dépendances:
```bash
npm install
```

2. Configurer Supabase:
   - Créer un fichier `.env` à la racine du projet
   - Ajouter vos clés Supabase:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Lancer l'application en mode développement:
```bash
npm run dev
```

## Structure de la base de données Supabase

### Table: `pharmacists`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key vers auth.users)
- `first_name` (text)
- `last_name` (text)
- `phone` (text)
- `email` (text)
- `pharmacy_id` (uuid, foreign key vers pharmacies, nullable)

### Table: `pharmacies`
- `id` (uuid, primary key)
- `name` (text)
- `address` (text)
- `phone` (text, nullable)
- `email` (text, nullable)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `pharmacist_id` (uuid, foreign key vers pharmacists)
- `status` (text: 'pending', 'approved', 'rejected')
- `is_on_duty` (boolean, default: false)
- `created_at` (timestamp)

### Table: `medications`
- `id` (uuid, primary key)
- `pharmacy_id` (uuid, foreign key vers pharmacies)
- `name` (text)
- `dosage` (text, nullable)
- `form` (text, nullable)
- `manufacturer` (text, nullable)
- `barcode` (text, nullable)
- `quantity` (integer, default: 0)
- `available` (boolean, default: true)
- `created_at` (timestamp)

## Technologies utilisées

- React 18
- React Router DOM
- Supabase (authentification et base de données)
- Tailwind CSS
- Vite
- Lucide React (icônes)

## Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise la build de production
- `npm run lint` - Lance le linter ESLint

## Mise en ligne sur GitHub

Pour mettre ce projet sur GitHub, consultez le guide détaillé dans [GITHUB_SETUP.md](./GITHUB_SETUP.md)

### Commandes rapides (après installation de Git)

```bash
# Initialiser Git
git init
git add .
git commit -m "Initial commit - Projet PharmaScan"

# Créer un dépôt sur GitHub, puis :
git remote add origin https://github.com/VOTRE_USERNAME/pharmascan.git
git branch -M main
git push -u origin main
```

## Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request



