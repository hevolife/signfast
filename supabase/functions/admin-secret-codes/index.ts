import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Créer un client Supabase avec les permissions admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Vérifier si l'utilisateur est super admin
    const isSuperAdmin = user.email === 'admin@signfast.com' || user.email?.endsWith('@admin.signfast.com');
    
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Not a super admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'GET') {
      // Lister tous les codes secrets
      console.log('🔑 Récupération de tous les codes secrets...');
      
      const { data, error } = await supabase
        .from('secret_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération codes:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch secret codes' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      console.log('✅ Codes récupérés:', data?.length || 0);
      
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'POST') {
      // Créer un nouveau code secret
      const { type, description, maxUses } = await req.json();

      if (!type || !description) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      console.log('🔑 Création code secret:', { type, description, maxUses });
      
      const code = `${type.toUpperCase()}${Date.now().toString().slice(-6)}`;
      const expiresAt = type === 'monthly' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('secret_codes')
        .insert([{
          code,
          type,
          description,
          max_uses: maxUses,
          expires_at: expiresAt,
          is_active: true,
          current_uses: 0,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création code:', error);
        return new Response(JSON.stringify({ error: 'Failed to create secret code' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      console.log('✅ Code créé avec succès:', data);
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'DELETE') {
      // Supprimer un code secret
      const url = new URL(req.url);
      const codeId = url.searchParams.get('id');

      if (!codeId) {
        return new Response(JSON.stringify({ error: 'Missing code ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      console.log('🗑️ Suppression code secret:', codeId);
      
      const { error } = await supabase
        .from('secret_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('❌ Erreur suppression code:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete secret code' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      console.log('✅ Code supprimé avec succès');
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erreur générale:', error);
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});