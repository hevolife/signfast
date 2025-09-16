# Déploiement SignFast avec PM2

## Prérequis

1. **Installer PM2 globalement :**
```bash
npm install -g pm2
```

2. **Installer serve globalement :**
```bash
npm install -g serve
```

## Déploiement

### 1. Construire le projet
```bash
npm run build
```

### 2. Démarrer avec PM2
```bash
# Option 1: Utiliser le fichier de configuration
npm run pm2:start

# Option 2: Commande directe
pm2 start "serve ./dist -s -l 3000" --name "signfast"
```

### 3. Vérifier le statut
```bash
npm run pm2:status
# ou
pm2 list
```

## Commandes utiles

### Gestion du processus
```bash
# Redémarrer l'application
npm run pm2:restart

# Arrêter l'application
npm run pm2:stop

# Supprimer l'application de PM2
npm run pm2:delete

# Voir les logs
npm run pm2:logs
```

### Monitoring
```bash
# Voir les logs en temps réel
pm2 logs signfast

# Monitoring en temps réel
pm2 monit

# Informations détaillées
pm2 show signfast
```

### Sauvegarde de la configuration PM2
```bash
# Sauvegarder la configuration actuelle
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup
```

## Configuration avancée

Le fichier `ecosystem.config.js` contient la configuration PM2 avec :
- Redémarrage automatique en cas de crash
- Limitation mémoire à 1GB
- Logs rotatifs
- Variables d'environnement

## Dépannage

### Si le port 3000 est occupé
Modifiez le port dans `ecosystem.config.js` :
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3001  // Changez le port ici
}
```

### Si serve n'est pas trouvé
```bash
# Installer serve globalement
npm install -g serve

# Ou utiliser npx
pm2 start "npx serve ./dist -s -l 3000" --name "signfast"
```

### Vérifier que l'application fonctionne
```bash
curl http://localhost:3000
```

## Variables d'environnement

Assurez-vous que votre fichier `.env` contient les bonnes variables pour la production :
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```