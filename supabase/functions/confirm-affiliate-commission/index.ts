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

    const { customer_id, subscription_id, amount } = await req.json();

    if (!customer_id || !subscription_id || !amount) {
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

    console.log('💰 Confirmation commission affiliation:', { customer_id, subscription_id, amount });

    // Trouver l'utilisateur correspondant au customer_id
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customer_id)
      .single();

    if (customerError || !customer) {
      console.log('❌ Customer non trouvé:', customer_id);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Chercher un parrainage en attente pour cet utilisateur
    const { data: referral, error: referralError } = await supabase
      .from('affiliate_referrals')
      .select('*, affiliate_programs!inner(commission_rate)')
      .eq('referred_user_id', customer.user_id)
      .eq('status', 'pending')
      .single();

    if (referralError || !referral) {
      console.log('❌ Aucun parrainage en attente trouvé pour:', customer.user_id);
      return new Response(
        JSON.stringify({ error: 'No pending referral found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Calculer la commission (montant en centimes, convertir en euros)
    const subscriptionAmount = amount / 100; // Stripe envoie en centimes
    const commissionAmount = (subscriptionAmount * referral.commission_rate) / 100;

    console.log('💰 Calcul commission:', {
      subscriptionAmount,
      commissionRate: referral.commission_rate,
      commissionAmount
    });

    // Mettre à jour le parrainage
    const { error: updateError } = await supabase
      .from('affiliate_referrals')
      .update({
        subscription_id: subscription_id,
        commission_amount: commissionAmount,
        status: 'confirmed'
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour parrainage:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update referral' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('✅ Commission confirmée:', commissionAmount, '€');

    return new Response(
      JSON.stringify({ 
        success: true, 
        commission_amount: commissionAmount,
        referral_id: referral.id
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