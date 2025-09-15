#!/bin/bash

# SignFast Security Hardening Script
# This script applies additional security measures for production deployment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[SECURITY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

configure_firewall() {
    print_step "Configuration avancée du pare-feu"
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (be careful not to lock yourself out)
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow specific IPs for admin access (optional)
    # sudo ufw allow from YOUR_ADMIN_IP to any port 22
    
    # Rate limiting for SSH
    sudo ufw limit ssh
    
    # Enable firewall
    sudo ufw --force enable
    
    print_success "Pare-feu configuré"
}

harden_ssh() {
    print_step "Durcissement de la configuration SSH"
    
    # Backup original config
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Apply hardening
    sudo tee -a /etc/ssh/sshd_config.d/99-signfast-hardening.conf << 'EOF'
# SignFast SSH Hardening

# Disable root login
PermitRootLogin no

# Use only SSH key authentication
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Disable agent forwarding
AllowAgentForwarding no

# Disable TCP forwarding
AllowTcpForwarding no

# Set login grace time
LoginGraceTime 30

# Maximum authentication attempts
MaxAuthTries 3

# Maximum sessions per connection
MaxSessions 2

# Use only strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Use only strong MACs
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Use only strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256

# Banner
Banner /etc/ssh/banner
EOF

    # Create SSH banner
    sudo tee /etc/ssh/banner << 'EOF'
***************************************************************************
                            AUTHORIZED ACCESS ONLY
                              SignFast Production Server
                         
    This system is for authorized users only. All activities are logged
    and monitored. Unauthorized access is strictly prohibited.
***************************************************************************
EOF

    # Test SSH configuration
    sudo sshd -t
    
    # Restart SSH service
    sudo systemctl restart sshd
    
    print_success "SSH durci"
}

configure_fail2ban() {
    print_step "Configuration avancée de Fail2ban"
    
    # Install if not present
    sudo apt install -y fail2ban
    
    # Create custom configuration
    sudo tee /etc/fail2ban/jail.d/signfast.conf << 'EOF'
[DEFAULT]
# Ban time in seconds (1 hour)
bantime = 3600

# Time window for counting failures (10 minutes)
findtime = 600

# Number of failures before ban
maxretry = 5

# Email notifications (configure if needed)
# destemail = admin@yourdomain.com
# sender = fail2ban@yourdomain.com
# action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/signfast_error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/signfast_error.log
maxretry = 10
findtime = 600
bantime = 7200

[nginx-bad-request]
enabled = true
filter = nginx-bad-request
port = http,https
logpath = /var/log/nginx/signfast_access.log
maxretry = 5
bantime = 3600
EOF

    # Create custom filters
    sudo tee /etc/fail2ban/filter.d/nginx-bad-request.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (400|401|403|404|444) .*$
ignoreregex =
EOF

    # Start and enable fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    print_success "Fail2ban configuré"
}

