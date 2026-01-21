import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, CreditCard } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";

interface StripeCheckoutElementProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  customerEmail?: string;
  customerName?: string;
  stripePublishableKey: string;
  stripePaymentMethodsConfig?: {
    card?: boolean;
    applePay?: boolean;
    googlePay?: boolean;
    link?: boolean;
    klarna?: boolean;
    ideal?: boolean;
    sepaDebit?: boolean;
  };
}

function CheckoutForm({ 
  amount, 
  onSuccess, 
  onCancel,
  stripePaymentMethodsConfig 
}: { 
  amount: number; 
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  stripePaymentMethodsConfig?: any;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/order-success",
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: t("Maksu epäonnistui", "Payment Failed"),
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: t("Maksu onnistui", "Payment Successful"),
          description: t("Tilauksesi on vahvistettu", "Your order has been confirmed"),
        });
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      toast({
        title: t("Virhe", "Error"),
        description: err.message || t("Maksun käsittelyssä tapahtui virhe", "An error occurred during payment processing"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-[400px] overflow-y-auto pr-2">
        <PaymentElement 
          options={{
            layout: {
              type: 'accordion',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: true
            },
            paymentMethodOrder: getPaymentMethodOrder(stripePaymentMethodsConfig),
          }}
        />
      </div>
      
      <div className="flex gap-3">
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
          disabled={!stripe || isProcessing}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("Käsitellään...", "Processing...")}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {t("Maksa", "Pay")} €{amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        <span>{t("Turvallinen maksu Stripen kautta", "Secure payment via Stripe")}</span>
      </div>
    </form>
  );
}

function getPaymentMethodOrder(config?: any): string[] {
  if (!config) return ["card"];
  
  const order: string[] = [];
  
  // Order payment methods based on what's enabled (optimized for Finland)
  if (config.card !== false) order.push("card");
  if (config.link) order.push("link");
  if (config.applePay) order.push("apple_pay");
  if (config.googlePay) order.push("google_pay");
  // MobilePay is popular in Finland
  order.push("mobilepay");
  if (config.klarna) order.push("klarna");
  if (config.ideal) order.push("ideal");
  if (config.sepaDebit) order.push("sepa_debit");
  
  return order.length > 0 ? order : ["card"];
}

export function StripeCheckoutElement({
  amount,
  onSuccess,
  onCancel,
  customerEmail,
  customerName,
  stripePublishableKey,
  stripePaymentMethodsConfig,
}: StripeCheckoutElementProps) {
  const { t } = useLanguage();
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (stripePublishableKey) {
      setStripePromise(loadStripe(stripePublishableKey));
    }
  }, [stripePublishableKey]);

  useEffect(() => {
    // Create PaymentIntent on the server
    const createPaymentIntent = async () => {
      try {
        // Optional: For testing specific payment methods, uncomment and modify:
        // const forcePaymentMethods = ['card', 'ideal', 'sepa_debit', 'klarna', 'paypal'];
        
        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount, // Send as decimal (EUR), server converts to cents
            currency: "eur",
            customerEmail,
            customerName,
            // forcePaymentMethods, // Uncomment to test specific methods
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create payment intent");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: t("Virhe", "Error"),
          description: t("Maksun alustus epäonnistui", "Failed to initialize payment"),
          variant: "destructive",
        });
        console.error("Error creating payment intent:", error);
      } finally {
        setLoading(false);
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount, customerEmail, customerName]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-600">
              {t("Ladataan maksulomaketta...", "Loading payment form...")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <CreditCard className="w-8 h-8 mx-auto text-red-600" />
            <p className="text-sm text-red-600">
              {t("Maksun alustus epäonnistui", "Failed to initialize payment")}
            </p>
            <Button onClick={onCancel} variant="outline">
              {t("Takaisin", "Go Back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {t("Maksu", "Payment")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#2563eb",
                colorBackground: "#ffffff",
                colorText: "#1f2937",
                colorDanger: "#ef4444",
                fontFamily: "system-ui, sans-serif",
                borderRadius: "8px",
              },
            },
          }}
        >
          <CheckoutForm 
            amount={amount} 
            onSuccess={onSuccess} 
            onCancel={onCancel}
            stripePaymentMethodsConfig={stripePaymentMethodsConfig}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}



