# Guide d'Installation SignFast sur VPS Ubuntu 24.04

## 🚀 Installation Automatique

### Prérequis
- **VPS Ubuntu 24.04 LTS** avec au minimum 2GB RAM et 20GB de stockage
- **Accès root/sudo** sur le serveur
- **Nom de domaine** pointant vers l'IP du serveur
- **Projet Supabase** configuré avec les clés API

### 📋 Étapes d'Installation

#### 1. Connexion au serveur
```bash
ssh votre-utilisateur@votre-serveur.com
```

#### 2. Téléchargement du script d'installation
```bash
wget https://raw.githubusercontent.com/votre-repo/signfast/main/install.sh
chmod +x install.sh
```

#### 3. Lancement de l'installation
```bash
./install.sh
```

Le script vous demandera :
- **Nom de domaine** (ex: signfast.mondomaine.com)
- **Email** pour les certificats SSL
- **URL Supabase** (https://xxx.supabase.co)
- **Clés API Supabase** (anon key et service role key)
- **Clés Stripe** (optionnel)

#### 4. Attendre la fin de l'installation
L'installation prend environ 10-15 minutes et configure automatiquement :
- ✅ Docker et Docker Compose
- ✅ Nginx avec proxy reverse
- ✅ SSL/TLS avec Let's Encrypt
- ✅ Sécurité (Fail2ban, UFW)
- ✅ Monitoring automatique
- ✅ Scripts de gestion

## 🛠️ Gestion de l'Application

### Commandes Principales
```bash
# Vérifier le statut
signfast status

# Redémarrer l'application
signfast restart

# Voir les logs en temps réel
signfast logs

# Créer une sauvegarde
signfast backup

# Mettre à jour l'application
signfast update

# Nettoyer les ressources Docker
signfast cleanup

# Renouveler le certificat SSL
signfast ssl-renew
```

### Structure des Fichiers
```
/opt/signfast/
├── docker-compose.yml      # Configuration Docker
├── Dockerfile             # Image de l'application
├── nginx.conf             # Configuration Nginx interne
├── .env                   # Variables d'environnement
├── start.sh               # Script de démarrage
├── stop.sh                # Script d'arrêt
├── restart.sh             # Script de redémarrage
├── update.sh              # Script de mise à jour
├── backup.sh              # Script de sauvegarde
├── monitor.sh             # Script de monitoring
├── admin.sh               # Script d'administration
├── logs/                  # Logs de l'application
└── backups/               # Sauvegardes automatiques
```

## 🔧 Configuration Avancée

### Variables d'Environnement
Éditez `/opt/signfast/.env` pour modifier la configuration :

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NODE_ENV=production
DOMAIN=votre-domaine.com
```

### Configuration Nginx
Le fichier `/etc/nginx/sites-available/signfast` contient la configuration du proxy.

### Monitoring
- **Vérification automatique** toutes les 5 minutes
- **Redémarrage automatique** en cas de panne
- **Rotation des logs** quotidienne
- **Alertes disque** si > 85% d'utilisation

## 🔒 Sécurité

### Mesures Implémentées
- **Firewall UFW** configuré
- **Fail2ban** contre les attaques par force brute
- **SSL/TLS** avec Let's Encrypt
- **Headers de sécurité** Nginx
- **Rate limiting** sur les endpoints sensibles
- **Mises à jour automatiques** de sécurité

### Ports Ouverts
- **80** (HTTP - redirige vers HTTPS)
- **443** (HTTPS)
- **22** (SSH)

## 📊 Maintenance

### Sauvegardes
- **Automatiques** : Créées lors des mises à jour
- **Manuelles** : `signfast backup`
- **Rétention** : 7 jours
- **Emplacement** : `/opt/signfast/backups/`

### Mises à Jour
```bash
# Mise à jour complète
signfast update

# Mise à jour manuelle
cd /opt/signfast
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Logs
```bash
# Logs de l'application
signfast logs

# Logs Nginx
sudo tail -f /var/log/nginx/signfast_*.log

# Logs système
journalctl -u signfast.service -f
```

## 🆘 Dépannage

### Problèmes Courants

#### Application ne démarre pas
```bash
# Vérifier les logs
signfast logs

# Vérifier la configuration Docker
cd /opt/signfast
docker-compose config

# Redémarrer complètement
signfast stop
signfast start
```

#### Erreur SSL
```bash
# Renouveler le certificat
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

#### Problème de performance
```bash
# Vérifier les ressources
docker stats
free -h
df -h

# Nettoyer Docker
signfast cleanup
```

#### Erreur de base de données
- Vérifiez la configuration Supabase dans `.env`
- Vérifiez que les clés API sont correctes
- Vérifiez la connectivité réseau vers Supabase

### Support
En cas de problème, vérifiez :
1. **Logs de l'application** : `signfast logs`
2. **Statut des services** : `signfast status`
3. **Configuration réseau** : `curl -I https://votre-domaine.com`
4. **Espace disque** : `df -h`

## 🔄 Mise à Jour de Production

### Processus Recommandé
1. **Sauvegarde** : `signfast backup`
2. **Test en local** de la nouvelle version
3. **Mise à jour** : `signfast update`
4. **Vérification** : `signfast status`
5. **Test fonctionnel** sur le site

### Rollback en Cas de Problème
```bash
# Arrêter l'application
signfast stop

# Restaurer depuis une sauvegarde
cd /opt/signfast/backups
tar -xzf signfast_backup_YYYYMMDD_HHMMSS.tar.gz -C /

# Redémarrer
signfast start
```

---

## 📞 Support Technique

Pour toute question ou problème :
- **Documentation** : Consultez ce guide
- **Logs** : Toujours vérifier les logs en premier
- **Community** : Forum de support SignFast
- **Email** : support@signfast.com

---

*Installation automatisée pour SignFast v1.0 - Ubuntu 24.04 LTS*