setup_log_monitoring() {
    print_step "Configuration de la surveillance des logs"
    
    # Install logwatch
    sudo apt install -y logwatch
    
    # Configure logwatch
    sudo tee /etc/logwatch/conf/logwatch.conf << 'EOF'
LogDir = /var/log
TmpDir = /var/cache/logwatch
MailTo = root
MailFrom = Logwatch
Print = Yes
Save = /var/cache/logwatch
Range = yesterday
Detail = Med
Service = All
mailer = "/usr/sbin/sendmail -t"
EOF

    # Create custom logwatch service for SignFast
    sudo mkdir -p /etc/logwatch/conf/services
    sudo tee /etc/logwatch/conf/services/signfast.conf << 'EOF'
Title = "SignFast Application"
LogFile = /opt/signfast/logs/*.log
*OnlyService = signfast
*RemoveHeaders
EOF

    print_success "Surveillance des logs configurée"
}

configure_automatic_updates() {
    print_step "Configuration des mises à jour automatiques"
    
    # Configure unattended upgrades
    sudo tee /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    sudo tee /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // "nginx";
    // "docker-ce";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

Unattended-Upgrade::Mail "root";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

    print_success "Mises à jour automatiques configurées"
}

setup_intrusion_detection() {
    print_step "Configuration de la détection d'intrusion"
    
    # Install and configure AIDE (Advanced Intrusion Detection Environment)
    sudo apt install -y aide
    
    # Initialize AIDE database
    print_step "Initialisation de la base de données AIDE (peut prendre quelques minutes)"
    sudo aideinit
    sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    
    # Create daily check script
    sudo tee /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
# Daily AIDE integrity check

AIDE_LOG="/var/log/aide/aide-$(date +%Y%m%d).log"
mkdir -p /var/log/aide

# Run AIDE check
aide --check > $AIDE_LOG 2>&1

# Check for changes
if [ $? -ne 0 ]; then
    echo "AIDE detected file system changes on $(hostname)" | mail -s "AIDE Alert - $(hostname)" root
fi

# Cleanup old logs
find /var/log/aide -name "aide-*.log" -type f -mtime +30 -delete
EOF

    sudo chmod +x /etc/cron.daily/aide-check
    
    print_success "Détection d'intrusion configurée"
}

configure_docker_security() {
    print_step "Sécurisation de Docker"
    
    # Create Docker daemon configuration
    sudo mkdir -p /etc/docker
    sudo tee /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "live-restore": true,
    "userland-proxy": false,
    "no-new-privileges": true,
    "seccomp-profile": "/etc/docker/seccomp.json"
}
EOF

    # Create seccomp profile
    sudo tee /etc/docker/seccomp.json << 'EOF'
{
    "defaultAction": "SCMP_ACT_ERRNO",
    "architectures": [
        "SCMP_ARCH_X86_64",
        "SCMP_ARCH_X86",
        "SCMP_ARCH_X32"
    ],
    "syscalls": [
        {
            "names": [
                "accept",
                "accept4",
                "access",
                "adjtimex",
                "alarm",
                "bind",
                "brk",
                "capget",
                "capset",
                "chdir",
                "chmod",
                "chown",
                "chroot",
                "clock_getres",
                "clock_gettime",
                "clock_nanosleep",
                "close",
                "connect",
                "copy_file_range",
                "creat",
                "dup",
                "dup2",
                "dup3",
                "epoll_create",
                "epoll_create1",
                "epoll_ctl",
                "epoll_pwait",
                "epoll_wait",
                "eventfd",
                "eventfd2",
                "execve",
                "execveat",
                "exit",
                "exit_group",
                "faccessat",
                "fadvise64",
                "fallocate",
                "fanotify_mark",
                "fchdir",
                "fchmod",
                "fchmodat",
                "fchown",
                "fchownat",
                "fcntl",
                "fdatasync",
                "fgetxattr",
                "flistxattr",
                "flock",
                "fork",
                "fremovexattr",
                "fsetxattr",
                "fstat",
                "fstatfs",
                "fsync",
                "ftruncate",
                "futex",
                "getcwd",
                "getdents",
                "getdents64",
                "getegid",
                "geteuid",
                "getgid",
                "getgroups",
                "getpeername",
                "getpgid",
                "getpgrp",
                "getpid",
                "getppid",
                "getpriority",
                "getrandom",
                "getresgid",
                "getresuid",
                "getrlimit",
                "get_robust_list",
                "getrusage",
                "getsid",
                "getsockname",
                "getsockopt",
                "get_thread_area",
                "gettid",
                "gettimeofday",
                "getuid",
                "getxattr",
                "inotify_add_watch",
                "inotify_init",
                "inotify_init1",
                "inotify_rm_watch",
                "io_cancel",
                "ioctl",
                "io_destroy",
                "io_getevents",
                "ioprio_get",
                "ioprio_set",
                "io_setup",
                "io_submit",
                "ipc",
                "kill",
                "lchown",
                "lgetxattr",
                "link",
                "linkat",
                "listen",
                "listxattr",
                "llistxattr",
                "lremovexattr",
                "lseek",
                "lsetxattr",
                "lstat",
                "madvise",
                "memfd_create",
                "mincore",
                "mkdir",
                "mkdirat",
                "mknod",
                "mknodat",
                "mlock",
                "mlock2",
                "mlockall",
                "mmap",
                "mount",
                "mprotect",
                "mq_getsetattr",
                "mq_notify",
                "mq_open",
                "mq_timedreceive",
                "mq_timedsend",
                "mq_unlink",
                "mremap",
                "msgctl",
                "msgget",
                "msgrcv",
                "msgsnd",
                "msync",
                "munlock",
                "munlockall",
                "munmap",
                "nanosleep",
                "newfstatat",
                "open",
                "openat",
                "pause",
                "pipe",
                "pipe2",
                "poll",
                "ppoll",
                "prctl",
                "pread64",
                "preadv",
                "prlimit64",
                "pselect6",
                "ptrace",
                "pwrite64",
                "pwritev",
                "read",
                "readahead",
                "readlink",
                "readlinkat",
                "readv",
                "recv",
                "recvfrom",
                "recvmmsg",
                "recvmsg",
                "remap_file_pages",
                "removexattr",
                "rename",
                "renameat",
                "renameat2",
                "restart_syscall",
                "rmdir",
                "rt_sigaction",
                "rt_sigpending",
                "rt_sigprocmask",
                "rt_sigqueueinfo",
                "rt_sigreturn",
                "rt_sigsuspend",
                "rt_sigtimedwait",
                "rt_tgsigqueueinfo",
                "sched_getaffinity",
                "sched_getattr",
                "sched_getparam",
                "sched_get_priority_max",
                "sched_get_priority_min",
                "sched_getscheduler",
                "sched_rr_get_interval",
                "sched_setaffinity",
                "sched_setattr",
                "sched_setparam",
                "sched_setscheduler",
                "sched_yield",
                "seccomp",
                "select",
                "semctl",
                "semget",
                "semop",
                "semtimedop",
                "send",
                "sendfile",
                "sendmmsg",
                "sendmsg",
                "sendto",
                "setfsgid",
                "setfsuid",
                "setgid",
                "setgroups",
                "setitimer",
                "setpgid",
                "setpriority",
                "setregid",
                "setresgid",
                "setresuid",
                "setreuid",
                "setrlimit",
                "set_robust_list",
                "setsid",
                "setsockopt",
                "set_thread_area",
                "set_tid_address",
                "setuid",
                "setxattr",
                "shmat",
                "shmctl",
                "shmdt",
                "shmget",
                "shutdown",
                "sigaltstack",
                "signalfd",
                "signalfd4",
                "sigreturn",
                "socket",
                "socketcall",
                "socketpair",
                "splice",
                "stat",
                "statfs",
                "symlink",
                "symlinkat",
                "sync",
                "sync_file_range",
                "syncfs",
                "sysinfo",
                "tee",
                "tgkill",
                "time",
                "timer_create",
                "timer_delete",
                "timerfd_create",
                "timerfd_gettime",
                "timerfd_settime",
                "timer_getoverrun",
                "timer_gettime",
                "timer_settime",
                "times",
                "tkill",
                "truncate",
                "umask",
                "uname",
                "unlink",
                "unlinkat",
                "utime",
                "utimensat",
                "utimes",
                "vfork",
                "vmsplice",
                "wait4",
                "waitid",
                "waitpid",
                "write",
                "writev"
            ],
            "action": "SCMP_ACT_ALLOW"
        }
    ]
}
EOF

    # Restart Docker to apply new configuration
    sudo systemctl restart docker
    
    print_success "Docker sécurisé"
}

setup_log_monitoring() {
    print_step "Configuration de la surveillance des logs de sécurité"
    
    # Install logcheck
    sudo apt install -y logcheck
    
    # Configure logcheck
    sudo tee /etc/logcheck/logcheck.conf << 'EOF'
REPORTLEVEL="server"
SENDMAILTO="root"
MAILASATTACH=0
MAILBODY=1
LOGCHECK_IGNORE_CROND=1
LOGCHECK_IGNORE_DUPS=1
EOF

    # Add SignFast specific rules
    sudo tee /etc/logcheck/ignore.d.server/signfast << 'EOF'
^\w{3} [ :0-9]{11} [._[:alnum:]-]+ nginx: .*$
^\w{3} [ :0-9]{11} [._[:alnum:]-]+ docker.*: .*$
EOF

    print_success "Surveillance des logs configurée"
}

configure_system_limits() {
    print_step "Configuration des limites système"
    
    # Configure system limits
    sudo tee /etc/security/limits.d/99-signfast.conf << 'EOF'
# SignFast system limits
*               soft    nofile          65536
*               hard    nofile          65536
*               soft    nproc           32768
*               hard    nproc           32768
root            soft    nofile          65536
root            hard    nofile          65536
EOF

    # Configure sysctl parameters
    sudo tee /etc/sysctl.d/99-signfast.conf << 'EOF'
# SignFast kernel parameters

# Network security
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1

# Performance tuning
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File system
fs.file-max = 2097152
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

    # Apply sysctl settings
    sudo sysctl -p /etc/sysctl.d/99-signfast.conf
    
    print_success "Limites système configurées"
}

setup_backup_encryption() {
    print_step "Configuration du chiffrement des sauvegardes"
    
    # Install GPG if not present
    sudo apt install -y gnupg
    
    # Create backup encryption script
    sudo tee /opt/signfast/encrypt-backup.sh << 'EOF'
#!/bin/bash

# Encrypt backup files with GPG
BACKUP_DIR="/opt/signfast/backups"
GPG_RECIPIENT="signfast-backup@localhost"

# Create GPG key if it doesn't exist
if ! gpg --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1; then
    echo "Creating GPG key for backup encryption..."
    gpg --batch --generate-key << EOL
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: SignFast Backup
Name-Email: $GPG_RECIPIENT
Expire-Date: 0
Passphrase: $(openssl rand -base64 32)
%commit
EOL
fi

# Encrypt all unencrypted backup files
for backup in "$BACKUP_DIR"/*.tar.gz; do
    if [ -f "$backup" ] && [ ! -f "$backup.gpg" ]; then
        echo "Encrypting $(basename "$backup")..."
        gpg --trust-model always --encrypt -r "$GPG_RECIPIENT" "$backup"
        
        # Verify encryption worked
        if [ -f "$backup.gpg" ]; then
            rm "$backup"
            echo "Encrypted and removed original: $(basename "$backup")"
        fi
    fi
done
EOF

    sudo chmod +x /opt/signfast/encrypt-backup.sh
    
    print_success "Chiffrement des sauvegardes configuré"
}

create_security_report() {
    print_step "Génération du rapport de sécurité"
    
    local report_file="/opt/signfast/logs/security-report-$(date +%Y%m%d).log"
    
    {
        echo "=== SignFast Security Report - $(date) ==="
        echo ""
        echo "System Information:"
        echo "OS: $(lsb_release -d | cut -f2)"
        echo "Kernel: $(uname -r)"
        echo "Uptime: $(uptime -p)"
        echo ""
        echo "Security Services Status:"
        echo "UFW: $(sudo ufw status | head -1)"
        echo "Fail2ban: $(sudo systemctl is-active fail2ban)"
        echo "SSH: $(sudo systemctl is-active ssh)"
        echo "Docker: $(sudo systemctl is-active docker)"
        echo ""
        echo "Open Ports:"
        sudo ss -tlnp | grep LISTEN
        echo ""
        echo "Failed Login Attempts (last 24h):"
        sudo grep "Failed password" /var/log/auth.log | grep "$(date +%b\ %d)" | wc -l
        echo ""
        echo "Fail2ban Status:"
        sudo fail2ban-client status
        echo ""
        echo "Docker Security:"
        docker info --format '{{.SecurityOptions}}'
        echo ""
        echo "File Permissions Check:"
        ls -la /opt/signfast/.env 2>/dev/null || echo ".env file not found"
        echo ""
        echo "=== End Security Report ==="
    } > $report_file
    
    print_success "Rapport de sécurité généré : $report_file"
}

main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                SignFast Security Hardening                  ║"
    echo "║                     Ubuntu 24.04 LTS                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_warning "Ce script applique des mesures de sécurité avancées"
    print_warning "Assurez-vous d'avoir un accès SSH par clé avant de continuer"
    
    read -p "Continuer le durcissement de sécurité ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    configure_firewall
    harden_ssh
    configure_fail2ban
    setup_log_monitoring
    configure_automatic_updates
    setup_intrusion_detection
    configure_docker_security
    configure_system_limits
    setup_backup_encryption
    create_security_report
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                Durcissement Sécuritaire Terminé !            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}🔒 Mesures de sécurité appliquées :${NC}"
    echo -e "   ✅ Pare-feu UFW configuré"
    echo -e "   ✅ SSH durci (clés uniquement)"
    echo -e "   ✅ Fail2ban configuré"
    echo -e "   ✅ Surveillance des logs"
    echo -e "   ✅ Mises à jour automatiques"
    echo -e "   ✅ Détection d'intrusion AIDE"
    echo -e "   ✅ Docker sécurisé"
    echo -e "   ✅ Chiffrement des sauvegardes"
    echo
    echo -e "${YELLOW}⚠️  IMPORTANT :${NC}"
    echo -e "   - SSH par mot de passe est maintenant DÉSACTIVÉ"
    echo -e "   - Utilisez uniquement les clés SSH"
    echo -e "   - Vérifiez votre accès SSH avant de fermer cette session"
    echo
    echo -e "${BLUE}📊 Rapports de sécurité :${NC}"
    echo -e "   /opt/signfast/logs/security-report-*.log"
    echo
}

# Run main function
main "$@"