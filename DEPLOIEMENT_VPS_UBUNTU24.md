# 🚀 Guide Complet de Déploiement SignFast sur VPS Ubuntu 24

## 📋 Prérequis

### Serveur VPS recommandé :
- **OS** : Ubuntu 24.04 LTS
- **RAM** : Minimum 2GB (4GB recommandé pour de meilleures performances)
- **CPU** : 2 vCPU minimum
- **Stockage** : 20GB SSD minimum (50GB recommandé)
- **Bande passante** : Illimitée
- **Accès** : Root ou sudo

### Domaine et DNS :
- Nom de domaine pointant vers votre VPS
- Accès aux paramètres DNS de votre registrar

---

## 🔧 Étape 1 : Préparation du serveur Ubuntu 24

### 1.1 Connexion SSH
```bash
# Connexion en tant que root
ssh root@VOTRE_IP_VPS

# Ou avec un utilisateur sudo
ssh ubuntu@VOTRE_IP_VPS
```

### 1.2 Mise à jour complète du système
```bash
# Mise à jour des paquets
sudo apt update && sudo apt upgrade -y

# Installation des outils essentiels
sudo apt install -y curl wget git unzip software-properties-common \
  build-essential apt-transport-https ca-certificates gnupg lsb-release \
  ufw fail2ban htop nano vim

# Redémarrer si nécessaire
sudo reboot
```

### 1.3 Création d'un utilisateur dédié
```bash
# Créer l'utilisateur signfast
sudo adduser signfast
sudo usermod -aG sudo signfast

# Configurer SSH pour l'utilisateur (optionnel mais recommandé)
sudo mkdir -p /home/signfast/.ssh
sudo cp ~/.ssh/authorized_keys /home/signfast/.ssh/ 2>/dev/null || true
sudo chown -R signfast:signfast /home/signfast/.ssh
sudo chmod 700 /home/signfast/.ssh
sudo chmod 600 /home/signfast/.ssh/authorized_keys 2>/dev/null || true

# Passer à l'utilisateur signfast
su - signfast
```

---

## 📦 Étape 2 : Installation de Node.js 20 LTS

### 2.1 Installation via NodeSource (méthode recommandée)
```bash
# Télécharger et installer le script de configuration NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js 20 LTS
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version   # Doit afficher 10.x.x
```

### 2.2 Installation des gestionnaires de processus
```bash
# Installer PM2 globalement (gestionnaire de processus)
sudo npm install -g pm2

# Installer serve globalement (serveur de fichiers statiques)
sudo npm install -g serve

# Vérifier les installations
pm2 --version
serve --version
```

---

## 🌐 Étape 3 : Configuration Nginx

### 3.1 Installation de Nginx
```bash
# Installer Nginx
sudo apt install -y nginx

# Démarrer et activer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier le statut
sudo systemctl status nginx
```

### 3.2 Configuration du site SignFast
```bash
# Créer la configuration du site
sudo nano /etc/nginx/sites-available/signfast
```

**Contenu du fichier `/etc/nginx/sites-available/signfast` :**
```nginx
# Configuration HTTP (redirection vers HTTPS)
server {
    listen 80;
    server_name VOTRE_DOMAINE.com www.VOTRE_DOMAINE.com;
    
    # Redirection forcée vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS principale
server {
    listen 443 ssl http2;
    server_name VOTRE_DOMAINE.com www.VOTRE_DOMAINE.com;
    
    # Certificats SSL (seront générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/VOTRE_DOMAINE.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/VOTRE_DOMAINE.com/privkey.pem;
    
    # Configuration SSL moderne et sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Headers de sécurité renforcés
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self';" always;
    
    # Configuration PWA
    add_header Service-Worker-Allowed "/" always;
    
    # Compression Gzip optimisée
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # Cache agressif pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        access_log off;
    }
    
    # Cache pour les fichiers HTML
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Configuration principale pour l'application
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
        
        # Timeouts optimisés
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer sizes
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Gestion des erreurs avec fallback vers index.html (SPA)
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
    
    # Sécurité supplémentaire
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Bloquer les fichiers sensibles
    location ~* \.(env|log|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 3.3 Activation du site
```bash
# Activer le site SignFast
sudo ln -s /etc/nginx/sites-available/signfast /etc/nginx/sites-enabled/

