# Script pour lancer l'application PharmaScan
# Ajoute Node.js au PATH et lance l'application

# Ajouter Node.js au PATH pour cette session
$env:Path += ";C:\Program Files\nodejs"

# Vérifier que Node.js est accessible
Write-Host "Vérification de Node.js..." -ForegroundColor Cyan
node --version
npm --version

# Installer les dépendances si nécessaire
if (-not (Test-Path node_modules)) {
    Write-Host "Installation des dépendances..." -ForegroundColor Yellow
    npm install
}

# Lancer l'application
Write-Host "`nDémarrage de l'application..." -ForegroundColor Green
Write-Host "L'application sera accessible sur: http://localhost:5173" -ForegroundColor Green
Write-Host "Appuyez sur Ctrl+C pour arrêter l'application`n" -ForegroundColor Yellow

npm run dev



