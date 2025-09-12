import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Créer un client Supabase avec les permissions admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Vérification existence compte admin...');

    // Vérifier si le compte admin existe déjà
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur lors de la vérification des utilisateurs:', listError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des utilisateurs' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const adminExists = existingUsers.users.some(user => user.email === 'admin@signfast.com');

    if (adminExists) {
      console.log('✅ Compte admin existe déjà');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Compte admin existe déjà',
          admin_email: 'admin@signfast.com'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('🔧 Création du compte super admin...');

    // Créer le compte super admin
    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@signfast.com',
      password: 'SuperAdmin2025!',
      email_confirm: true, // Confirmer automatiquement l'email
      user_metadata: {
        role: 'super_admin',
        created_by: 'auto_setup'
      }
    });

    if (createError) {
      console.error('❌ Erreur création compte admin:', createError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du compte admin: ' + createError.message }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('✅ Compte admin créé avec succès:', adminUser.user?.id);

    // Créer le profil admin
    if (adminUser.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: adminUser.user.id,
          first_name: 'Super',
          last_name: 'Admin',
          company_name: 'SignFast Administration',
        }]);

      if (profileError) {
        console.warn('⚠️ Erreur création profil admin:', profileError);
      } else {
        console.log('✅ Profil admin créé');
      }
    }

    // Créer des codes secrets de démonstration
    console.log('🔧 Création des codes secrets de démonstration...');
    
    const secretCodes = [
      {
        code: 'ADMIN2025',
        type: 'lifetime',
        description: 'Code super admin à vie',
        max_uses: 100,
      },
      {
        code: 'MONTHLY01',
        type: 'monthly',
        description: 'Code mensuel de test',
        max_uses: 10,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        code: 'TESTLIFE',
        type: 'lifetime',
        description: 'Code à vie de test',
        max_uses: 1,
      },
      {
        code: 'DEMO2025',
        type: 'monthly',
        description: 'Code démo mensuel',
        max_uses: 5,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { error: codesError } = await supabase
      .from('secret_codes')
      .insert(secretCodes);

    if (codesError) {
      console.warn('⚠️ Erreur création codes secrets:', codesError);
    } else {
      console.log('✅ Codes secrets créés');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Compte super admin créé avec succès',
        admin_email: 'admin@signfast.com',
        admin_password: 'SuperAdmin2025!',
        secret_codes: secretCodes.map(c => c.code),
        admin_id: adminUser.user?.id
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur générale:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne: ' + error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});