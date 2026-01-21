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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard,
  AlertCircle,
  Save,
  Check,
  X,
  ExternalLink,
  Smartphone,
  Wallet,
  Zap,
  RefreshCw,
  Settings,
  Key,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";

interface StripeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StripeSettingsModal({ isOpen, onClose }: StripeSettingsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Hooks for data management
  const { data: restaurantSettings, isLoading } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  
  // Stripe settings state
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripeTestMode, setStripeTestMode] = useState(true);
  const [stripeConnectAccountId, setStripeConnectAccountId] = useState('');
  
  // Stripe Connect state
  const [isConnected, setIsConnected] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountCountry, setAccountCountry] = useState('');
  
  // Payment methods configuration
  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState({
    card: true,
    applePay: false,
    googlePay: false,
    link: false,
    klarna: false,
    afterpay: false,
    ideal: false,
    sepaDebit: false,
  });

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && restaurantSettings) {
      setStripeEnabled(restaurantSettings.stripeEnabled ?? false);
      setStripePublishableKey(restaurantSettings.stripePublishableKey ?? '');
      setStripeSecretKey(restaurantSettings.stripeSecretKey ?? '');
      setStripeWebhookSecret(restaurantSettings.stripeWebhookSecret ?? '');
      setStripeTestMode(restaurantSettings.stripeTestMode ?? true);
      setStripeConnectAccountId(restaurantSettings.stripeConnectAccountId ?? '');
      
      // Load payment methods config
      if (restaurantSettings.stripePaymentMethodsConfig) {
        try {
          const config = typeof restaurantSettings.stripePaymentMethodsConfig === 'string' 
            ? JSON.parse(restaurantSettings.stripePaymentMethodsConfig)
            : restaurantSettings.stripePaymentMethodsConfig;
          setPaymentMethodsConfig({ ...paymentMethodsConfig, ...config });
        } catch (error) {
          console.error('Error parsing payment methods config:', error);
        }
      }
      
      // Check if connected
      if (restaurantSettings.stripeConnectAccountId) {
        setIsConnected(true);
        // In a real implementation, you'd fetch account details from Stripe
        setAccountEmail(restaurantSettings.stripeAccountEmail ?? '');
        setAccountCountry(restaurantSettings.stripeAccountCountry ?? 'FI');
      }
    }
  }, [isOpen, restaurantSettings]);

  const handleConnectStripe = () => {
    // Generate Stripe Connect OAuth URL
    const clientId = process.env.VITE_STRIPE_CONNECT_CLIENT_ID || 'ca_xxx'; // Replace with your Stripe Connect client ID
    const redirectUri = encodeURIComponent(window.location.origin + '/admin/stripe-callback');
    const state = Math.random().toString(36).substring(7); // CSRF protection
    
    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${state}`;
    
    // Save state for verification
    localStorage.setItem('stripe_oauth_state', state);
    
    // Open Stripe Connect in new window
    window.open(stripeConnectUrl, '_blank');
    
    toast({
      title: t("Yhdistä Stripe-tili", "Connect Stripe Account"),
      description: t("Seuraa Stripen ohjeita yhdistääksesi tilisi", "Follow the instructions to connect your Stripe account"),
    });
  };

  const handleDisconnectStripe = async () => {
    try {
      await updateSettings.mutateAsync({
        stripeConnectAccountId: null,
        stripeAccountEmail: null,
        stripeAccountCountry: null,
      });
      
      setIsConnected(false);
      setStripeConnectAccountId('');
      setAccountEmail('');
      setAccountCountry('');
      
      toast({
        title: t("Yhteys katkaistu", "Disconnected"),
        description: t("Stripe-tilin yhteys on katkaistu", "Stripe account has been disconnected"),
      });
    } catch (error) {
      console.error('Error disconnecting Stripe:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Yhteyden katkaiseminen epäonnistui", "Failed to disconnect"),
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields if enabled
      if (stripeEnabled && !isConnected) {
        if (!stripePublishableKey || !stripeSecretKey) {
          toast({
            title: t("Puuttuvia tietoja", "Missing Information"),
            description: t("Syötä Stripe API-avaimet", "Please enter Stripe API keys"),
            variant: "destructive",
          });
          return;
        }
      }

      // Create payment method entries for enabled Stripe payment methods
      const existingPaymentMethods = restaurantSettings?.paymentMethods || [
        { id: 'cash', nameFi: 'Käteinen', nameEn: 'Cash', enabled: true, icon: 'banknote' },
        { id: 'card', nameFi: 'Kortti', nameEn: 'Card', enabled: true, icon: 'credit-card' },
      ];

      // Add Stripe payment methods if they're enabled
      const stripePaymentMethods = [];
      
      if (stripeEnabled && paymentMethodsConfig.applePay) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'apple_pay')) {
          stripePaymentMethods.push({
            id: 'apple_pay',
            nameFi: 'Apple Pay',
            nameEn: 'Apple Pay',
            enabled: true,
            icon: 'smartphone',
            requiresStripe: true
          });
        }
      }
      
      if (stripeEnabled && paymentMethodsConfig.googlePay) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'google_pay')) {
          stripePaymentMethods.push({
            id: 'google_pay',
            nameFi: 'Google Pay',
            nameEn: 'Google Pay',
            enabled: true,
            icon: 'wallet',
            requiresStripe: true
          });
        }
      }
      
      if (stripeEnabled && paymentMethodsConfig.link) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'stripe_link')) {
          stripePaymentMethods.push({
            id: 'stripe_link',
            nameFi: 'Link',
            nameEn: 'Link',
            enabled: true,
            icon: 'credit-card',
            requiresStripe: true
          });
        }
      }
      
      if (stripeEnabled && paymentMethodsConfig.klarna) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'klarna')) {
          stripePaymentMethods.push({
            id: 'klarna',
            nameFi: 'Klarna',
            nameEn: 'Klarna',
            enabled: true,
            icon: 'credit-card',
            requiresStripe: true
          });
        }
      }
      
      if (stripeEnabled && paymentMethodsConfig.ideal) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'ideal')) {
          stripePaymentMethods.push({
            id: 'ideal',
            nameFi: 'iDEAL',
            nameEn: 'iDEAL',
            enabled: true,
            icon: 'credit-card',
            requiresStripe: true
          });
        }
      }
      
      if (stripeEnabled && paymentMethodsConfig.sepaDebit) {
        if (!existingPaymentMethods.find((m: any) => m.id === 'sepa_debit')) {
          stripePaymentMethods.push({
            id: 'sepa_debit',
            nameFi: 'SEPA-veloitus',
            nameEn: 'SEPA Debit',
            enabled: true,
            icon: 'credit-card',
            requiresStripe: true
          });
        }
      }

      // Merge existing payment methods with new Stripe ones
      const updatedPaymentMethods = [...existingPaymentMethods, ...stripePaymentMethods];

      // Save Stripe settings to database
      await updateSettings.mutateAsync({
        stripeEnabled: stripeEnabled,
        stripePublishableKey: stripePublishableKey,
        stripeSecretKey: stripeSecretKey,
        stripeWebhookSecret: stripeWebhookSecret,
        stripeTestMode: stripeTestMode,
        stripeConnectAccountId: stripeConnectAccountId,
        stripeAccountEmail: accountEmail,
        stripeAccountCountry: accountCountry,
        stripePaymentMethodsConfig: JSON.stringify(paymentMethodsConfig),
        paymentMethods: updatedPaymentMethods,
      });

      // Save to localStorage (legacy)
      const savedSettings = localStorage.getItem('restaurantSettings');
      const existingSettings = savedSettings ? JSON.parse(savedSettings) : {};
      
      localStorage.setItem('restaurantSettings', JSON.stringify({
        ...existingSettings,
        stripeEnabled,
        stripePublishableKey,
        stripeSecretKey,
        stripeWebhookSecret,
        stripeTestMode,
        stripeConnectAccountId,
        stripePaymentMethodsConfig: JSON.stringify(paymentMethodsConfig),
      }));

      toast({
        title: t("Asetukset tallennettu", "Settings Saved"),
        description: t("Stripe-asetukset on tallennettu onnistuneesti", "Stripe settings saved successfully"),
      });

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('stripeSettingsUpdated', {
        detail: {
          stripeEnabled,
          stripeTestMode,
          paymentMethodsConfig,
        }
      }));

      onClose();
    } catch (error) {
      console.error('Error saving Stripe settings:', error);
      toast({
        title: t("Virhe tallennuksessa", "Error Saving"),
        description: t("Asetusten tallennus epäonnistui", "Failed to save settings"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <span>{t("Stripe-integraatio", "Stripe Integration")}</span>
          </DialogTitle>
          <DialogDescription>
            {t(
              "Hallitse Stripe-maksuja ja asetuita",
              "Manage Stripe payments and settings"
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">
              <LinkIcon className="w-4 h-4 mr-2" />
              {t("Yhteys", "Connection")}
            </TabsTrigger>
            <TabsTrigger value="payment-methods">
              <CreditCard className="w-4 h-4 mr-2" />
              {t("Maksutavat", "Payment Methods")}
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="w-4 h-4 mr-2" />
              {t("API-avaimet", "API Keys")}
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Zap className="w-4 h-4 mr-2" />
              {t("Webhookit", "Webhooks")}
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("Stripe-tili", "Stripe Account")}</span>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> {t("Yhdistetty", "Connected")}</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> {t("Ei yhdistetty", "Not Connected")}</>
                    )}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t(
                    "Yhdistä Stripe-tilisi ottaaksesi vastaan verkkomaksuja",
                    "Connect your Stripe account to accept online payments"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {t("Helppo yhdistäminen", "Easy Connection")}
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {t(
                              "Klikkaa alla olevaa nappia yhdistääksesi Stripe-tilisi. Sinun ei tarvitse olla kehittäjä - Stripe ohjaa sinua askel askeleelta.",
                              "Click the button below to connect your Stripe account. You don't need to be a developer - Stripe will guide you step by step."
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            {t("Huomio: Stripe Connect -sovellus vaaditaan", "Note: Stripe Connect Application Required")}
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {t(
                              "OAuth-yhteys ei toimi ilman Stripe Connect -sovellusta. Suosittelemme käyttämään 'API-avaimet' -välilehteä sen sijaan.",
                              "OAuth connection won't work without a Stripe Connect application. We recommend using the 'API Keys' tab instead."
                            )}
                          </p>
                          <a 
                            href="https://dashboard.stripe.com/test/apikeys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:underline text-sm font-medium"
                          >
                            {t("Hae API-avaimesi täältä", "Get your API keys here")}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleConnectStripe}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("Yhdistä Stripeen", "Connect with Stripe")}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {t("tai", "or")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {t("Käytä API-avaimia (edistynyt)", "Use API Keys (Advanced)")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Jos sinulla on jo Stripe-tili ja API-avaimet, voit syöttää ne API-avaimet-välilehdellä.",
                          "If you already have a Stripe account and API keys, you can enter them in the API Keys tab."
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900 dark:text-green-100">
                          {t("Tilisi on yhdistetty Stripeen", "Your account is connected to Stripe")}
                        </span>
                      </div>
                      {accountEmail && (
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <strong>{t("Sähköposti:", "Email:")}</strong> {accountEmail}
                        </div>
                      )}
                      {accountCountry && (
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <strong>{t("Maa:", "Country:")}</strong> {accountCountry}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline"
                        onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t("Avaa Stripe Dashboard", "Open Stripe Dashboard")}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleDisconnectStripe}
                        className="flex-1 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t("Katkaise yhteys", "Disconnect")}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">{t("Ota Stripe käyttöön", "Enable Stripe Payments")}</Label>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t("Ota verkkomaksut käyttöön sivustollasi", "Enable online payments on your site")}
                      </div>
                    </div>
                    <Switch 
                      checked={stripeEnabled} 
                      onCheckedChange={setStripeEnabled}
                      disabled={!isConnected && (!stripePublishableKey || !stripeSecretKey)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm">{t("Testitila", "Test Mode")}</Label>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("Käytä Stripen testitilaa", "Use Stripe test mode")}
                    </div>
                  </div>
                  <Switch 
                    checked={stripeTestMode} 
                    onCheckedChange={setStripeTestMode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("Maksutavat", "Payment Methods")}</CardTitle>
                <CardDescription>
                  {t(
                    "Valitse mitkä maksutavat asiakkaat voivat käyttää",
                    "Choose which payment methods customers can use"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{t("Kortit", "Cards")}</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.card}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, card: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-gray-900" />
                      <div>
                        <p className="font-medium">Apple Pay</p>
                        <p className="text-xs text-muted-foreground">{t("iPhonessa ja Macissa", "On iPhone and Mac")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.applePay}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, applePay: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Google Pay</p>
                        <p className="text-xs text-muted-foreground">{t("Android-laitteissa", "On Android devices")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.googlePay}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, googlePay: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Link by Stripe</p>
                        <p className="text-xs text-muted-foreground">{t("Nopea yhden klikkauksen maksu", "Fast one-click checkout")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.link}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, link: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-pink-600" />
                      <div>
                        <p className="font-medium">Klarna</p>
                        <p className="text-xs text-muted-foreground">{t("Osta nyt, maksa myöhemmin", "Buy now, pay later")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.klarna}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, klarna: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="font-medium">iDEAL</p>
                        <p className="text-xs text-muted-foreground">{t("Hollannin suosituin maksutapa", "Popular in Netherlands")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.ideal}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, ideal: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-blue-800" />
                      <div>
                        <p className="font-medium">SEPA Debit</p>
                        <p className="text-xs text-muted-foreground">{t("Euroopan pankkisiirto", "European bank transfer")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={paymentMethodsConfig.sepaDebit}
                      onCheckedChange={(checked) => 
                        setPaymentMethodsConfig({ ...paymentMethodsConfig, sepaDebit: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("API-avaimet", "API Keys")}</CardTitle>
                <CardDescription>
                  {t(
                    "Syötä Stripe API-avaimesi. Löydät ne Stripe Dashboardista.",
                    "Enter your Stripe API keys. You can find them in the Stripe Dashboard."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {t(
                    "Varmista, että käytät tuotannon avaimia (live keys) tuotannossa. Testausavaimia (test keys) voi käyttää testausvaiheessa.",
                    "Make sure to use production keys (live keys) in production. Test keys can be used during testing."
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("Julkinen avain (Publishable Key)", "Publishable Key")}</Label>
                  <Input
                    type="text"
                    placeholder={stripeTestMode ? "pk_test_..." : "pk_live_..."}
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Tämä avain näkyy asiakkaille", "This key is visible to customers")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("Salainen avain (Secret Key)", "Secret Key")}</Label>
                  <Input
                    type="password"
                    placeholder={stripeTestMode ? "sk_test_..." : "sk_live_..."}
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Tämä avain on luottamuksellinen", "This key is confidential")}
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://dashboard.stripe.com/apikeys', '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("Hae avaimet Stripesta", "Get Keys from Stripe")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("Webhookit", "Webhooks")}</CardTitle>
                <CardDescription>
                  {t(
                    "Aseta webhook vastaanottamaan ilmoituksia maksutapahtumista",
                    "Set up webhooks to receive notifications about payment events"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("Webhook URL", "Webhook URL")}</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={`${window.location.origin}/api/stripe/webhook`}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/stripe/webhook`);
                        toast({
                          title: t("Kopioitu", "Copied"),
                          description: t("URL kopioitu leikepöydälle", "URL copied to clipboard"),
                        });
                      }}
                    >
                      {t("Kopioi", "Copy")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("Käytä tätä URLia Stripe webhookin asetuksissa", "Use this URL in your Stripe webhook settings")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("Webhook-salainen avain (Webhook Secret)", "Webhook Secret")}</Label>
                  <Input
                    type="password"
                    placeholder="whsec_..."
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Saat tämän avaimen kun luot webhookin Stripessä", "You'll receive this key when creating a webhook in Stripe")}
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t("Suositellut tapahtumat:", "Recommended Events:")}
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>payment_intent.succeeded</li>
                    <li>payment_intent.payment_failed</li>
                    <li>charge.refunded</li>
                    <li>checkout.session.completed</li>
                  </ul>
                </div>

                <Button 
                  variant="outline"
                  onClick={() => window.open('https://dashboard.stripe.com/webhooks', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t("Hallinnoi webhookeja Stripessä", "Manage Webhooks in Stripe")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("Peruuta", "Cancel")}
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {t("Tallenna", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



