import express from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { restaurantSettings, orders } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Helper function to get Stripe instance with keys from database
async function getStripeInstance(): Promise<Stripe | null> {
  try {
    const settings = await db.select().from(restaurantSettings).limit(1);
    if (!settings[0]?.stripeSecretKey) {
      console.error('? Stripe secret key not found in database');
      return null;
    }
    return new Stripe(settings[0].stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  } catch (error) {
    console.error('? Error fetching Stripe settings from database:', error);
    return null;
  }
}

// Validate Stripe API keys
router.post('/validate-keys', express.json(), async (req, res) => {
  try {
    const { publishableKey, secretKey } = req.body;

    if (!publishableKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing keys',
        message: 'Both publishable and secret keys are required'
      });
    }

    // Validate key formats
    const pubKeyPrefix = publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_');
    const secKeyPrefix = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');

    if (!pubKeyPrefix || !secKeyPrefix) {
      return res.status(400).json({
        error: 'Invalid key format',
        message: 'Keys must start with pk_test_/pk_live_ or sk_test_/sk_live_'
      });
    }

    // Test the secret key by making an API call
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Try to retrieve account info
    const account = await stripe.accounts.retrieve();

    res.json({
      valid: true,
      testMode: secretKey.startsWith('sk_test_'),
      accountId: account.id,
      country: account.country,
    });
  } catch (error) {
    console.error('? Stripe key validation error:', error);
    res.status(400).json({
      error: 'Invalid keys',
      message: error instanceof Error ? error.message : 'Keys are not valid'
    });
  }
});

