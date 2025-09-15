#!/bin/bash

# SignFast VPS Setup Script - Quick Deployment
# This script prepares the current codebase for VPS deployment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire racine de SignFast"
    exit 1
fi

print_step "Préparation du déploiement VPS pour SignFast"

# Create deployment package
print_step "Création du package de déploiement"

# Create temporary deployment directory
DEPLOY_DIR="signfast-vps-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r src $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp -r supabase $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp *.config.js $DEPLOY_DIR/
cp *.json $DEPLOY_DIR/
cp index.html $DEPLOY_DIR/

# Copy Docker and deployment files
cp Dockerfile.production $DEPLOY_DIR/Dockerfile
cp docker-compose.production.yml $DEPLOY_DIR/docker-compose.yml
cp nginx.production.conf $DEPLOY_DIR/nginx.conf
cp docker-entrypoint.sh $DEPLOY_DIR/
cp install.sh $DEPLOY_DIR/
cp install-guide.md $DEPLOY_DIR/

# Create environment template
cat > $DEPLOY_DIR/.env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Application Configuration
NODE_ENV=production
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
EOF

# Create README for deployment
cat > $DEPLOY_DIR/README-DEPLOYMENT.md << 'EOF'
# SignFast VPS Deployment

## Installation Rapide

1. **Transférez ce dossier sur votre VPS Ubuntu 24.04**
```bash
scp -r signfast-vps-deploy/ user@your-server:/tmp/
```

2. **Connectez-vous au serveur**
```bash
ssh user@your-server
```

3. **Lancez l'installation**
```bash
cd /tmp/signfast-vps-deploy
chmod +x install.sh
./install.sh
```

4. **Suivez les instructions** du script d'installation

## Configuration Requise

- **VPS Ubuntu 24.04 LTS**
- **2GB RAM minimum** (4GB recommandé)
- **20GB stockage minimum**
- **Nom de domaine** pointant vers le serveur
- **Projet Supabase** avec les clés API

## Après Installation

Votre site sera accessible à : `https://votre-domaine.com`

Commandes de gestion :
- `signfast status` - Statut de l'application
- `signfast restart` - Redémarrer
- `signfast logs` - Voir les logs
- `signfast backup` - Créer une sauvegarde

## Support

Consultez `install-guide.md` pour la documentation complète.
EOF

# Create deployment archive
print_step "Création de l'archive de déploiement"
tar -czf signfast-vps-deploy.tar.gz $DEPLOY_DIR/

print_success "Package de déploiement créé : signfast-vps-deploy.tar.gz"

# Create quick deployment instructions
cat > deploy-instructions.txt << EOF
🚀 INSTRUCTIONS DE DÉPLOIEMENT SIGNFAST VPS

1. TRANSFÉRER LE PACKAGE
   scp signfast-vps-deploy.tar.gz user@your-server:/tmp/

2. SE CONNECTER AU SERVEUR
   ssh user@your-server

3. EXTRAIRE ET INSTALLER
   cd /tmp
   tar -xzf signfast-vps-deploy.tar.gz
   cd signfast-vps-deploy
   chmod +x install.sh
   ./install.sh

4. SUIVRE LES INSTRUCTIONS
   - Entrer le nom de domaine
   - Entrer l'email pour SSL
   - Configurer Supabase
   - Configurer Stripe (optionnel)

5. VÉRIFIER L'INSTALLATION
   signfast status
   
6. ACCÉDER AU SITE
   https://votre-domaine.com

📁 Fichiers créés :
   - signfast-vps-deploy.tar.gz (package complet)
   - deploy-instructions.txt (ce fichier)

🔧 Gestion post-installation :
   - signfast restart  (redémarrer)
   - signfast logs     (voir les logs)
   - signfast backup   (sauvegarder)
   - signfast update   (mettre à jour)

📖 Documentation complète : install-guide.md
EOF

print_success "Instructions créées : deploy-instructions.txt"

echo
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Package VPS Prêt pour Déploiement !             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}📦 Fichiers créés :${NC}"
echo -e "   ${YELLOW}signfast-vps-deploy.tar.gz${NC} - Package complet"
echo -e "   ${YELLOW}deploy-instructions.txt${NC} - Instructions rapides"
echo
echo -e "${BLUE}🚀 Prochaines étapes :${NC}"
echo -e "   1. Transférer signfast-vps-deploy.tar.gz sur votre VPS"
echo -e "   2. Extraire et lancer ./install.sh"
echo -e "   3. Suivre les instructions du script"
echo
echo -e "${BLUE}📖 Documentation :${NC}"
echo -e "   Consultez install-guide.md pour tous les détails"
echo

# Cleanup
rm -rf $DEPLOY_DIR

print_success "Préparation terminée !"