import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    console.log('🚀 === DÉBUT STRIPE CHECKOUT ===');
    console.log('🚀 Method:', req.method);
    console.log('🚀 URL:', req.url);
    
    if (req.method === 'OPTIONS') {
      console.log('🚀 OPTIONS request - returning CORS headers');
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      console.log('🚀 ❌ Method not allowed:', req.method);
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    console.log('🚀 📝 Parsing request body...');
    const { price_id, success_url, cancel_url, mode } = await req.json();
    console.log('🚀 📝 Request data:', { price_id, success_url, cancel_url, mode });

    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (error) {
      console.log('🚀 ❌ Validation error:', error);
      return corsResponse({ error }, 400);
    }

    console.log('🚀 🔐 Checking authorization header...');
    const authHeader = req.headers.get('Authorization');
    console.log('🚀 🔐 Auth header present:', !!authHeader);
    console.log('🚀 🔐 Auth header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    
    if (!authHeader) {
      console.log('🚀 ❌ No authorization header');
      return corsResponse({ error: 'Authorization header missing' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🚀 🔐 Token extracted:', token.substring(0, 20) + '...');
    
    console.log('🚀 👤 Getting user from token...');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    console.log('🚀 👤 User result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: getUserError?.message
    });

    if (getUserError) {
      console.error('🚀 ❌ Authentication error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      console.log('🚀 ❌ No user found');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('🚀 ✅ User authenticated successfully:', user.id, user.email);

    console.log('🚀 💳 Checking existing customer...');
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('🚀 ❌ Failed to fetch customer information:', getCustomerError);

      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    console.log('🚀 💳 Customer lookup result:', {
      hasCustomer: !!customer,
      customerId: customer?.customer_id
    });

    let customerId;

    /**
     * In case we don't have a mapping yet, the customer does not exist and we need to create one.
     */
    if (!customer || !customer.customer_id) {
      console.log('🚀 🆕 Creating new Stripe customer...');
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`🚀 ✅ Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      console.log('🚀 💾 Saving customer mapping to database...');
      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('🚀 ❌ Failed to save customer information:', createCustomerError);

        // Try to clean up both the Stripe customer and subscription record
        try {
          console.log('🚀 🧹 Cleaning up failed customer creation...');
          await stripe.customers.del(newCustomer.id);
          await supabase.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('🚀 ❌ Failed to clean up:', deleteError);
        }

        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      if (mode === 'subscription') {
        console.log('🚀 📋 Creating subscription record...');
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('🚀 ❌ Failed to save subscription:', createSubscriptionError);

          // Try to clean up the Stripe customer since we couldn't create the subscription
          try {
            console.log('🚀 🧹 Cleaning up failed subscription creation...');
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('🚀 ❌ Failed to delete customer after subscription error:', deleteError);
          }

          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
      }

      customerId = newCustomer.id;

      console.log(`🚀 ✅ Successfully set up new customer ${customerId} with subscription record`);
    } else {
      customerId = customer.customer_id;
      console.log('🚀 ✅ Using existing customer:', customerId);

      if (mode === 'subscription') {
        console.log('🚀 📋 Verifying subscription record for existing customer...');
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('🚀 ❌ Failed to fetch subscription information:', getSubscriptionError);

          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        console.log('🚀 📋 Subscription check result:', {
          hasSubscription: !!subscription,
          status: subscription?.status
        });

        if (!subscription) {
          console.log('🚀 📋 Creating missing subscription record...');
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('🚀 ❌ Failed to create subscription record:', createSubscriptionError);

            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
        }
      }
    }

    console.log('🚀 🛒 Creating Stripe checkout session...');
    console.log('🚀 🛒 Session parameters:', {
      customer: customerId,
      price_id,
      mode,
      success_url,
      cancel_url
    });
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
    });

    console.log(`🚀 ✅ Created checkout session ${session.id} for customer ${customerId}`);
    console.log('🚀 ✅ Session URL:', session.url);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`🚀 ❌ CHECKOUT ERROR: ${error.message}`);
    console.error('🚀 ❌ Full error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}