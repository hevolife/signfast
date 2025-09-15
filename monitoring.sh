#!/bin/bash

# SignFast Monitoring Script
# This script monitors the health of SignFast and sends alerts

# Configuration
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${ADMIN_EMAIL:-admin@localhost}"
LOG_FILE="/opt/signfast/logs/monitor.log"
ALERT_FILE="/opt/signfast/logs/alerts.log"

# Functions
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

send_alert() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: $message" >> $ALERT_FILE
    
    # Send email if configured
    if command -v mail >/dev/null 2>&1 && [ "$EMAIL" != "admin@localhost" ]; then
        echo "$message" | mail -s "SignFast Alert - $DOMAIN" "$EMAIL"
    fi
    
    # Log to syslog
    logger -t signfast "ALERT: $message"
}

check_container_health() {
    if ! docker-compose ps | grep -q "signfast-app.*Up"; then
        send_alert "SignFast container is down"
        log_message "Container down, attempting restart"
        
        cd /opt/signfast
        docker-compose up -d
        
        sleep 30
        
        if docker-compose ps | grep -q "signfast-app.*Up"; then
            log_message "Container restarted successfully"
        else
            send_alert "Failed to restart SignFast container"
        fi
    fi
}

check_website_response() {
    local url="http://localhost:3000"
    
    if ! curl -f -s --max-time 10 "$url" > /dev/null; then
        send_alert "SignFast website not responding on $url"
        log_message "Website not responding, attempting restart"
        
        cd /opt/signfast
        docker-compose restart signfast
        
        sleep 30
        
        if curl -f -s --max-time 10 "$url" > /dev/null; then
            log_message "Website responding after restart"
        else
            send_alert "Website still not responding after restart"
        fi
    fi
}

check_ssl_certificate() {
    if [ "$DOMAIN" != "localhost" ]; then
        local expiry_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            send_alert "SSL certificate expires in $days_until_expiry days"
        fi
        
        log_message "SSL certificate expires in $days_until_expiry days"
    fi
}

check_disk_space() {
    local disk_usage=$(df /opt/signfast | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $disk_usage -gt 85 ]; then
        send_alert "Disk usage high: ${disk_usage}%"
        
        # Cleanup old logs and backups
        find /opt/signfast/logs -name "*.log" -type f -mtime +7 -delete
        find /opt/signfast/backups -name "*.tar.gz" -type f -mtime +30 -delete
        docker system prune -f
        
        log_message "Cleanup performed due to high disk usage: ${disk_usage}%"
    fi
}

check_memory_usage() {
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ $memory_usage -gt 90 ]; then
        send_alert "Memory usage high: ${memory_usage}%"
        log_message "High memory usage detected: ${memory_usage}%"
        
        # Restart container if memory usage is critical
        if [ $memory_usage -gt 95 ]; then
            log_message "Critical memory usage, restarting container"
            cd /opt/signfast
            docker-compose restart signfast
        fi
    fi
}

check_docker_logs() {
    # Check for errors in Docker logs
    local error_count=$(docker-compose logs --since="5m" signfast 2>&1 | grep -i error | wc -l)
    
    if [ $error_count -gt 10 ]; then
        send_alert "High error count in application logs: $error_count errors in last 5 minutes"
    fi
}

generate_health_report() {
    local report_file="/opt/signfast/logs/health-report-$(date +%Y%m%d).log"
    
    {
        echo "=== SignFast Health Report - $(date) ==="
        echo ""
        echo "Container Status:"
        docker-compose ps
        echo ""
        echo "System Resources:"
        echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
        echo "Disk: $(df -h /opt/signfast | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
        echo ""
        echo "Network Connectivity:"
        if curl -f -s --max-time 5 http://localhost:3000 > /dev/null; then
            echo "✅ Local application responding"
        else
            echo "❌ Local application not responding"
        fi
        
        if [ "$DOMAIN" != "localhost" ]; then
            if curl -f -s --max-time 10 "https://$DOMAIN" > /dev/null; then
                echo "✅ Public website responding"
            else
                echo "❌ Public website not responding"
            fi
        fi
        echo ""
        echo "Recent Errors (last 1 hour):"
        docker-compose logs --since="1h" signfast 2>&1 | grep -i error | tail -10
        echo ""
        echo "=== End Report ==="
    } > $report_file
    
    # Keep only last 7 days of reports
    find /opt/signfast/logs -name "health-report-*.log" -type f -mtime +7 -delete
}

# Main monitoring function
main() {
    log_message "Starting health check"
    
    check_container_health
    check_website_response
    check_disk_space
    check_memory_usage
    check_docker_logs
    
    if [ "$DOMAIN" != "localhost" ]; then
        check_ssl_certificate
    fi
    
    # Generate daily health report at midnight
    if [ "$(date +%H%M)" = "0000" ]; then
        generate_health_report
    fi
    
    log_message "Health check completed"
}

# Run monitoring
main "$@"