# Désactiver le site par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
sudo nginx -t

# Si le test est OK, redémarrer Nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 🔒 Étape 4 : Configuration SSL avec Let's Encrypt

### 4.1 Installation de Certbot
```bash
# Installer Certbot et le plugin Nginx
sudo apt install -y certbot python3-certbot-nginx

# Vérifier l'installation
certbot --version
```

### 4.2 Génération du certificat SSL
```bash
# IMPORTANT: Remplacez VOTRE_DOMAINE.com par votre vrai domaine
sudo certbot --nginx -d VOTRE_DOMAINE.com -d www.VOTRE_DOMAINE.com

# Suivre les instructions interactives :
# 1. Entrer votre email pour les notifications
# 2. Accepter les conditions d'utilisation (A)
# 3. Choisir si vous voulez partager votre email (Y/N)
# 4. Certbot configurera automatiquement Nginx
```

### 4.3 Test du renouvellement automatique
```bash
# Tester le renouvellement (simulation)
sudo certbot renew --dry-run

# Si le test réussit, le renouvellement automatique est configuré
```

---

## 📁 Étape 5 : Déploiement de l'application SignFast

### 5.1 Création du répertoire de l'application
```bash
# Créer le répertoire principal
sudo mkdir -p /var/www/signfast
sudo chown signfast:signfast /var/www/signfast

# Créer les sous-répertoires
cd /var/www/signfast
mkdir -p logs backups
```

### 5.2 Upload des fichiers de production

**Option A : Upload direct via SCP (recommandé)**
```bash
# Sur votre machine locale, créer l'archive du build
# (Assurez-vous d'avoir fait 'npm run build' avant)
tar -czf signfast-production.tar.gz dist/ package.json ecosystem.config.js

# Uploader sur le serveur
scp signfast-production.tar.gz signfast@VOTRE_IP_VPS:/var/www/signfast/

# Sur le serveur, extraire les fichiers
cd /var/www/signfast
tar -xzf signfast-production.tar.gz
ls -la  # Vérifier que dist/ existe
```

**Option B : Clone Git (si vous avez un repository)**
```bash
# Cloner le repository
cd /var/www/signfast
git clone https://github.com/VOTRE_USERNAME/signfast.git .

# Installer les dépendances
npm ci --only=production

# Construire l'application
npm run build
```

### 5.3 Configuration des variables d'environnement
```bash
# Créer le fichier .env de production
cd /var/www/signfast
nano .env
```

**Contenu du fichier `.env` :**
```env
NODE_ENV=production
PORT=3000

# Variables Supabase (REMPLACEZ par vos vraies valeurs)
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY_ICI

# Variables optionnelles
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

---

## 🚀 Étape 6 : Configuration PM2 pour la production

### 6.1 Vérification du fichier de configuration PM2
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

### 6.2 Démarrage de l'application avec PM2
```bash
cd /var/www/signfast

# Vérifier que le dossier dist existe
ls -la dist/

# Démarrer l'application avec PM2
pm2 start ecosystem.config.js

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs signfast

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup
# IMPORTANT: Suivre les instructions affichées (copier-coller la commande sudo)
```

### 6.3 Vérification du fonctionnement
```bash
# Tester l'accès local
curl http://localhost:3000

# Vérifier les processus
pm2 list
pm2 show signfast

# Vérifier les logs
pm2 logs signfast --lines 20
```

---

## 🔥 Étape 7 : Configuration du Firewall UFW

### 7.1 Configuration de base
```bash
# Réinitialiser UFW (optionnel)
sudo ufw --force reset

