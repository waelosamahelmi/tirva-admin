import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantSettings, useUpdateRestaurantSettings } from "@/hooks/use-restaurant-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard,
  AlertCircle,
  Save,
  CheckCircle,
  ExternalLink,
  Key,
  Info,
  Loader2,
  Link as LinkIcon
} from "lucide-react";

interface StripeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

export function StripeSettingsModal({ isOpen, onClose, onConfigured }: StripeSettingsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const { data: restaurantSettings, isLoading } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  
  // Stripe API keys state
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testMode, setTestMode] = useState(true);
  
  // Stripe Connect state
  const [connectAccountId, setConnectAccountId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'not_connected' | 'pending' | 'active'>('not_connected');
  
  // UI state
  const [showKeys, setShowKeys] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && restaurantSettings) {
      setPublishableKey(restaurantSettings.stripePublishableKey ?? '');
      setSecretKey(restaurantSettings.stripeSecretKey ?? '');
      setWebhookSecret(restaurantSettings.stripeWebhookSecret ?? '');
      setTestMode(restaurantSettings.stripeTestMode ?? true);
      setConnectAccountId(restaurantSettings.stripeConnectAccountId ?? '');
      
      // Determine connection status
      if (restaurantSettings.stripeConnectAccountId) {
        setIsConnected(true);
        setAccountStatus('active'); // In real implementation, fetch from Stripe API
      }
    }
  }, [isOpen, restaurantSettings]);

  const validateStripeKeys = async () => {
    setIsValidating(true);
    try {
      // Call backend to validate keys
      const response = await fetch('/api/stripe/validate-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishableKey,
          secretKey
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid Stripe keys');
      }

      toast({
        title: t("Avaimet validoitu", "Keys Validated"),
        description: t("Stripe-avaimet ovat kelvollisia", "Stripe keys are valid"),
      });

      return true;
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Virheelliset avaimet", "Invalid keys"),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    // Validate keys before saving
    if (publishableKey && secretKey) {
      const isValid = await validateStripeKeys();
      if (!isValid) return;
    }

    try {
      await updateSettings.mutateAsync({
        stripePublishableKey: publishableKey,
        stripeSecretKey: secretKey,
        stripeWebhookSecret: webhookSecret,
        stripeTestMode: testMode,
        stripeConnectAccountId: connectAccountId,
        stripeEnabled: !!(publishableKey && secretKey),
      });

      toast({
        title: t("Asetukset tallennettu", "Settings Saved"),
        description: t("Stripe-asetukset on päivitetty onnistuneesti", "Stripe settings have been updated successfully"),
      });

      onConfigured?.();
    } catch (error) {
      console.error('Error saving Stripe settings:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Asetusten tallentaminen epäonnistui", "Failed to save settings"),
        variant: "destructive",
      });
    }
  };

  const openStripeDashboard = () => {
    const url = testMode 
      ? 'https://dashboard.stripe.com/test/dashboard'
      : 'https://dashboard.stripe.com/dashboard';
    window.open(url, '_blank');
  };

  const openStripePaymentMethodsSettings = () => {
    const url = testMode
      ? 'https://dashboard.stripe.com/test/settings/payment_methods'
      : 'https://dashboard.stripe.com/settings/payment_methods';
    window.open(url, '_blank');
  };

  const openStripeApiKeys = () => {
    const url = testMode
      ? 'https://dashboard.stripe.com/test/apikeys'
      : 'https://dashboard.stripe.com/apikeys';
    window.open(url, '_blank');
  };

  const openStripeWebhooks = () => {
    const url = testMode
      ? 'https://dashboard.stripe.com/test/webhooks'
      : 'https://dashboard.stripe.com/webhooks';
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>{t("Stripe-asetukset", "Stripe Settings")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>{t("Stripe-asetukset", "Stripe Settings")}</span>
          </DialogTitle>
          <DialogDescription>
            {t(
              "Määritä Stripe-maksupalvelu verkkomaksujen vastaanottamiseen. Seuraa virallisia Stripe-ohjeita.",
              "Configure Stripe payment service to accept online payments. Follow official Stripe documentation."
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Test Mode Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("Testitila", "Test Mode")}</CardTitle>
                  <CardDescription>
                    {t("Käytä testi-avaimia kehitykseen, tuotanto-avaimia tuotantoon", "Use test keys for development, live keys for production")}
                  </CardDescription>
                </div>
                <Switch
                  checked={testMode}
                  onCheckedChange={setTestMode}
                />
              </div>
            </CardHeader>
          </Card>

          {testMode && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {t(
                  "Testitilassa. Käytä Stripen testikortteja (4242 4242 4242 4242). Vaihda tuotantotilaan ennen julkaisua.",
                  "Test mode active. Use Stripe test cards (4242 4242 4242 4242). Switch to live mode before going public."
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>{t("Vaihe 1: API-avaimet", "Step 1: API Keys")}</span>
              </CardTitle>
              <CardDescription>
                {t(
                  "Hae avaimesi Stripe-hallintapaneelista",
                  "Get your keys from the Stripe Dashboard"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={openStripeApiKeys}
                className="w-full justify-between"
              >
                <span>{t("Avaa Stripe API-avaimet", "Open Stripe API Keys")}</span>
                <ExternalLink className="w-4 h-4" />
              </Button>

              <div className="space-y-2">
                <Label htmlFor="publishableKey">
                  {t("Julkinen avain", "Publishable Key")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="publishableKey"
                  type={showKeys ? "text" : "password"}
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder={testMode ? "pk_test_..." : "pk_live_..."}
                />
                <p className="text-xs text-gray-500">
                  {t("Alkaa", "Starts with")} {testMode ? "pk_test_" : "pk_live_"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">
                  {t("Salainen avain", "Secret Key")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="secretKey"
                  type={showKeys ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={testMode ? "sk_test_..." : "sk_live_..."}
                />
                <p className="text-xs text-gray-500">
                  {t("Alkaa", "Starts with")} {testMode ? "sk_test_" : "sk_live_"}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showKeys"
                  checked={showKeys}
                  onCheckedChange={setShowKeys}
                />
                <Label htmlFor="showKeys" className="cursor-pointer">
                  {t("Näytä avaimet", "Show keys")}
                </Label>
              </div>

              {publishableKey && secretKey && (
                <Button
                  variant="outline"
                  onClick={validateStripeKeys}
                  disabled={isValidating}
                  className="w-full"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("Validoidaan...", "Validating...")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t("Validoi avaimet", "Validate Keys")}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Webhook Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />
                <span>{t("Vaihe 2: Webhook", "Step 2: Webhook")}</span>
              </CardTitle>
              <CardDescription>
                {t(
                  "Määritä webhook maksutapahtumien vastaanottamiseen",
                  "Configure webhook to receive payment events"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={openStripeWebhooks}
                className="w-full justify-between"
              >
                <span>{t("Avaa Stripe Webhooks", "Open Stripe Webhooks")}</span>
                <ExternalLink className="w-4 h-4" />
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <p className="font-medium mb-2">{t("Webhook URL:", "Webhook URL:")}</p>
                  <code className="bg-white px-2 py-1 rounded border">
                    {window.location.origin}/api/stripe/webhook
                  </code>
                  <p className="mt-2">
                    {t("Valitse tapahtumat:", "Select events:")} payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">
                  {t("Webhook-salainen avain", "Webhook Secret")}
                </Label>
                <Input
                  id="webhookSecret"
                  type={showKeys ? "text" : "password"}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                />
                <p className="text-xs text-gray-500">
                  {t("Alkaa whsec_", "Starts with whsec_")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>{t("Vaihe 3: Maksutavat", "Step 3: Payment Methods")}</span>
              </CardTitle>
              <CardDescription>
                {t(
                  "Määritä hyväksyttävät maksutavat Stripe-hallintapaneelista",
                  "Configure accepted payment methods in Stripe Dashboard"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={openStripePaymentMethodsSettings}
                className="w-full justify-between"
              >
                <span>{t("Avaa maksutapojen asetukset", "Open Payment Methods Settings")}</span>
                <ExternalLink className="w-4 h-4" />
              </Button>

              <Alert className="bg-purple-50 border-purple-200">
                <Info className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-purple-800 text-sm">
                  <p className="font-medium mb-2">
                    {t("Suositellut maksutavat Suomessa:", "Recommended payment methods in Finland:")}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Cards (Visa, Mastercard, Amex)</li>
                    <li>Apple Pay & Google Pay</li>
                    <li>Link (Stripe's 1-click checkout)</li>
                    <li>Klarna (osta nyt, maksa myöhemmin)</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    {t(
                      "Maksutavat aktivoidaan Stripe-hallintapaneelista ja näkyvät automaattisesti asiakkaille.",
                      "Payment methods are activated in Stripe Dashboard and appear automatically to customers."
                    )}
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Connection Status */}
          {publishableKey && secretKey && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">
                      {t("Stripe yhdistetty", "Stripe Connected")}
                    </p>
                    <p className="text-sm text-green-700">
                      {t(
                        "Verkkomaksut ovat valmiina käytettäväksi. Muista aktivoida maksutavat Stripe-hallintapaneelista.",
                        "Online payments are ready to use. Remember to activate payment methods in Stripe Dashboard."
                      )}
                    </p>
                    <Button
                      variant="link"
                      onClick={openStripeDashboard}
                      className="text-green-700 p-0 h-auto mt-2"
                    >
                      {t("Avaa Stripe-hallintapaneeli", "Open Stripe Dashboard")}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel")}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending || !publishableKey || !secretKey}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? t("Tallennetaan...", "Saving...") : t("Tallenna", "Save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



