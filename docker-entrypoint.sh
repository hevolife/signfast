#!/bin/sh

# SignFast Docker Entrypoint Script
set -e

echo "🚀 Starting SignFast Application..."

# Create log directories
mkdir -p /var/log/nginx
touch /var/log/nginx/access.log
touch /var/log/nginx/error.log

# Set proper permissions
chown -R nginx:nginx /var/log/nginx /usr/share/nginx/html

# Validate environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL is required"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ VITE_SUPABASE_ANON_KEY is required"
    exit 1
fi

echo "✅ Environment variables validated"

# Replace environment variables in built files if needed
if [ -f "/usr/share/nginx/html/index.html" ]; then
    echo "✅ Application files found"
else
    echo "❌ Application files not found"
    exit 1
fi

# Test nginx configuration
nginx -t

echo "✅ SignFast ready to start"

# Execute the main command
exec "$@"