# Politique par défaut : refuser les connexions entrantes
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH (IMPORTANT : à faire avant d'activer UFW)
sudo ufw allow ssh
sudo ufw allow 22

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Autoriser des IPs spécifiques pour SSH (optionnel mais recommandé)
# sudo ufw allow from VOTRE_IP_FIXE to any port 22

# Activer le firewall
sudo ufw enable

# Vérifier les règles
sudo ufw status verbose
```

---

## 🗄️ Étape 8 : Configuration Supabase

### 8.1 Création du projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir une région proche (Europe West pour la France)
4. Noter l'URL du projet et la clé anonyme

### 8.2 Configuration des variables d'environnement
```bash
# Mettre à jour le fichier .env avec vos vraies variables
cd /var/www/signfast
nano .env
```

**Remplacez par vos vraies valeurs :**
```env
NODE_ENV=production
PORT=3000

# REMPLACEZ ces valeurs par les vôtres depuis Supabase
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Variables optionnelles
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

### 8.3 Redémarrage après configuration
```bash
# Redémarrer l'application pour prendre en compte les nouvelles variables
pm2 restart signfast

# Vérifier que tout fonctionne
pm2 logs signfast --lines 10
curl http://localhost:3000
```

---

## 🛡️ Étape 9 : Sécurisation avancée

### 9.1 Configuration SSH sécurisée
```bash
# Sauvegarder la configuration SSH
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Éditer la configuration SSH
sudo nano /etc/ssh/sshd_config
```

**Modifications recommandées dans `/etc/ssh/sshd_config` :**
```bash
# Désactiver l'authentification root
PermitRootLogin no

# Changer le port SSH (optionnel mais recommandé)
Port 2222

# Désactiver l'authentification par mot de passe si vous utilisez des clés
# PasswordAuthentication no

# Limiter les utilisateurs autorisés
AllowUsers signfast

# Timeout de connexion
ClientAliveInterval 300
ClientAliveCountMax 2

# Désactiver les connexions X11
X11Forwarding no
```

```bash
# Redémarrer SSH avec la nouvelle configuration
sudo systemctl restart ssh

# ATTENTION: Si vous avez changé le port, reconnectez-vous avec :
# ssh -p 2222 signfast@VOTRE_IP_VPS
```

### 9.2 Configuration de Fail2Ban
```bash
# Installer Fail2Ban
sudo apt install -y fail2ban

# Créer la configuration locale
sudo nano /etc/fail2ban/jail.local
```

**Contenu de `/etc/fail2ban/jail.local` :**
```ini
[DEFAULT]
# Durée de bannissement (1 heure)
bantime = 3600
# Fenêtre de temps pour compter les tentatives (10 minutes)
findtime = 600
# Nombre maximum de tentatives
maxretry = 5
# Email pour les notifications (optionnel)
# destemail = admin@votre-domaine.com

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
```

```bash
# Démarrer et activer Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Vérifier le statut
sudo systemctl status fail2ban
sudo fail2ban-client status
```

---

## 📊 Étape 10 : Monitoring avec Netdata (optionnel)

### 10.1 Installation de Netdata
```bash
# Installation automatique de Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --stable-channel

# Vérifier que Netdata fonctionne
sudo systemctl status netdata
```

### 10.2 Configuration Nginx pour Netdata
```bash
# Créer la configuration pour le monitoring
sudo nano /etc/nginx/sites-available/netdata
```

**Contenu pour le monitoring :**
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
    
    # Authentification basique
    auth_basic "Monitoring SignFast";
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
# Entrer un mot de passe sécurisé

# Activer le site monitoring
sudo ln -s /etc/nginx/sites-available/netdata /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Générer le certificat SSL pour le sous-domaine
sudo certbot --nginx -d monitoring.VOTRE_DOMAINE.com
```

---

## 🔄 Étape 11 : Scripts de maintenance et mise à jour

### 11.1 Script de déploiement automatique
```bash
# Créer le script de déploiement
nano /var/www/signfast/deploy.sh
```

**Contenu du script `deploy.sh` :**
```bash
#!/bin/bash
set -e

APP_DIR="/var/www/signfast"
BACKUP_DIR="/var/backups/signfast"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 === DÉPLOIEMENT SIGNFAST PRODUCTION ==="
echo "📅 Date: $DATE"

# Aller dans le répertoire de l'application
cd $APP_DIR

# Créer le répertoire de sauvegarde
sudo mkdir -p $BACKUP_DIR

# Sauvegarder l'ancien build
echo "💾 Création sauvegarde..."
if [ -d "dist" ]; then
    sudo tar -czf $BACKUP_DIR/signfast_backup_$DATE.tar.gz dist/ package.json ecosystem.config.js .env
    echo "✅ Sauvegarde créée: $BACKUP_DIR/signfast_backup_$DATE.tar.gz"
fi

# Arrêter l'application
echo "⏹️  Arrêt de l'application..."
pm2 stop signfast

# Sauvegarder l'ancien build localement
if [ -d "dist" ]; then
    echo "📦 Sauvegarde ancien build..."
    mv dist dist.old.$DATE
fi

echo "📁 ÉTAPE MANUELLE REQUISE:"
echo "   1. Uploadez le nouveau dossier 'dist' dans $APP_DIR"
echo "   2. Vérifiez que le fichier .env contient les bonnes variables"
echo "   3. Appuyez sur Entrée pour continuer..."
read

# Vérifier que le nouveau build existe
if [ ! -d "dist" ]; then
    echo "❌ ERREUR: Nouveau dossier 'dist' non trouvé !"
    echo "🔄 Restauration de l'ancien build..."
    if [ -d "dist.old.$DATE" ]; then
        mv dist.old.$DATE dist
    fi
    pm2 start signfast
    echo "❌ Déploiement échoué - ancien build restauré"
    exit 1
fi

# Vérifier que les fichiers essentiels existent
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERREUR: Fichier index.html manquant dans dist/ !"
    echo "🔄 Restauration..."
    rm -rf dist
    if [ -d "dist.old.$DATE" ]; then
        mv dist.old.$DATE dist
    fi
    pm2 start signfast
    exit 1
fi

# Redémarrer l'application
echo "🚀 Redémarrage de l'application..."
pm2 start signfast

# Attendre que l'application démarre
echo "⏳ Attente démarrage (10 secondes)..."
sleep 10

# Vérifier que l'application fonctionne
if pm2 list | grep -q "online.*signfast"; then
    echo "✅ Application démarrée avec succès !"
    
    # Test de santé local
    if curl -f -s http://localhost:3000 > /dev/null; then
        echo "✅ Application accessible localement"
        
        # Test de santé externe
        if curl -f -s https://VOTRE_DOMAINE.com > /dev/null; then
            echo "✅ Application accessible publiquement"
        else
            echo "⚠️  Application locale OK mais problème d'accès public"
        fi
    else
        echo "⚠️  Attention: Application non accessible localement"
    fi
    
    # Nettoyage de l'ancien build si tout va bien
    if [ -d "dist.old.$DATE" ]; then
        echo "🗑️  Nettoyage ancien build..."
        rm -rf dist.old.$DATE
    fi
    
    echo "🎉 === DÉPLOIEMENT RÉUSSI ==="
    echo "🌐 Site accessible: https://VOTRE_DOMAINE.com"
    
else
    echo "❌ ERREUR: Application non démarrée !"
    echo "🔄 Restauration de l'ancien build..."
    pm2 stop signfast
    rm -rf dist
    if [ -d "dist.old.$DATE" ]; then
        mv dist.old.$DATE dist
    fi
    pm2 start signfast
    echo "❌ Déploiement échoué - ancien build restauré"
    exit 1
fi

echo "📊 Statut final:"
pm2 status
echo "📝 Logs disponibles avec: pm2 logs signfast"
```

```bash
# Rendre le script exécutable
chmod +x /var/www/signfast/deploy.sh
```

### 11.2 Script de sauvegarde automatique
```bash
# Créer le script de sauvegarde
nano /var/www/signfast/backup.sh
```

**Contenu du script `backup.sh` :**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/signfast"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/signfast"

echo "💾 === SAUVEGARDE SIGNFAST ==="
echo "📅 Date: $DATE"

# Créer le répertoire de sauvegarde
sudo mkdir -p $BACKUP_DIR

# Sauvegarder l'application complète
echo "📦 Sauvegarde de l'application..."
sudo tar -czf $BACKUP_DIR/signfast_full_$DATE.tar.gz \
  -C /var/www signfast \
  --exclude='signfast/node_modules' \
  --exclude='signfast/logs/*.log' \
  --exclude='signfast/*.tar.gz'

# Sauvegarder seulement la configuration
echo "⚙️  Sauvegarde de la configuration..."
sudo tar -czf $BACKUP_DIR/signfast_config_$DATE.tar.gz \
  -C $APP_DIR .env ecosystem.config.js package.json

# Sauvegarder les logs PM2
echo "📝 Sauvegarde des logs..."
sudo tar -czf $BACKUP_DIR/signfast_logs_$DATE.tar.gz \
  -C $APP_DIR logs/

# Nettoyer les anciennes sauvegardes (garder 7 jours)
echo "🗑️  Nettoyage anciennes sauvegardes..."
sudo find $BACKUP_DIR -name "signfast_*.tar.gz" -mtime +7 -delete

# Afficher les sauvegardes disponibles
echo "📋 Sauvegardes disponibles:"
sudo ls -lh $BACKUP_DIR/signfast_*$DATE*

echo "✅ Sauvegarde terminée: $BACKUP_DIR/signfast_full_$DATE.tar.gz"
```

```bash
# Rendre exécutable
chmod +x /var/www/signfast/backup.sh

# Tester la sauvegarde
./backup.sh

# Programmer la sauvegarde quotidienne
crontab -e
# Ajouter cette ligne pour sauvegarder tous les jours à 2h du matin :
0 2 * * * /var/www/signfast/backup.sh >> /var/log/signfast-backup.log 2>&1
```

---

## 🔍 Étape 12 : Tests et vérifications

### 12.1 Tests de fonctionnement complets
```bash
# Script de test complet
nano /var/www/signfast/test-health.sh
```

**Contenu du script `test-health.sh` :**
```bash
#!/bin/bash

echo "🔍 === TESTS DE SANTÉ SIGNFAST ==="

# Test 1: Vérifier que Nginx fonctionne
echo "1️⃣  Test Nginx..."
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Actif"
else
    echo "❌ Nginx: Inactif"
fi

# Test 2: Vérifier que l'application PM2 fonctionne
echo "2️⃣  Test PM2..."
if pm2 list | grep -q "online.*signfast"; then
    echo "✅ PM2: SignFast en ligne"
else
    echo "❌ PM2: SignFast hors ligne"
fi

# Test 3: Test de connectivité locale
echo "3️⃣  Test connectivité locale..."
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Local: Application accessible"
else
    echo "❌ Local: Application non accessible"
fi

# Test 4: Test HTTPS
echo "4️⃣  Test HTTPS..."
if curl -f -s https://VOTRE_DOMAINE.com > /dev/null; then
    echo "✅ HTTPS: Site accessible publiquement"
else
    echo "❌ HTTPS: Problème d'accès public"
fi

# Test 5: Vérifier les certificats SSL
echo "5️⃣  Test certificats SSL..."
if sudo certbot certificates | grep -q "VALID"; then
    echo "✅ SSL: Certificats valides"
else
    echo "⚠️  SSL: Vérifier les certificats"
fi

# Test 6: Vérifier l'espace disque
echo "6️⃣  Test espace disque..."
DISK_USAGE=$(df /var/www | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disque: ${DISK_USAGE}% utilisé"
else
    echo "⚠️  Disque: ${DISK_USAGE}% utilisé (attention)"
fi

# Test 7: Vérifier la mémoire
echo "7️⃣  Test mémoire..."
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -lt 80 ]; then
    echo "✅ Mémoire: ${MEM_USAGE}% utilisée"
else
    echo "⚠️  Mémoire: ${MEM_USAGE}% utilisée (attention)"
fi

# Test 8: Vérifier les logs d'erreur
echo "8️⃣  Test logs d'erreur..."
ERROR_COUNT=$(pm2 logs signfast --lines 100 --nostream | grep -i error | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ Logs: Aucune erreur récente"
else
    echo "⚠️  Logs: $ERROR_COUNT erreurs dans les 100 dernières lignes"
fi

echo "🏁 === TESTS TERMINÉS ==="
```

```bash
# Rendre exécutable et tester
chmod +x /var/www/signfast/test-health.sh
./test-health.sh
```

### 12.2 Tests de performance
```bash
# Installer les outils de test
sudo apt install -y apache2-utils

# Test de charge basique
echo "🚀 Test de performance..."
ab -n 100 -c 10 https://VOTRE_DOMAINE.com/

# Test de vitesse de chargement
curl -w "@-" -o /dev/null -s https://VOTRE_DOMAINE.com/ <<'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

---

## 🔄 Étape 13 : Automatisation et maintenance

### 13.1 Script de mise à jour automatique
```bash
# Créer le script de mise à jour
nano /var/www/signfast/update.sh
```

**Contenu du script `update.sh` :**
```bash
#!/bin/bash
set -e

APP_DIR="/var/www/signfast"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔄 === MISE À JOUR SIGNFAST ==="
echo "📅 Date: $DATE"

cd $APP_DIR

# Sauvegarder avant mise à jour
echo "💾 Sauvegarde pré-mise à jour..."
./backup.sh

# Arrêter l'application
echo "⏹️  Arrêt de l'application..."
pm2 stop signfast

echo "📁 INSTRUCTIONS DE MISE À JOUR:"
echo "   1. Remplacez le dossier 'dist' par la nouvelle version"
echo "   2. Mettez à jour le fichier .env si nécessaire"
echo "   3. Appuyez sur Entrée quand c'est terminé..."
read

# Vérifier le nouveau build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Nouveau build invalide !"
    echo "🔄 Restauration automatique..."
    # Restaurer depuis la dernière sauvegarde
    LATEST_BACKUP=$(sudo ls -t /var/backups/signfast/signfast_full_*.tar.gz | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo tar -xzf $LATEST_BACKUP -C /var/www/
        echo "✅ Restauration depuis: $LATEST_BACKUP"
    fi
    pm2 start signfast
    exit 1
fi

# Redémarrer l'application
echo "🚀 Redémarrage..."
pm2 start signfast

# Vérifier que tout fonctionne
sleep 5
if pm2 list | grep -q "online.*signfast" && curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Mise à jour réussie !"
    echo "🌐 Site accessible: https://VOTRE_DOMAINE.com"
else
    echo "❌ Problème détecté après mise à jour"
    echo "🔄 Restauration automatique..."
    pm2 stop signfast
    rm -rf dist
    LATEST_BACKUP=$(sudo ls -t /var/backups/signfast/signfast_full_*.tar.gz | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo tar -xzf $LATEST_BACKUP -C /var/www/
    fi
    pm2 start signfast
    exit 1
fi

echo "🎉 === MISE À JOUR TERMINÉE ==="
```

```bash
chmod +x /var/www/signfast/update.sh
```

### 13.2 Surveillance automatique
```bash
# Créer un script de surveillance
nano /var/www/signfast/monitor.sh
```

**Contenu du script `monitor.sh` :**
```bash
#!/bin/bash

APP_NAME="signfast"
LOG_FILE="/var/log/signfast-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Fonction de log
log_message() {
    echo "[$DATE] $1" | sudo tee -a $LOG_FILE
}

# Vérifier si l'application PM2 fonctionne
if ! pm2 list | grep -q "online.*$APP_NAME"; then
    log_message "❌ ALERTE: $APP_NAME est hors ligne"
    
    # Tentative de redémarrage
    log_message "🔄 Tentative de redémarrage..."
    pm2 restart $APP_NAME
    
    sleep 10
    
    if pm2 list | grep -q "online.*$APP_NAME"; then
        log_message "✅ $APP_NAME redémarré avec succès"
    else
        log_message "❌ CRITIQUE: Impossible de redémarrer $APP_NAME"
        # Ici vous pourriez ajouter une notification email/SMS
    fi
else
    # Test de connectivité
    if curl -f -s http://localhost:3000 > /dev/null; then
        log_message "✅ $APP_NAME fonctionne correctement"
    else
        log_message "⚠️  $APP_NAME en ligne mais non accessible"
        pm2 restart $APP_NAME
    fi
fi

# Vérifier l'utilisation mémoire
MEM_USAGE=$(pm2 show $APP_NAME | grep "memory usage" | awk '{print $4}' | sed 's/M//')
if [ ! -z "$MEM_USAGE" ] && [ $MEM_USAGE -gt 800 ]; then
    log_message "⚠️  Utilisation mémoire élevée: ${MEM_USAGE}MB"
fi
```

```bash
chmod +x /var/www/signfast/monitor.sh

# Programmer la surveillance toutes les 5 minutes
crontab -e
# Ajouter cette ligne :
*/5 * * * * /var/www/signfast/monitor.sh
```

---

## 📋 Étape 14 : Checklist finale de vérification

### ✅ **Vérifications obligatoires :**

```bash
# Script de vérification finale
nano /var/www/signfast/final-check.sh
```

**Contenu du script `final-check.sh` :**
```bash
#!/bin/bash

echo "🔍 === VÉRIFICATION FINALE SIGNFAST ==="

# 1. DNS et domaine
echo "1️⃣  Vérification DNS..."
if nslookup VOTRE_DOMAINE.com | grep -q "$(curl -s ifconfig.me)"; then
    echo "✅ DNS configuré correctement"
else
    echo "❌ DNS: Vérifiez que votre domaine pointe vers $(curl -s ifconfig.me)"
fi

# 2. SSL et HTTPS
echo "2️⃣  Vérification SSL..."
if curl -I https://VOTRE_DOMAINE.com 2>/dev/null | grep -q "200 OK"; then
    echo "✅ HTTPS fonctionne"
    # Vérifier la validité du certificat
    if openssl s_client -connect VOTRE_DOMAINE.com:443 -servername VOTRE_DOMAINE.com </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        echo "✅ Certificat SSL valide"
    else
        echo "⚠️  Certificat SSL: Problème de validation"
    fi
else
    echo "❌ HTTPS ne fonctionne pas"
fi

# 3. Application
echo "3️⃣  Vérification application..."
if pm2 list | grep -q "online.*signfast"; then
    echo "✅ PM2: SignFast en ligne"
    
    # Vérifier la mémoire utilisée
    MEM_INFO=$(pm2 show signfast | grep "memory usage" | awk '{print $4}')
    echo "📊 Mémoire utilisée: $MEM_INFO"
else
    echo "❌ PM2: SignFast hors ligne"
fi

# 4. Nginx
echo "4️⃣  Vérification Nginx..."
if sudo nginx -t 2>/dev/null; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide"
fi

# 5. Firewall
echo "5️⃣  Vérification Firewall..."
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ UFW actif"
    sudo ufw status numbered
else
    echo "❌ UFW inactif"
fi

# 6. Fail2Ban
echo "6️⃣  Vérification Fail2Ban..."
if sudo systemctl is-active --quiet fail2ban; then
    echo "✅ Fail2Ban actif"
    sudo fail2ban-client status | head -5
else
    echo "❌ Fail2Ban inactif"
fi

# 7. Espace disque
echo "7️⃣  Vérification espace disque..."
df -h /var/www

# 8. Test de performance rapide
echo "8️⃣  Test de performance..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://VOTRE_DOMAINE.com)
echo "⚡ Temps de réponse: ${RESPONSE_TIME}s"

# 9. Vérifier les logs récents
echo "9️⃣  Vérification logs récents..."
ERROR_COUNT=$(pm2 logs signfast --lines 50 --nostream 2>/dev/null | grep -i error | wc -l)
echo "📝 Erreurs dans les 50 dernières lignes: $ERROR_COUNT"

echo "🏁 === VÉRIFICATION TERMINÉE ==="
echo "🌐 Votre site: https://VOTRE_DOMAINE.com"
echo "📊 Monitoring: https://monitoring.VOTRE_DOMAINE.com (si configuré)"
```

```bash
chmod +x /var/www/signfast/final-check.sh
./final-check.sh
```

---

## 🆘 Dépannage et résolution de problèmes

### **Problème : Application ne démarre pas**
```bash
# Diagnostic complet
pm2 logs signfast --lines 100
pm2 show signfast

# Vérifier que serve est installé
npm list -g serve

# Réinstaller serve si nécessaire
sudo npm install -g serve

# Redémarrer manuellement
pm2 delete signfast
pm2 start ecosystem.config.js
```

### **Problème : Erreur 502 Bad Gateway**
```bash
# Vérifier que l'app écoute sur le port 3000
sudo netstat -tlnp | grep 3000
sudo ss -tlnp | grep 3000

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Redémarrer les services
pm2 restart signfast
sudo systemctl restart nginx
```

### **Problème : SSL ne fonctionne pas**
```bash
# Vérifier les certificats
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew --force-renewal

# Vérifier la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### **Problème : Site lent**
```bash
# Vérifier l'utilisation des ressources
htop

# Vérifier les logs PM2
pm2 monit

# Optimiser PM2 (augmenter les instances si vous avez plus de CPU)
pm2 delete signfast
# Modifier ecosystem.config.js : instances: 'max' ou instances: 2
pm2 start ecosystem.config.js
```

---

## 🎯 Optimisations de performance avancées

### **Cache Nginx avancé**
```bash
# Ajouter dans votre configuration Nginx
sudo nano /etc/nginx/sites-available/signfast
```

**Ajoutez ces directives dans le bloc `server` :**
```nginx
# Cache pour les API calls (si applicable)
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    add_header X-Cache-Status $upstream_cache_status;
}

# Optimisation pour les gros fichiers
client_max_body_size 50M;
client_body_buffer_size 128k;

# Optimisation des connexions
keepalive_timeout 65;
keepalive_requests 100;
```

### **Monitoring avancé avec logs rotatifs**
```bash
# Configuration de logrotate pour PM2
sudo nano /etc/logrotate.d/pm2-signfast
```

**Contenu :**
```
/var/www/signfast/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 signfast signfast
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🎉 Félicitations !

Votre application SignFast est maintenant déployée en production sur Ubuntu 24 !

### **URLs importantes :**
- 🌐 **Application principale** : https://VOTRE_DOMAINE.com
- 📊 **Monitoring** : https://monitoring.VOTRE_DOMAINE.com (si configuré)
- 🔧 **SSH** : `ssh signfast@VOTRE_IP_VPS` (ou port 2222 si modifié)

### **Commandes de maintenance quotidienne :**
```bash
# Vérifier le statut général
pm2 status && sudo systemctl status nginx

# Voir les logs récents
pm2 logs signfast --lines 20

# Test de santé complet
./test-health.sh

# Redémarrer si nécessaire
pm2 restart signfast

# Sauvegarder manuellement
./backup.sh
```

### **Commandes d'urgence :**
```bash
# Redémarrage complet
pm2 restart signfast && sudo systemctl restart nginx

# Voir les erreurs
pm2 logs signfast --err

# Restaurer depuis sauvegarde
# (voir le contenu du script deploy.sh pour la procédure)
```

Votre SignFast est maintenant **prêt pour la production** ! 🚀