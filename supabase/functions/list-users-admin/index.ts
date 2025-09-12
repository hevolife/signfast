import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

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

    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(JSON.stringify({ error: 'Failed to list users' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const usersWithData = await Promise.all(
      authUsers.users.map(async (authUser) => {
        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const { data: subscription } = await supabaseAdmin
            .from('stripe_user_subscriptions')
            .select('*')
            .eq('customer_id', authUser.id)
            .maybeSingle();

          const { data: secretCode } = await supabaseAdmin
            .from('user_secret_codes')
            .select(`
              expires_at,
              secret_codes (type)
            `)
            .eq('user_id', authUser.id)
            .or('expires_at.is.null,expires_at.gt.now()')
            .maybeSingle();

          const { count: formsCount } = await supabaseAdmin.from('forms').select('id', { count: 'exact' }).eq('user_id', authUser.id);
          const { count: templatesCount } = await supabaseAdmin.from('pdf_templates').select('id', { count: 'exact' }).eq('user_id', authUser.id);
          const { count: pdfsCount } = await supabaseAdmin.from('pdf_storage').select('id', { count: 'exact' }).eq('user_id', authUser.id);
          const { count: responsesCount } = await supabaseAdmin.from('responses').select('id', { count: 'exact' });

          return {
            id: authUser.id,
            email: authUser.email || '',
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            profile,
            subscription,
            secretCode: secretCode ? {
              type: secretCode.secret_codes?.type,
              expires_at: secretCode.expires_at
            } : undefined,
            stats: {
              forms_count: formsCount || 0,
              templates_count: templatesCount || 0,
              pdfs_count: pdfsCount || 0,
              responses_count: responsesCount || 0,
            }
          };
        } catch (innerError) {
          console.error(`Error processing user ${authUser.id}:`, innerError);
          return {
            id: authUser.id,
            email: authUser.email || '',
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            stats: { forms_count: 0, templates_count: 0, pdfs_count: 0, responses_count: 0 }
          };
        }
      })
    );

    return new Response(JSON.stringify(usersWithData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in list-users-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});