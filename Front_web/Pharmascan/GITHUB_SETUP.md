# Guide pour mettre le projet sur GitHub

## Prérequis

1. **Installer Git** (si ce n'est pas déjà fait)
   - Téléchargez Git depuis : https://git-scm.com/download/win
   - Installez-le avec les options par défaut
   - Redémarrez votre terminal après l'installation

2. **Créer un compte GitHub** (si vous n'en avez pas)
   - Allez sur : https://github.com
   - Créez un compte gratuit

## Étapes pour mettre le projet sur GitHub

### 1. Initialiser Git dans le projet

Ouvrez un terminal PowerShell ou Git Bash dans le dossier du projet et exécutez :

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Initial commit - Projet PharmaScan"
```

### 2. Créer un dépôt sur GitHub

1. Allez sur https://github.com
2. Cliquez sur le bouton **"+"** en haut à droite
3. Sélectionnez **"New repository"**
4. Remplissez les informations :
   - **Repository name** : `pharmascan` (ou un autre nom)
   - **Description** : "Application de gestion de pharmacie"
   - **Visibility** : Choisissez Public ou Private
   - **NE COCHEZ PAS** "Initialize this repository with a README"
5. Cliquez sur **"Create repository"**

### 3. Lier le projet local à GitHub

Après avoir créé le dépôt, GitHub vous donnera des instructions. Exécutez ces commandes dans votre terminal :

```bash
# Ajouter le dépôt distant (remplacez VOTRE_USERNAME par votre nom d'utilisateur GitHub)
git remote add origin https://github.com/VOTRE_USERNAME/pharmascan.git

# Renommer la branche principale en main (si nécessaire)
git branch -M main

# Pousser le code vers GitHub
git push -u origin main
```

### 4. Commandes Git utiles pour la suite

```bash
# Voir l'état des fichiers modifiés
git status

# Ajouter des fichiers modifiés
git add .

# Faire un commit
git commit -m "Description des modifications"

# Pousser vers GitHub
git push

# Récupérer les dernières modifications
git pull
```

## ⚠️ Important : Fichiers sensibles

**NE COMMITEZ JAMAIS** :
- Les fichiers `.env` contenant vos clés API
- Les mots de passe
- Les clés privées

Le fichier `.gitignore` est déjà configuré pour exclure ces fichiers automatiquement.

## Structure recommandée pour les commits

Utilisez des messages de commit clairs :
- `feat: Ajout de la fonctionnalité X`
- `fix: Correction du bug Y`
- `style: Amélioration du design`
- `refactor: Refactorisation du code`

## Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez que Git est bien installé : `git --version`
2. Vérifiez que vous êtes connecté à GitHub
3. Consultez la documentation GitHub : https://docs.github.com

