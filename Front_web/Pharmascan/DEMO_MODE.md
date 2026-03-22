# Mode Démo - Test des Interfaces

L'application fonctionne maintenant en **mode démo** sans nécessiter de configuration Supabase !

## 🚀 Lancer l'application en mode démo

### Prérequis
- Node.js installé (version 16 ou supérieure)
- npm installé

### Étapes

1. **Installer les dépendances** (si pas déjà fait) :
```bash
npm install
```

2. **Lancer l'application** :
```bash
npm run dev
```

3. **Accéder à l'application** :
   - Ouvrez votre navigateur sur `http://localhost:5173`

## 🔐 Connexion en mode démo

En mode démo, vous pouvez vous connecter avec **n'importe quel email et mot de passe** !

Exemples :
- Email : `test@demo.com`
- Mot de passe : `test123`

ou

- Email : `pharmacien@example.com`
- Mot de passe : `password`

## ✨ Fonctionnalités disponibles en mode démo

- ✅ **Page de connexion** - Design split 60/40
- ✅ **Page d'inscription** - Formulaire complet avec upload
- ✅ **Dashboard** - KPIs et graphiques avec données mockées
- ✅ **Gestion des médicaments** - Ajout, modification, suppression (données en mémoire)
- ✅ **Profil pharmacien** - Affichage et modification (données mockées)
- ✅ **Notifications** - Liste des notifications (données mockées)
- ✅ **Toggle statut pharmacie** - Fermé/Ouvert (fonctionnel en mémoire)

## 📝 Notes importantes

- Les données sont stockées **en mémoire** (localStorage pour l'authentification)
- Les modifications ne sont **pas persistées** après rechargement de la page
- Le mode démo est **automatiquement activé** si Supabase n'est pas configuré
- Pour passer en mode production, configurez Supabase (voir `SUPABASE_SETUP.md`)

## 🎨 Interfaces testables

Toutes les interfaces sont fonctionnelles et correspondent exactement aux maquettes :
- Design split pour login/register
- Sidebar beige avec toggle
- Dashboard avec KPIs et graphiques
- Table des médicaments avec modal
- Profil avec modal d'édition
- Notifications avec table

## 🔄 Passer en mode production

Quand vous serez prêt à utiliser Supabase :
1. Créez un projet Supabase
2. Exécutez le script SQL (`supabase-schema.sql`)
3. Créez un fichier `.env` avec vos clés Supabase
4. L'application passera automatiquement en mode production



