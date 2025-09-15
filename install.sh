#!/bin/bash

# SignFast VPS Installation Script for Ubuntu 24.04
# This script installs and configures SignFast on a fresh Ubuntu 24.04 VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=""
EMAIL=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    SignFast VPS Installer                   ║"
    echo "║                     Ubuntu 24.04 LTS                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
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

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Ce script ne doit pas être exécuté en tant que root"
        print_warning "Créez un utilisateur non-root avec sudo et relancez le script"
        exit 1
    fi
}

check_ubuntu() {
    if ! grep -q "Ubuntu 24.04" /etc/os-release; then
        print_warning "Ce script est optimisé pour Ubuntu 24.04 LTS"
        read -p "Continuer quand même ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

collect_configuration() {
    print_step "Configuration de SignFast"
    echo
    
    # Choix du mode d'installation
    echo "Mode d'installation :"
    echo "1. Supabase Cloud (recommandé)"
    echo "2. Supabase Self-Hosted (autonome)"
    echo
    read -p "Choisissez le mode (1 ou 2): " INSTALL_MODE
    
    if [[ "$INSTALL_MODE" != "1" && "$INSTALL_MODE" != "2" ]]; then
        print_error "Mode invalide. Choisissez 1 ou 2."
        exit 1
    fi
    
    # Domain
    while [[ -z "$DOMAIN" ]]; do
        read -p "Nom de domaine (ex: signfast.mondomaine.com): " DOMAIN
        if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
            print_error "Format de domaine invalide"
            DOMAIN=""
        fi
    done
    
    # Email for SSL
    while [[ -z "$EMAIL" ]]; do
        read -p "Email pour les certificats SSL: " EMAIL
        if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            print_error "Format d'email invalide"
            EMAIL=""
        fi
    done
    
    if [[ "$INSTALL_MODE" == "1" ]]; then
        # Supabase Cloud configuration
        echo
        print_step "Configuration Supabase Cloud"
        echo "Récupérez ces informations depuis votre projet Supabase:"
        echo "Settings > API > Project URL et API Keys"
        echo
        
        while [[ -z "$SUPABASE_URL" ]]; do
            read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
            if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
                print_error "URL Supabase invalide (doit être https://xxx.supabase.co)"
                SUPABASE_URL=""
            fi
        done
        
        while [[ -z "$SUPABASE_ANON_KEY" ]]; do
            read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
        done
        
        while [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; do
            read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
        done
    else
        # Supabase Self-Hosted configuration
        echo
        print_step "Configuration Supabase Self-Hosted"
        echo "Génération automatique des clés pour l'installation autonome"
        
        # Générer des clés sécurisées
        POSTGRES_PASSWORD=$(openssl rand -base64 32)
        JWT_SECRET=$(openssl rand -base64 32)
        
        # URLs locales pour self-hosted
        SUPABASE_URL="http://localhost:8000"
        SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl2CRkLdwdkBFhJKfSJBGQ"
        SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
        
        echo "✅ Configuration Supabase Self-Hosted générée automatiquement"
    fi
    
    # Stripe configuration (optional)
    echo
    print_step "Configuration Stripe (optionnel pour les paiements)"
    read -p "Stripe Secret Key (optionnel): " STRIPE_SECRET_KEY
    read -p "Stripe Webhook Secret (optionnel): " STRIPE_WEBHOOK_SECRET
    
    echo
    print_success "Configuration collectée !"
    echo "Domaine: $DOMAIN"
    echo "Email: $EMAIL"
    if [[ "$INSTALL_MODE" == "1" ]]; then
        echo "Supabase: ${SUPABASE_URL} (Cloud)"
    else
        echo "Supabase: Self-Hosted (Autonome)"
    fi
    echo
    read -p "Confirmer l'installation ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

update_system() {
    print_step "Mise à jour du système Ubuntu"
    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    print_success "Système mis à jour"
}

install_docker() {
    print_step "Installation de Docker"
    
    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installé"
}

install_nginx() {
    print_step "Installation et configuration de Nginx"
    
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Configure firewall
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw --force enable
    
    print_success "Nginx installé et configuré"
}

install_certbot() {
    print_step "Installation de Certbot pour SSL"
    
    sudo apt install -y certbot python3-certbot-nginx
    
    print_success "Certbot installé"
}

create_app_structure() {
    print_step "Création de la structure de l'application"
    
    # Create app directory
    sudo mkdir -p /opt/signfast
    sudo chown $USER:$USER /opt/signfast
    
    # Create necessary directories
    mkdir -p /opt/signfast/{app,nginx,ssl,logs,backups}
    
    print_success "Structure créée dans /opt/signfast"
}

create_docker_files() {
    print_step "Création des fichiers Docker"
    
    # Create Dockerfile
    cat > /opt/signfast/Dockerfile << 'EOF'
# Multi-stage build for SignFast
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install Node.js for potential server-side features
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory for logs
RUN mkdir -p /var/log/nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF

    # Create nginx.conf for container
    cat > /opt/signfast/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Handle SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API proxy (if needed)
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF

    # Create docker-compose.yml
    cat > /opt/signfast/docker-compose.yml << EOF
version: '3.8'

services:
  signfast:
    build: .
    container_name: signfast-app
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    volumes:
      - ./logs:/var/log/nginx
      - ./backups:/opt/backups
    networks:
      - signfast-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  signfast-network:
    driver: bridge

volumes:
  signfast-logs:
  signfast-backups:
EOF

    print_success "Fichiers Docker créés"
}

configure_nginx_proxy() {
    print_step "Configuration du proxy Nginx"
    
    # Create nginx site configuration
    sudo tee /etc/nginx/sites-available/signfast << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Rate limiting for sensitive endpoints
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    # Logs
    access_log /var/log/nginx/signfast_access.log;
    error_log /var/log/nginx/signfast_error.log;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/signfast /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_success "Nginx configuré pour ${DOMAIN}"
}

setup_ssl() {
    print_step "Configuration SSL avec Let's Encrypt"
    
    # Get SSL certificate
    sudo certbot --nginx -d ${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive --redirect
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer
    
    print_success "SSL configuré pour ${DOMAIN}"
}

create_environment_file() {
    print_step "Création du fichier d'environnement"
    
    if [[ "$INSTALL_MODE" == "1" ]]; then
        # Supabase Cloud
        cat > /opt/signfast/.env << EOF
# Production Environment Variables
NODE_ENV=production

# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Stripe Configuration (optional)
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# Application Configuration
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
EOF
    else
        # Supabase Self-Hosted
        cat > /opt/signfast/.env << EOF
# Production Environment Variables
NODE_ENV=production

# Supabase Self-Hosted Configuration
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl2CRkLdwdkBFhJKfSJBGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Database Configuration
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}

# API Configuration
API_EXTERNAL_URL=https://${DOMAIN}
SITE_URL=https://${DOMAIN}

# Stripe Configuration (optional)
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# Application Configuration
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
EOF
    fi

    chmod 600 /opt/signfast/.env
    print_success "Fichier d'environnement créé"
}

create_management_scripts() {
    print_step "Création des scripts de gestion"
    
    # Start script
    cat > /opt/signfast/start.sh << 'EOF'
#!/bin/bash
cd /opt/signfast
docker-compose up -d
echo "SignFast démarré"
docker-compose ps
EOF

    # Stop script
    cat > /opt/signfast/stop.sh << 'EOF'
#!/bin/bash
cd /opt/signfast
docker-compose down
echo "SignFast arrêté"
EOF

    # Restart script
    cat > /opt/signfast/restart.sh << 'EOF'
#!/bin/bash
cd /opt/signfast
docker-compose down
docker-compose up -d
echo "SignFast redémarré"
docker-compose ps
EOF

    # Update script
    cat > /opt/signfast/update.sh << 'EOF'
#!/bin/bash
cd /opt/signfast

echo "Sauvegarde avant mise à jour..."
./backup.sh

echo "Arrêt de l'application..."
docker-compose down

echo "Mise à jour du code..."
git pull origin main

echo "Reconstruction de l'image..."
docker-compose build --no-cache

echo "Redémarrage..."
docker-compose up -d

echo "Mise à jour terminée !"
docker-compose ps
EOF

    # Backup script
    cat > /opt/signfast/backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/opt/signfast/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\${BACKUP_DIR}/signfast_backup_\${DATE}.tar.gz"

mkdir -p \$BACKUP_DIR

echo "Création de la sauvegarde..."
tar -czf \$BACKUP_FILE \\
    --exclude='node_modules' \\
    --exclude='dist' \\
    --exclude='logs' \\
    --exclude='backups' \\
    /opt/signfast

echo "Sauvegarde créée: \$BACKUP_FILE"

# Garder seulement les 7 dernières sauvegardes
find \$BACKUP_DIR -name "signfast_backup_*.tar.gz" -type f -mtime +7 -delete

echo "Anciennes sauvegardes nettoyées"
EOF

    # Logs script
    cat > /opt/signfast/logs.sh << 'EOF'
#!/bin/bash
echo "=== Logs Docker ==="
docker-compose logs -f --tail=50 signfast

echo "=== Logs Nginx ==="
sudo tail -f /var/log/nginx/signfast_*.log
EOF

    # Status script
    cat > /opt/signfast/status.sh << 'EOF'
#!/bin/bash
echo "=== Status SignFast ==="
docker-compose ps

echo ""
echo "=== Status Nginx ==="
sudo systemctl status nginx --no-pager

echo ""
echo "=== Status SSL ==="
sudo certbot certificates

echo ""
echo "=== Disk Usage ==="
df -h /opt/signfast

echo ""
echo "=== Memory Usage ==="
free -h

echo ""
echo "=== Docker Stats ==="
docker stats --no-stream
EOF

    # Health check script
    cat > /opt/signfast/health.sh << 'EOF'
#!/bin/bash

echo "=== SignFast Health Check ==="
echo "Date: $(date)"
echo ""

# Check if container is running
echo "🐳 Container Status:"
if docker-compose ps | grep -q "signfast-app.*Up"; then
    echo "✅ SignFast container is running"
    CONTAINER_STATUS="UP"
else
    echo "❌ SignFast container is down"
    CONTAINER_STATUS="DOWN"
fi

# Check if website responds
echo ""
echo "🌐 Website Status:"
if curl -f -s --max-time 10 http://localhost:3000 > /dev/null; then
    echo "✅ Local website responding (port 3000)"
    LOCAL_STATUS="UP"
else
    echo "❌ Local website not responding"
    LOCAL_STATUS="DOWN"
fi

# Check public website if domain is configured
if [ "$DOMAIN" != "localhost" ] && [ ! -z "$DOMAIN" ]; then
    echo ""
    echo "🌍 Public Website Status:"
    if curl -f -s --max-time 10 "https://$DOMAIN" > /dev/null; then
        echo "✅ Public website responding (https://$DOMAIN)"
        PUBLIC_STATUS="UP"
    else
        echo "❌ Public website not responding"
        PUBLIC_STATUS="DOWN"
    fi
else
    PUBLIC_STATUS="N/A"
fi

# Check SSL certificate
if [ "$DOMAIN" != "localhost" ] && [ ! -z "$DOMAIN" ]; then
    echo ""
    echo "🔒 SSL Certificate:"
    if echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
        EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        echo "✅ SSL certificate valid until: $EXPIRY"
        SSL_STATUS="VALID"
    else
        echo "❌ SSL certificate invalid or not found"
        SSL_STATUS="INVALID"
    fi
else
    SSL_STATUS="N/A"
fi

# Check disk space
echo ""
echo "💾 Disk Usage:"
DISK_USAGE=$(df /opt/signfast | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disk usage: ${DISK_USAGE}% (healthy)"
    DISK_STATUS="OK"
elif [ $DISK_USAGE -lt 90 ]; then
    echo "⚠️ Disk usage: ${DISK_USAGE}% (warning)"
    DISK_STATUS="WARNING"
else
    echo "❌ Disk usage: ${DISK_USAGE}% (critical)"
    DISK_STATUS="CRITICAL"
fi

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEMORY_USAGE -lt 80 ]; then
    echo "✅ Memory usage: ${MEMORY_USAGE}% (healthy)"
    MEMORY_STATUS="OK"
elif [ $MEMORY_USAGE -lt 90 ]; then
    echo "⚠️ Memory usage: ${MEMORY_USAGE}% (warning)"
    MEMORY_STATUS="WARNING"
else
    echo "❌ Memory usage: ${MEMORY_USAGE}% (critical)"
    MEMORY_STATUS="CRITICAL"
fi

# Overall status
echo ""
echo "📊 Overall Status:"
if [ "$CONTAINER_STATUS" = "UP" ] && [ "$LOCAL_STATUS" = "UP" ] && ([ "$PUBLIC_STATUS" = "UP" ] || [ "$PUBLIC_STATUS" = "N/A" ]); then
    echo "✅ SignFast is HEALTHY and RUNNING"
    echo ""
    echo "🎉 Your SignFast installation is working perfectly!"
    if [ "$PUBLIC_STATUS" = "UP" ]; then
        echo "🌐 Access your site at: https://$DOMAIN"
    fi
    echo "📱 Local access: http://localhost:3000"
    exit 0
else
    echo "❌ SignFast has ISSUES"
    echo ""
    echo "🔧 Troubleshooting:"
    if [ "$CONTAINER_STATUS" = "DOWN" ]; then
        echo "   - Container is down, try: signfast restart"
    fi
    if [ "$LOCAL_STATUS" = "DOWN" ]; then
        echo "   - Local website not responding, check logs: signfast logs"
    fi
    if [ "$PUBLIC_STATUS" = "DOWN" ]; then
        echo "   - Public website not responding, check nginx: sudo systemctl status nginx"
    fi
    exit 1
fi
EOF

    # Quick status script
    cat > /opt/signfast/quick-status.sh << 'EOF'
#!/bin/bash

# Quick one-line status check
echo -n "SignFast Status: "

if docker-compose ps | grep -q "signfast-app.*Up"; then
    if curl -f -s --max-time 5 http://localhost:3000 > /dev/null; then
        echo "🟢 RUNNING"
        exit 0
    else
        echo "🟡 CONTAINER UP BUT NOT RESPONDING"
        exit 1
    fi
else
    echo "🔴 DOWN"
    exit 1
fi
EOF

    # Make scripts executable
    chmod +x /opt/signfast/*.sh
    
    print_success "Scripts de gestion créés"
}

setup_monitoring() {
    print_step "Configuration du monitoring"
    
    # Create monitoring script
    cat > /opt/signfast/monitor.sh << 'EOF'
#!/bin/bash

# Check if SignFast container is running
if ! docker-compose ps | grep -q "signfast-app.*Up"; then
    echo "$(date): SignFast container is down, restarting..." >> /opt/signfast/logs/monitor.log
    cd /opt/signfast && docker-compose up -d
fi

# Check if website is responding
if ! curl -f -s http://localhost:3000 > /dev/null; then
    echo "$(date): SignFast not responding, restarting..." >> /opt/signfast/logs/monitor.log
    cd /opt/signfast && docker-compose restart
fi

# Check disk space
DISK_USAGE=$(df /opt/signfast | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "$(date): Disk usage high: ${DISK_USAGE}%" >> /opt/signfast/logs/monitor.log
fi
EOF

    chmod +x /opt/signfast/monitor.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/signfast/monitor.sh") | crontab -
    
    # Create log rotation
    sudo tee /etc/logrotate.d/signfast << 'EOF'
/opt/signfast/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

    print_success "Monitoring configuré"
}

deploy_application() {
    print_step "Déploiement de l'application SignFast"
    
    cd /opt/signfast
    
    # Clone or copy the application code
    if [ -d "/tmp/signfast-source" ]; then
        cp -r /tmp/signfast-source/* .
    else
        print_warning "Code source non trouvé, création d'un projet de base"
        # Create basic structure
        mkdir -p src public
        echo '{"name": "signfast", "version": "1.0.0", "scripts": {"build": "echo Built", "start": "echo Started"}}' > package.json
        echo '<html><body><h1>SignFast Installation</h1><p>Application en cours de configuration...</p></body></html>' > public/index.html
    fi
    
    # L'environnement est déjà créé par create_environment_file()
    
    if [[ "$INSTALL_MODE" == "2" ]]; then
        print_step "Initialisation de la base de données Supabase Self-Hosted"
        
        # Attendre que PostgreSQL soit prêt
        echo "Attente du démarrage de PostgreSQL..."
        docker-compose up -d supabase-db
        
        # Attendre que la base soit prête
        for i in {1..30}; do
            if docker-compose exec -T supabase-db pg_isready -U postgres > /dev/null 2>&1; then
                echo "✅ PostgreSQL prêt"
                break
            fi
            echo "Attente PostgreSQL... ($i/30)"
            sleep 2
        done
        
        # Démarrer tous les services Supabase
        echo "Démarrage des services Supabase..."
        docker-compose up -d supabase-auth supabase-rest supabase-realtime supabase-storage supabase-imgproxy supabase-kong
        
        # Attendre que Kong soit prêt
        echo "Attente de l'API Gateway..."
        for i in {1..60}; do
            if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
                echo "✅ API Gateway prêt"
                break
            fi
            echo "Attente API Gateway... ($i/60)"
            sleep 2
        done
    fi
    
    # Build and start
    docker-compose build
    docker-compose up -d
    
    # Wait for container to be ready
    echo "Attente du démarrage de l'application SignFast..."
    sleep 60
    
    # Check if running
    if docker-compose ps | grep -q "signfast-app.*Up"; then
        print_success "Application déployée et en cours d'exécution"
        
        if [[ "$INSTALL_MODE" == "2" ]]; then
            print_success "Supabase Self-Hosted déployé et configuré"
            echo "Base de données PostgreSQL: localhost:5432"
            echo "API Supabase: localhost:8000"
        fi
    else
        print_error "Erreur lors du déploiement"
        docker-compose logs
        exit 1
    fi
}

create_systemd_service() {
    print_step "Création du service systemd"
    
    sudo tee /etc/systemd/system/signfast.service << EOF
[Unit]
Description=SignFast Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/signfast
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0
User=${USER}
Group=${USER}

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable signfast.service
    
    print_success "Service systemd créé"
}

setup_security() {
    print_step "Configuration de la sécurité"
    
    # Configure fail2ban
    sudo apt install -y fail2ban
    
    sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/signfast_error.log
maxretry = 10
findtime = 600
bantime = 7200
EOF

    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    # Configure automatic security updates
    sudo apt install -y unattended-upgrades
    echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
    
    print_success "Sécurité configurée"
}

create_admin_tools() {
    print_step "Création des outils d'administration"
    
    # Create admin script
    cat > /opt/signfast/admin.sh << 'EOF'
#!/bin/bash

case "$1" in
    status)
        echo "=== SignFast Status ==="
        ./status.sh
        ;;
    health)
        echo "=== SignFast Health Check ==="
        ./health.sh
        ;;
    quick)
        ./quick-status.sh
        ;;
    start)
        echo "Démarrage de SignFast..."
        ./start.sh
        ;;
    stop)
        echo "Arrêt de SignFast..."
        ./stop.sh
        ;;
    restart)
        echo "Redémarrage de SignFast..."
        ./restart.sh
        ;;
    update)
        echo "Mise à jour de SignFast..."
        ./update.sh
        ;;
    backup)
        echo "Sauvegarde de SignFast..."
        ./backup.sh
        ;;
    logs)
        echo "Logs de SignFast..."
        ./logs.sh
        ;;
    ssl-renew)
        echo "Renouvellement SSL..."
        sudo certbot renew
        sudo systemctl reload nginx
        ;;
    cleanup)
        echo "Nettoyage des ressources..."
        docker system prune -f
        docker volume prune -f
        ;;
    *)
        echo "Usage: $0 {status|health|quick|start|stop|restart|update|backup|logs|ssl-renew|cleanup}"
        echo ""
        echo "Commandes disponibles:"
        echo "  status     - Afficher le statut de l'application"
        echo "  health     - Vérification complète de santé"
        echo "  quick      - Statut rapide (une ligne)"
        echo "  start      - Démarrer SignFast"
        echo "  stop       - Arrêter SignFast"
        echo "  restart    - Redémarrer SignFast"
        echo "  update     - Mettre à jour l'application"
        echo "  backup     - Créer une sauvegarde"
        echo "  logs       - Afficher les logs"
        echo "  ssl-renew  - Renouveler le certificat SSL"
        echo "  cleanup    - Nettoyer les ressources Docker"
        exit 1
        ;;
esac
EOF

    chmod +x /opt/signfast/admin.sh
    
    # Create symlink for global access
    sudo ln -sf /opt/signfast/admin.sh /usr/local/bin/signfast
    
    print_success "Outils d'administration créés"
    echo "Utilisez 'signfast status' pour vérifier l'état de l'application"
}

final_checks() {
    print_step "Vérifications finales"
    
    # Check if application is responding
    sleep 10
    if curl -f -s http://localhost:3000 > /dev/null; then
        print_success "Application répond sur le port 3000"
    else
        print_warning "Application ne répond pas encore (peut prendre quelques minutes)"
    fi
    
    # Check nginx
    if sudo nginx -t; then
        print_success "Configuration Nginx valide"
    else
        print_error "Erreur dans la configuration Nginx"
    fi
    
    # Check SSL
    if sudo certbot certificates | grep -q "${DOMAIN}"; then
        print_success "Certificat SSL configuré"
    else
        print_warning "Certificat SSL non configuré"
    fi
    
    print_success "Installation terminée !"
}

print_completion_info() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Installation Terminée !                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}🌐 Votre site SignFast est accessible à :${NC}"
    echo -e "${YELLOW}   https://${DOMAIN}${NC}"
    echo
    echo -e "${BLUE}📁 Fichiers d'installation :${NC}"
    echo -e "   /opt/signfast/"
    echo
    echo -e "${BLUE}🛠️  Commandes de gestion :${NC}"
    echo -e "   ${YELLOW}signfast status${NC}    - Statut de l'application"
    echo -e "   ${YELLOW}signfast restart${NC}   - Redémarrer l'application"
    echo -e "   ${YELLOW}signfast logs${NC}      - Voir les logs"
    echo -e "   ${YELLOW}signfast backup${NC}    - Créer une sauvegarde"
    echo -e "   ${YELLOW}signfast update${NC}    - Mettre à jour l'application"
    echo
    echo -e "${BLUE}📊 Monitoring :${NC}"
    echo -e "   - Vérification automatique toutes les 5 minutes"
    echo -e "   - Logs dans /opt/signfast/logs/"
    echo -e "   - Sauvegardes dans /opt/signfast/backups/"
    echo
    echo -e "${BLUE}🔒 Sécurité :${NC}"
    echo -e "   - SSL/TLS automatique avec Let's Encrypt"
    echo -e "   - Fail2ban configuré"
    echo -e "   - Mises à jour de sécurité automatiques"
    echo
    echo -e "${GREEN}🎉 SignFast est maintenant prêt à l'emploi !${NC}"
    echo
}

# Main installation process
main() {
    print_header
    
    check_root
    check_ubuntu
    collect_configuration
    
    print_step "Début de l'installation..."
    
    update_system
    install_docker
    install_nginx
    install_certbot
    create_app_structure
    create_docker_files
    create_environment_file
    configure_nginx_proxy
    setup_ssl
    deploy_application
    create_systemd_service
    setup_security
    create_management_scripts
    setup_monitoring
    final_checks
    
    print_completion_info
}

# Variables globales pour la configuration
INSTALL_MODE=""
POSTGRES_PASSWORD=""
JWT_SECRET=""

# Run main function
main "$@"