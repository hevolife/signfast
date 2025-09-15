#!/bin/sh

# Script d'entrée pour injecter les variables d'environnement dans l'application React

# Créer le fichier de configuration JavaScript avec les variables d'environnement
cat <<EOF > /usr/share/nginx/html/config.js
window.ENV = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-http://localhost:8000}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}",
  NODE_ENV: "${NODE_ENV:-production}"
};
EOF

echo "✅ Variables d'environnement injectées dans /usr/share/nginx/html/config.js"

# Démarrer Nginx
exec "$@"