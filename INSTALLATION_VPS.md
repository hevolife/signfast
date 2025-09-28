# 🚀 Installation SignFast sur VPS - Guide Complet

## 📋 Prérequis

### Serveur VPS recommandé :
- **OS** : Ubuntu 22.04 LTS ou Debian 11+
- **RAM** : Minimum 2GB (4GB recommandé)
- **CPU** : 2 vCPU minimum
- **Stockage** : 20GB SSD minimum
- **Bande passante** : Illimitée

### Domaine et DNS :
- Nom de domaine pointant vers votre VPS
- Accès aux paramètres DNS

---

## 🔧 Étape 1 : Préparation du serveur

### 1.1 Connexion SSH
```bash
ssh root@VOTRE_IP_VPS
# ou
ssh ubuntu@VOTRE_IP_VPS
```

### 1.2 Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip software-properties-common
```

### 1.3 Création d'un utilisateur dédié
```bash
# Créer l'utilisateur signfast
sudo adduser signfast
sudo usermod -aG sudo signfast

# Passer à l'utilisateur signfast
su - signfast
```

---

## 📦 Étape 2 : Installation de Node.js

### 2.1 Installation via NodeSource
```bash
# Installer Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version   # Doit afficher 10.x.x
```

### 2.2 Installation de PM2 (gestionnaire de processus)
```bash
sudo npm install -g pm2
sudo npm install -g serve
```

---

## 🌐 Étape 3 : Configuration Nginx

### 3.1 Installation de Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.2 Configuration du site
```bash
# Créer la configuration du site
sudo nano /etc/nginx/sites-available/signfast
```

**Contenu du fichier `/etc/nginx/sites-available/signfast` :**
```nginx
server {
    listen 80;
    server_name VOTRE_DOMAINE.com www.VOTRE_DOMAINE.com;
    
    # Redirection HTTPS (sera configuré avec Certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name VOTRE_DOMAINE.com www.VOTRE_DOMAINE.com;
    
    # Certificats SSL (seront générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/VOTRE_DOMAINE.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/VOTRE_DOMAINE.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self';" always;
    
    # Configuration pour PWA
    add_header Service-Worker-Allowed "/" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache statique
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Configuration principale
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Gestion des erreurs
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
```

### 3.3 Activation du site
```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/signfast /etc/nginx/sites-enabled/

# Désactiver le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## 🔒 Étape 4 : Configuration SSL avec Let's Encrypt

### 4.1 Installation de Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4.2 Génération du certificat SSL
```bash
# Remplacez VOTRE_DOMAINE.com par votre vrai domaine
sudo certbot --nginx -d VOTRE_DOMAINE.com -d www.VOTRE_DOMAINE.com

# Suivre les instructions interactives :
# 1. Entrer votre email
# 2. Accepter les conditions
# 3. Choisir si vous voulez partager votre email (optionnel)
```

### 4.3 Test du renouvellement automatique
```bash
sudo certbot renew --dry-run
```

---

## 📁 Étape 5 : Déploiement de l'application

### 5.1 Création du répertoire de l'application
```bash
# Créer le répertoire
sudo mkdir -p /var/www/signfast
sudo chown signfast:signfast /var/www/signfast
cd /var/www/signfast
```

### 5.2 Clonage ou upload des fichiers

**Option A : Upload direct (recommandé)**
```bash
# Sur votre machine locale, créer l'archive
npm run build
tar -czf signfast-dist.tar.gz dist/ package.json ecosystem.config.js

# Uploader sur le serveur (depuis votre machine locale)
scp signfast-dist.tar.gz signfast@VOTRE_IP_VPS:/var/www/signfast/

# Sur le serveur, extraire
cd /var/www/signfast
tar -xzf signfast-dist.tar.gz
```

**Option B : Git (si vous avez un repo)**
```bash
git clone https://github.com/VOTRE_USERNAME/signfast.git .
npm install
npm run build
```

### 5.3 Configuration des variables d'environnement
```bash
# Créer le fichier .env
nano .env
```

**Contenu du fichier `.env` :**
```env
NODE_ENV=production
PORT=3000
VITE_SUPABASE_URL=https://VOTRE_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
```

---

## 🚀 Étape 6 : Configuration PM2

### 6.1 Fichier de configuration PM2
Le fichier `ecosystem.config.js` est déjà présent dans votre projet :

```javascript
module.exports = {
  apps: [
    {
      name: 'signfast',
      script: 'serve',
      args: './dist -s -l 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
```

### 6.2 Création du répertoire de logs
```bash
mkdir -p /var/www/signfast/logs
```

### 6.3 Démarrage de l'application
```bash
cd /var/www/signfast

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
# Suivre les instructions affichées (copier-coller la commande sudo)

# Vérifier le statut
pm2 status
pm2 logs signfast
```

---

## 🔥 Étape 7 : Configuration du Firewall

### 7.1 Configuration UFW
```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH
sudo ufw allow ssh
sudo ufw allow 22

# Autoriser HTTP et HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Vérifier les règles
sudo ufw status
```

---

## 🗄️ Étape 8 : Configuration Supabase (Base de données)

### 8.1 Création du projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anonyme

### 8.2 Configuration des variables
```bash
# Mettre à jour le fichier .env
nano /var/www/signfast/.env
```

Ajouter vos vraies variables Supabase :
```env
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key-ici
```

### 8.3 Redémarrage après configuration
```bash
pm2 restart signfast
```

---

## 📊 Étape 9 : Monitoring et maintenance

### 9.1 Scripts de maintenance
```bash
# Créer un script de mise à jour
nano /var/www/signfast/update.sh
```

**Contenu du script `update.sh` :**
```bash
#!/bin/bash
cd /var/www/signfast

echo "🔄 Mise à jour SignFast..."

# Sauvegarder l'ancienne version
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Arrêter l'application
pm2 stop signfast

# Mettre à jour les fichiers (upload manuel ou git pull)
echo "📁 Remplacez le dossier 'dist' par la nouvelle version"
echo "⏸️  Appuyez sur Entrée quand c'est fait..."
read

# Redémarrer l'application
pm2 start signfast

# Vérifier le statut
pm2 status

echo "✅ Mise à jour terminée !"
```

```bash
# Rendre le script exécutable
chmod +x /var/www/signfast/update.sh
```

### 9.2 Surveillance des logs
```bash
# Voir les logs en temps réel
pm2 logs signfast

# Voir les logs d'erreur uniquement
pm2 logs signfast --err

# Monitoring en temps réel
pm2 monit
```

### 9.3 Commandes utiles
```bash
# Redémarrer l'application
pm2 restart signfast

# Arrêter l'application
pm2 stop signfast

# Voir les informations détaillées
pm2 show signfast

# Vider les logs
pm2 flush signfast
```

---

## 🔄 Étape 10 : Automatisation des sauvegardes

### 10.1 Script de sauvegarde
```bash
# Créer le script de sauvegarde
nano /var/www/signfast/backup.sh
```

**Contenu du script `backup.sh` :**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/signfast"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le répertoire de sauvegarde
sudo mkdir -p $BACKUP_DIR

# Sauvegarder l'application
sudo tar -czf $BACKUP_DIR/signfast_$DATE.tar.gz -C /var/www signfast

# Garder seulement les 7 dernières sauvegardes
sudo find $BACKUP_DIR -name "signfast_*.tar.gz" -mtime +7 -delete

echo "✅ Sauvegarde créée : $BACKUP_DIR/signfast_$DATE.tar.gz"
```

```bash
# Rendre exécutable
chmod +x /var/www/signfast/backup.sh

# Ajouter au crontab pour sauvegarde quotidienne
crontab -e
# Ajouter cette ligne :
0 2 * * * /var/www/signfast/backup.sh
```

---

## 🔍 Étape 11 : Vérification et tests

### 11.1 Tests de fonctionnement
```bash
# Vérifier que Nginx fonctionne
sudo systemctl status nginx

# Vérifier que l'application fonctionne
pm2 status
curl http://localhost:3000

# Vérifier le SSL
curl -I https://VOTRE_DOMAINE.com
```

### 11.2 Tests de performance
```bash
# Installer htop pour monitoring
sudo apt install -y htop

# Surveiller les ressources
htop

# Tester la charge
sudo apt install -y apache2-utils
ab -n 100 -c 10 https://VOTRE_DOMAINE.com/
```

---

## 🛡️ Étape 12 : Sécurisation avancée

### 12.1 Configuration SSH sécurisée
```bash
# Éditer la configuration SSH
sudo nano /etc/ssh/sshd_config
```

**Modifications recommandées :**
```
# Désactiver l'authentification par mot de passe root
PermitRootLogin no

# Changer le port SSH (optionnel)
Port 2222

# Désactiver l'authentification par mot de passe (si vous utilisez des clés)
PasswordAuthentication no
```

```bash
# Redémarrer SSH
sudo systemctl restart ssh
```

### 12.2 Installation de Fail2Ban
```bash
# Installer Fail2Ban
sudo apt install -y fail2ban

# Créer la configuration
sudo nano /etc/fail2ban/jail.local
```

**Contenu de `/etc/fail2ban/jail.local` :**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
```

```bash
# Démarrer Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 📈 Étape 13 : Monitoring et alertes

### 13.1 Installation de Netdata (monitoring)
```bash
# Installation automatique
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Configuration Nginx pour Netdata
sudo nano /etc/nginx/sites-available/netdata
```

**Contenu pour Netdata :**
```nginx
server {
    listen 80;
    server_name monitoring.VOTRE_DOMAINE.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitoring.VOTRE_DOMAINE.com;
    
    ssl_certificate /etc/letsencrypt/live/VOTRE_DOMAINE.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/VOTRE_DOMAINE.com/privkey.pem;
    
    auth_basic "Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    location / {
        proxy_pass http://localhost:19999;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Créer un utilisateur pour l'accès monitoring
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Activer le site monitoring
sudo ln -s /etc/nginx/sites-available/netdata /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Générer le certificat pour le sous-domaine monitoring
sudo certbot --nginx -d monitoring.VOTRE_DOMAINE.com
```

---

## 🔄 Étape 14 : Mise à jour automatique

### 14.1 Script de déploiement automatique
```bash
nano /var/www/signfast/deploy.sh
```

**Contenu du script `deploy.sh` :**
```bash
#!/bin/bash
set -e

APP_DIR="/var/www/signfast"
BACKUP_DIR="/var/backups/signfast"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Déploiement SignFast - $DATE"

# Aller dans le répertoire de l'application
cd $APP_DIR

# Créer une sauvegarde
echo "💾 Création sauvegarde..."
sudo mkdir -p $BACKUP_DIR
sudo tar -czf $BACKUP_DIR/signfast_pre_deploy_$DATE.tar.gz dist/

# Arrêter l'application
echo "⏹️  Arrêt de l'application..."
pm2 stop signfast

# Sauvegarder l'ancien build
echo "📦 Sauvegarde ancien build..."
mv dist dist.old.$DATE

# Ici vous devez uploader le nouveau build dans le dossier 'dist'
echo "📁 Uploadez le nouveau dossier 'dist' maintenant"
echo "⏸️  Appuyez sur Entrée quand c'est fait..."
read

# Vérifier que le nouveau build existe
if [ ! -d "dist" ]; then
    echo "❌ Erreur : dossier 'dist' non trouvé !"
    echo "🔄 Restauration de l'ancien build..."
    mv dist.old.$DATE dist
    pm2 start signfast
    exit 1
fi

# Redémarrer l'application
echo "🚀 Redémarrage de l'application..."
pm2 start signfast

# Attendre que l'application démarre
sleep 5

# Vérifier que l'application fonctionne
if pm2 list | grep -q "online.*signfast"; then
    echo "✅ Déploiement réussi !"
    echo "🗑️  Nettoyage ancien build..."
    rm -rf dist.old.$DATE
    
    # Test de santé
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Application accessible sur http://localhost:3000"
    else
        echo "⚠️  Attention : Application non accessible localement"
    fi
else
    echo "❌ Erreur : Application non démarrée !"
    echo "🔄 Restauration de l'ancien build..."
    pm2 stop signfast
    rm -rf dist
    mv dist.old.$DATE dist
    pm2 start signfast
    exit 1
fi

echo "🎉 Déploiement terminé avec succès !"
```

```bash
chmod +x /var/www/signfast/deploy.sh
```

---

## 📋 Étape 15 : Checklist finale

### ✅ Vérifications obligatoires :

1. **DNS configuré** : `VOTRE_DOMAINE.com` pointe vers l'IP du VPS
2. **SSL actif** : `https://VOTRE_DOMAINE.com` fonctionne
3. **Application accessible** : Site charge correctement
4. **PM2 configuré** : `pm2 status` montre l'app en ligne
5. **Nginx configuré** : `sudo nginx -t` sans erreur
6. **Firewall actif** : `sudo ufw status` montre les règles
7. **Supabase connecté** : Variables d'environnement correctes
8. **Certificat SSL** : Renouvellement automatique configuré

### 🔧 Commandes de diagnostic :
```bash
# Statut général du système
sudo systemctl status nginx
sudo systemctl status fail2ban
pm2 status

# Logs en cas de problème
sudo tail -f /var/log/nginx/error.log
pm2 logs signfast --lines 50

# Test de connectivité
curl -I https://VOTRE_DOMAINE.com
```

---

## 🆘 Dépannage courant

### Problème : Application ne démarre pas
```bash
# Vérifier les logs PM2
pm2 logs signfast

# Vérifier que serve est installé
npm list -g serve

# Réinstaller serve si nécessaire
sudo npm install -g serve
```

### Problème : Erreur 502 Bad Gateway
```bash
# Vérifier que l'application écoute sur le port 3000
netstat -tlnp | grep 3000

# Redémarrer l'application
pm2 restart signfast
```

### Problème : SSL ne fonctionne pas
```bash
# Vérifier les certificats
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew

# Vérifier la configuration Nginx
sudo nginx -t
```

---

## 🎯 Optimisations de performance

### Cache navigateur optimisé
Ajoutez dans votre configuration Nginx :
```nginx
# Cache agressif pour les assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# Cache pour le HTML
location ~* \.(html)$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}
```

### Compression Brotli (optionnel)
```bash
# Installer le module Brotli
sudo apt install -y nginx-module-brotli

# Ajouter dans /etc/nginx/nginx.conf
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

# Configuration Brotli
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

---

## 🎉 Félicitations !

Votre application SignFast est maintenant installée et sécurisée sur votre VPS !

**URLs importantes :**
- 🌐 **Application** : https://VOTRE_DOMAINE.com
- 📊 **Monitoring** : https://monitoring.VOTRE_DOMAINE.com
- 🔧 **SSH** : `ssh signfast@VOTRE_IP_VPS`

**Commandes de maintenance quotidienne :**
```bash
# Vérifier le statut
pm2 status && sudo systemctl status nginx

# Voir les logs
pm2 logs signfast --lines 20

# Redémarrer si nécessaire
pm2 restart signfast
```