// Get Stripe publishable key (for frontend)
router.get('/config', async (req, res) => {
  try {
    const settings = await db.select().from(restaurantSettings).limit(1);
    
    if (!settings[0]?.stripePublishableKey) {
      return res.status(404).json({ 
        error: 'Stripe not configured',
        message: 'Please configure Stripe keys in restaurant settings'
      });
    }

    res.json({
      publishableKey: settings[0].stripePublishableKey,
      testMode: settings[0].stripeTestMode ?? true,
    });
  } catch (error) {
    console.error('? Error fetching Stripe config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Stripe configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    console.log('?? Create payment intent request:', { 
      amount: req.body.amount, 
      currency: req.body.currency,
      metadata: req.body.metadata 
    });

    const { amount, currency = 'eur', metadata = {}, forcePaymentMethods } = req.body;

    if (!amount || amount <= 0) {
      console.error('? Invalid amount:', amount);
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    console.log('?? Getting Stripe instance...');
    const stripe = await getStripeInstance();
    if (!stripe) {
      console.error('? Stripe instance is null - keys not configured');
      return res.status(500).json({ 
        error: 'Stripe not configured',
        message: 'Please configure Stripe keys in restaurant settings'
      });
    }

    console.log('? Stripe instance obtained successfully');

    // Create payment intent with automatic or manual payment methods
    // Stripe will show payment methods based on:
    // 1. What's enabled in Stripe Dashboard (Payment Methods settings)
    // 2. Customer's location (can be overridden with forcePaymentMethods)
    // 3. Currency and amount
    
    const paymentIntentOptions: any = {
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        integration: 'tirva_restaurant',
      },
    };

    // If forcePaymentMethods is provided (for testing), use specific methods
    // Otherwise use automatic payment methods
    if (forcePaymentMethods && Array.isArray(forcePaymentMethods)) {
      console.log('?? Testing mode: Forcing payment methods:', forcePaymentMethods);
      paymentIntentOptions.payment_method_types = forcePaymentMethods;
    } else {
      paymentIntentOptions.automatic_payment_methods = {
        enabled: true, // This enables all payment methods configured in Stripe Dashboard
      };
    }

    console.log('?? Creating payment intent with options:', JSON.stringify(paymentIntentOptions, null, 2));
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    console.log('? Payment intent created:', paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('? Error creating payment intent:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Retrieve payment intent status
router.get('/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).json({ 
        error: 'Stripe not configured',
        message: 'Please configure Stripe keys in restaurant settings'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    console.error('? Error retrieving payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment intent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Refund a payment (for cancelled orders)
router.post('/refund', express.json(), async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment intent ID required',
        message: 'Please provide a payment intent ID to refund'
      });
    }

    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).json({ 
        error: 'Stripe not configured',
        message: 'Please configure Stripe keys in restaurant settings'
      });
    }

    // Create refund
    // If amount is not specified, Stripe will refund the entire amount
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);

    console.log('? Refund created:', refund.id);

    res.json({
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
    });
  } catch (error) {
    console.error('? Error creating refund:', error);
    res.status(500).json({ 
      error: 'Failed to create refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('? No Stripe signature in webhook request');
    return res.status(400).send('No signature');
  }

  try {
    const settings = await db.select().from(restaurantSettings).limit(1);
    const webhookSecret = settings[0]?.stripeWebhookSecret;

    if (!webhookSecret) {
      console.error('? Webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).send('Stripe not configured');
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    console.log(`?? Webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('? PaymentIntent succeeded:', paymentIntent.id);
        
        // Update order status to paid
        if (paymentIntent.metadata.orderId) {
          try {
            await db.update(orders)
              .set({ 
                paymentStatus: 'paid',
                stripePaymentIntentId: paymentIntent.id,
              })
              .where(eq(orders.id, parseInt(paymentIntent.metadata.orderId)));
            
            console.log(`? Order ${paymentIntent.metadata.orderId} marked as paid`);
          } catch (error) {
            console.error('? Error updating order status:', error);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('? PaymentIntent failed:', paymentIntent.id);
        
        // Update order status to payment_failed
        if (paymentIntent.metadata.orderId) {
          try {
            await db.update(orders)
              .set({ 
                paymentStatus: 'failed',
                stripePaymentIntentId: paymentIntent.id,
              })
              .where(eq(orders.id, parseInt(paymentIntent.metadata.orderId)));
            
            console.log(`? Order ${paymentIntent.metadata.orderId} marked as payment failed`);
          } catch (error) {
            console.error('? Error updating order status:', error);
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('?? Charge refunded:', charge.id);
        
        // Update order status to refunded
        if (charge.metadata.orderId) {
          try {
            await db.update(orders)
              .set({ 
                paymentStatus: 'refunded',
                status: 'cancelled',
              })
              .where(eq(orders.id, parseInt(charge.metadata.orderId)));
            
            console.log(`?? Order ${charge.metadata.orderId} marked as refunded`);
          } catch (error) {
            console.error('? Error updating order status:', error);
          }
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log('?? Dispute created:', dispute.id);
        // TODO: Notify admin about dispute
        break;
      }

      default:
        console.log(`?? Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('? Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Create a refund for a payment intent
router.post('/refund', express.json(), async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    console.log('?? Refund request:', { paymentIntentId, amount, reason });

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Missing payment intent ID',
        message: 'Payment intent ID is required for refund'
      });
    }

    // Get Stripe instance
    console.log('?? Getting Stripe instance for refund...');
    const stripe = await getStripeInstance();
    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe not configured',
        message: 'Stripe is not properly configured'
      });
    }
    console.log('? Stripe instance obtained for refund');

    // Create refund
    console.log('?? Creating refund with options:', JSON.stringify({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents if amount specified
      reason
    }));

    const refundOptions: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason
    };

    // Only add amount if specified (otherwise refund full amount)
    if (amount) {
      refundOptions.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundOptions);

    console.log('? Refund created successfully:', refund.id, 'Status:', refund.status);

    res.json({
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100, // Convert back to euros
      currency: refund.currency
    });
  } catch (error) {
    console.error('? Error creating refund:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorType = (error as any)?.type || 'unknown';
    
    console.error('Error type:', errorType);
    console.error('Error message:', errorMessage);
    if ((error as any)?.raw) {
      console.error('Full error details:', JSON.stringify((error as any).raw, null, 2));
    }

    res.status(500).json({
      error: 'Refund failed',
      message: errorMessage,
      type: errorType
    });
  }
});

export default router;
