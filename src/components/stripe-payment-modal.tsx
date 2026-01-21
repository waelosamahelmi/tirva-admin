import { useState, useEffect } from "react";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  orderMetadata?: Record<string, string>;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentFailed?: (error: string) => void;
}

let stripePromise: Promise<Stripe | null> | null = null;

// Payment Form Component (inside Elements provider)
function PaymentForm({ 
  amount, 
  currency,
  onSuccess, 
  onFailed,
  onCancel 
}: { 
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onFailed: (error: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
        },
        redirect: 'if_required', // Don't redirect, handle in-app
      });

      if (error) {
        // Payment failed
        const message = error.message || t("Maksu epäonnistui", "Payment failed");
        setErrorMessage(message);
        onFailed(message);
        
        toast({
          title: t("Maksu epäonnistui", "Payment Failed"),
          description: message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        onSuccess(paymentIntent.id);
        
        toast({
          title: t("Maksu onnistui", "Payment Successful"),
          description: t("Tilauksesi on vastaanotettu", "Your order has been received"),
        });
      } else {
        // Payment requires additional action or is processing
        setErrorMessage(t("Maksu käsittelyssä", "Payment processing"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Tuntematon virhe", "Unknown error");
      setErrorMessage(message);
      onFailed(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">{t("Maksettava summa", "Amount to pay")}:</span>
          <span className="text-2xl font-bold">
            {amount.toFixed(2)} {currency.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border rounded-lg p-4 bg-white">
        <PaymentElement 
          options={{
            layout: 'tabs',
            // Stripe will automatically show available payment methods based on:
            // 1. What you've enabled in Stripe Dashboard
            // 2. Customer's location
            // 3. Currency
            // 4. Amount
          }}
        />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          {t("Peruuta", "Cancel")}
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("Käsitellään...", "Processing...")}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {t("Maksa", "Pay")} {amount.toFixed(2)} {currency.toUpperCase()}
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-center text-gray-500">
        <div className="flex items-center justify-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>{t("Turvallinen maksu Stripe-palvelun kautta", "Secure payment powered by Stripe")}</span>
        </div>
      </div>
    </form>
  );
}

// Main Payment Modal Component
export function StripePaymentModal({
  isOpen,
  onClose,
  amount,
  currency = 'eur',
  orderMetadata = {},
  onPaymentSuccess,
  onPaymentFailed,
}: StripePaymentModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize Stripe
  useEffect(() => {
    if (isOpen && !stripePromise) {
      // Fetch publishable key and initialize Stripe
      fetch('/api/stripe/config')
        .then(res => res.json())
        .then(data => {
          if (data.publishableKey) {
            stripePromise = loadStripe(data.publishableKey);
          } else {
            setError(t("Stripe ei ole määritetty", "Stripe is not configured"));
          }
        })
        .catch(err => {
          console.error('Error fetching Stripe config:', err);
          setError(t("Stripen lataus epäonnistui", "Failed to load Stripe"));
        });
    }
  }, [isOpen, t]);

  // Create payment intent when modal opens
  useEffect(() => {
    if (isOpen && amount > 0) {
      createPaymentIntent();
    }
  }, [isOpen, amount]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          metadata: orderMetadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: t("Virhe", "Error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    onPaymentSuccess(paymentIntentId);
    onClose();
  };

  const handlePaymentFailed = (error: string) => {
    onPaymentFailed?.(error);
  };

  const handleCancel = () => {
    onClose();
  };

  // Stripe Elements options
  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#7c3aed',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>{t("Verkkomaksu", "Online Payment")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
              <p className="text-sm text-gray-600">
                {t("Ladataan maksukenttää...", "Loading payment form...")}
              </p>
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {clientSecret && stripePromise && !error && !isLoading && (
            <Elements stripe={stripePromise} options={stripeOptions}>
              <PaymentForm
                amount={amount}
                currency={currency}
                onSuccess={handlePaymentSuccess}
                onFailed={handlePaymentFailed}
                onCancel={handleCancel}
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



