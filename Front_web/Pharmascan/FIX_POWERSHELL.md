# Résoudre le problème PowerShell avec npm

## Solution rapide

Ouvrez PowerShell en **administrateur** et exécutez :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis réessayez :
```powershell
npm run dev
```

## Solution alternative (si la première ne fonctionne pas)

Si vous ne pouvez pas changer la politique d'exécution, vous pouvez contourner le problème en utilisant :

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"
```

Ou utilisez directement le chemin complet de npm :

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## Solution permanente (recommandée)

1. Ouvrez PowerShell en **administrateur** (clic droit > Exécuter en tant qu'administrateur)
2. Exécutez :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. Tapez `Y` pour confirmer
4. Fermez et rouvrez votre terminal
5. Essayez à nouveau `npm run dev`

## Vérification

Pour vérifier que ça fonctionne :
```powershell
npm --version
```

Si cela affiche un numéro de version, tout est OK !



