import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { affiliate_code, referred_user_id } = await req.json();

    if (!affiliate_code || !referred_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔗 Tracking affiliate signup:', { affiliate_code, referred_user_id });

    // Trouver le programme d'affiliation
    const { data: affiliateProgram, error: programError } = await supabase
      .from('affiliate_programs')
      .select('user_id, commission_rate, is_active')
      .eq('affiliate_code', affiliate_code)
      .eq('is_active', true)
      .single();

    if (programError || !affiliateProgram) {
      console.log('❌ Programme d\'affiliation non trouvé:', affiliate_code);
      return new Response(
        JSON.stringify({ error: 'Invalid affiliate code' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Vérifier que l'utilisateur ne se parraine pas lui-même
    if (affiliateProgram.user_id === referred_user_id) {
      console.log('❌ Auto-parrainage détecté');
      return new Response(
        JSON.stringify({ error: 'Self-referral not allowed' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Créer le parrainage
    const { data: referral, error: referralError } = await supabase
      .from('affiliate_referrals')
      .insert([{
        affiliate_user_id: affiliateProgram.user_id,
        referred_user_id: referred_user_id,
        commission_rate: affiliateProgram.commission_rate,
        status: 'pending'
      }])
      .select()
      .single();

    if (referralError) {
      console.error('❌ Erreur création parrainage:', referralError);
      return new Response(
        JSON.stringify({ error: 'Failed to create referral' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('✅ Parrainage créé:', referral.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        referral_id: referral.id,
        commission_rate: affiliateProgram.commission_rate
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
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
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