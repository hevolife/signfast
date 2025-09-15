# 🐳 Docker Compose pour SignFast

Ce dossier contient la configuration Docker Compose pour auto-héberger SignFast avec tous ses services.

## 🚀 Démarrage Rapide

1. **Copier le fichier d'environnement**
   ```bash
   cp .env.example .env
   ```

2. **Modifier les variables d'environnement**
   ```bash
   nano .env
   ```

3. **Construire et démarrer les services**
   ```bash
   docker compose up -d --build
   ```

4. **Accéder à l'application**
   - Application : http://localhost:3000
   - API Supabase : http://localhost:8000
   - Base de données : localhost:5432

## 📋 Services Inclus

| Service | Port | Description |
|---------|------|-------------|
| **signfast-app** | 3000 | Application React/Vite |
| **postgres** | 5432 | Base de données PostgreSQL |
| **supabase-auth** | 9999 | Service d'authentification |
| **supabase-rest** | 3001 | API REST (PostgREST) |
| **supabase-realtime** | 4000 | Service temps réel |
| **supabase-storage** | 5000 | Stockage de fichiers |
| **kong** | 8000/8443 | API Gateway |
| **redis** | 6379 | Cache et sessions |
| **nginx** | 80/443 | Reverse proxy |

## ⚙️ Configuration

### Variables d'Environnement Essentielles

```env
# URLs et clés Supabase
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base de données
POSTGRES_PASSWORD=your-secure-password

# Sécurité JWT
JWT_SECRET=your-jwt-secret-32-chars-minimum
SECRET_KEY_BASE=your-secret-key-base-64-chars-minimum

# Site
SITE_URL=http://localhost:3000
```

### Configuration Email (Optionnel)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=admin@signfast.com
GOTRUE_MAILER_AUTOCONFIRM=true
```

## 🔧 Commandes Utiles

### Démarrer tous les services
```bash
docker compose up -d
```

### Voir les logs
```bash
docker compose logs -f
```

### Redémarrer un service spécifique
```bash
docker compose restart signfast-app
```

### Arrêter tous les services
```bash
docker compose down
```

### Nettoyer complètement (⚠️ supprime les données)
```bash
docker compose down -v --remove-orphans
```

### Reconstruire l'application
```bash
docker compose build signfast-app
docker compose up -d signfast-app
```

## 🗄️ Gestion de la Base de Données

### Accéder à PostgreSQL
```bash
docker compose exec postgres psql -U postgres -d signfast
```

### Sauvegarder la base
```bash
docker compose exec postgres pg_dump -U postgres signfast > backup.sql
```

### Restaurer la base
```bash
docker compose exec -T postgres psql -U postgres signfast < backup.sql
```

## 📊 Monitoring

### Vérifier l'état des services
```bash
docker compose ps
```

### Voir l'utilisation des ressources
```bash
docker stats
```

### Logs spécifiques
```bash
# Logs de l'application
docker compose logs -f signfast-app

# Logs de la base de données
docker compose logs -f postgres

# Logs de l'authentification
docker compose logs -f supabase-auth
```

## 🔒 Sécurité

### Recommandations de Production

1. **Changer tous les mots de passe par défaut**
2. **Utiliser des secrets JWT forts** (32+ caractères)
3. **Configurer HTTPS avec des certificats SSL**
4. **Limiter l'accès réseau** (firewall, VPN)
5. **Sauvegardes régulières** de la base de données
6. **Monitoring et alertes**

### Configuration HTTPS

Pour la production, ajoutez des certificats SSL :

```yaml
# Dans docker-compose.yml, section nginx
volumes:
  - ./ssl/cert.pem:/etc/ssl/certs/cert.pem:ro
  - ./ssl/key.pem:/etc/ssl/private/key.pem:ro
```

## 🐛 Dépannage

### Problèmes Courants

1. **Port déjà utilisé**
   ```bash
   # Changer les ports dans docker-compose.yml
   ports:
     - "3001:3000"  # Au lieu de 3000:3000
   ```

2. **Problème de permissions**
   ```bash
   sudo chown -R $USER:$USER ./
   ```

3. **Base de données corrompue**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

4. **Logs pour diagnostiquer**
   ```bash
   docker compose logs --tail=100 [service-name]
   ```

## 🔄 Mise à Jour

### Mettre à jour les images
```bash
docker compose pull
docker compose up -d
```

### Mettre à jour l'application
```bash
# Reconstruire l'image de l'app
docker compose build signfast-app --no-cache
docker compose up -d signfast-app
```

## 📝 Notes

- Les données sont persistées dans des volumes Docker
- Les migrations SQL sont automatiquement appliquées au démarrage
- Le service worker est configuré pour le mode offline
- La configuration supporte le développement et la production