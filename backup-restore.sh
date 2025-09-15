#!/bin/bash

# SignFast Backup and Restore Script

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="/opt/signfast/backups"
APP_DIR="/opt/signfast"

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

create_backup() {
    local backup_type="${1:-manual}"
    local date_stamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/signfast_${backup_type}_${date_stamp}.tar.gz"
    
    print_step "Création de la sauvegarde ${backup_type}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup with metadata
    {
        echo "SignFast Backup Metadata"
        echo "========================"
        echo "Date: $(date)"
        echo "Type: $backup_type"
        echo "Version: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
        echo "Domain: ${DOMAIN:-unknown}"
        echo ""
        echo "Container Status:"
        docker-compose ps 2>/dev/null || echo "Docker not running"
        echo ""
        echo "Disk Usage:"
        df -h "$APP_DIR"
    } > "${BACKUP_DIR}/backup_${date_stamp}.info"
    
    # Create the backup archive
    tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='logs/*.log' \
        --exclude='backups' \
        --exclude='.git' \
        -C "$(dirname $APP_DIR)" \
        "$(basename $APP_DIR)" \
        2>/dev/null
    
    # Add metadata to archive
    tar -rzf "$backup_file" -C "$BACKUP_DIR" "backup_${date_stamp}.info"
    rm "${BACKUP_DIR}/backup_${date_stamp}.info"
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    print_success "Sauvegarde créée : $backup_file ($backup_size)"
    
    # Cleanup old backups based on type
    case $backup_type in
        "auto")
            # Keep 7 days of auto backups
            find "$BACKUP_DIR" -name "signfast_auto_*.tar.gz" -type f -mtime +7 -delete
            ;;
        "manual")
            # Keep 30 days of manual backups
            find "$BACKUP_DIR" -name "signfast_manual_*.tar.gz" -type f -mtime +30 -delete
            ;;
        "pre-update")
            # Keep 14 days of pre-update backups
            find "$BACKUP_DIR" -name "signfast_pre-update_*.tar.gz" -type f -mtime +14 -delete
            ;;
    esac
    
    echo "$backup_file"
}

list_backups() {
    print_step "Liste des sauvegardes disponibles"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.tar.gz 2>/dev/null)" ]; then
        print_warning "Aucune sauvegarde trouvée"
        return
    fi
    
    echo "Sauvegardes disponibles :"
    echo "========================"
    
    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
            
            echo "📁 $filename"
            echo "   Taille: $size"
            echo "   Date: $date"
            echo ""
        fi
    done
}

restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Nom de fichier de sauvegarde requis"
        echo "Usage: $0 restore <nom-fichier-sauvegarde>"
        list_backups
        exit 1
    fi
    
    # Check if backup file exists
    if [ ! -f "$BACKUP_DIR/$backup_file" ] && [ ! -f "$backup_file" ]; then
        print_error "Fichier de sauvegarde non trouvé: $backup_file"
        list_backups
        exit 1
    fi
    
    # Use full path if not provided
    if [ ! -f "$backup_file" ]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    print_warning "⚠️  ATTENTION: Cette opération va remplacer l'installation actuelle"
    read -p "Continuer la restauration ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    print_step "Restauration depuis $backup_file"
    
    # Stop the application
    cd "$APP_DIR"
    docker-compose down
    
    # Create a backup of current state before restore
    print_step "Sauvegarde de l'état actuel avant restauration"
    local pre_restore_backup=$(create_backup "pre-restore")
    print_success "Sauvegarde pré-restauration : $pre_restore_backup"
    
    # Extract backup
    print_step "Extraction de la sauvegarde"
    cd "$(dirname $APP_DIR)"
    tar -xzf "$backup_file"
    
    # Restart application
    print_step "Redémarrage de l'application"
    cd "$APP_DIR"
    docker-compose up -d
    
    # Wait and check
    sleep 30
    if docker-compose ps | grep -q "signfast-app.*Up"; then
        print_success "Restauration terminée avec succès"
    else
        print_error "Erreur lors de la restauration"
        print_warning "Tentative de restauration de l'état précédent..."
        
        # Try to restore previous state
        docker-compose down
        cd "$(dirname $APP_DIR)"
        tar -xzf "$pre_restore_backup"
        cd "$APP_DIR"
        docker-compose up -d
        
        print_warning "État précédent restauré"
        exit 1
    fi
}

automated_backup() {
    print_step "Sauvegarde automatique programmée"
    
    # Create backup
    local backup_file=$(create_backup "auto")
    
    # Check application health after backup
    if ! curl -f -s --max-time 10 http://localhost:3000 > /dev/null; then
        print_warning "Application ne répond pas après la sauvegarde"
        cd "$APP_DIR"
        docker-compose restart signfast
    fi
    
    # Generate backup report
    local backup_count=$(ls -1 "$BACKUP_DIR"/signfast_*.tar.gz 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    echo "Rapport de sauvegarde automatique" >> "$LOG_FILE"
    echo "=================================" >> "$LOG_FILE"
    echo "Fichier: $backup_file" >> "$LOG_FILE"
    echo "Nombre total de sauvegardes: $backup_count" >> "$LOG_FILE"
    echo "Taille totale: $total_size" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

case "$1" in
    "create")
        create_backup "manual"
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "auto")
        automated_backup
        ;;
    *)
        echo "Usage: $0 {create|list|restore|auto}"
        echo ""
        echo "Commandes:"
        echo "  create           - Créer une sauvegarde manuelle"
        echo "  list             - Lister les sauvegardes disponibles"
        echo "  restore <file>   - Restaurer depuis une sauvegarde"
        echo "  auto             - Sauvegarde automatique (pour cron)"
        echo ""
        echo "Exemples:"
        echo "  $0 create"
        echo "  $0 list"
        echo "  $0 restore signfast_manual_20250115_143022.tar.gz"
        exit 1
        ;;
esac