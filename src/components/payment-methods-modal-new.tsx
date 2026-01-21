import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantSettings, useUpdateRestaurantSettings } from "@/hooks/use-restaurant-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard,
  Banknote,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { StripeSettingsModal } from "@/components/stripe-settings-modal-new";

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentMethodsModal({ isOpen, onClose }: PaymentMethodsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const { data: restaurantSettings, isLoading } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  
  // Local state
  const [cashOrCardEnabled, setCashOrCardEnabled] = useState(true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [showStripeSettings, setShowStripeSettings] = useState(false);
  
  // Stripe connection status
  const [stripeConfigured, setStripeConfigured] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && restaurantSettings) {
      // Load payment methods from database
      if (restaurantSettings.paymentMethods && Array.isArray(restaurantSettings.paymentMethods)) {
        const methods = restaurantSettings.paymentMethods;
        const cashOrCard = methods.find(m => m.id === 'cash' || m.id === 'card' || m.id === 'cash_or_card');
        
        setCashOrCardEnabled(cashOrCard?.enabled ?? true);
      }
      
      // Load Stripe enabled status
      setOnlinePaymentEnabled(restaurantSettings.stripeEnabled ?? false);
      
      // Check if Stripe is properly configured
      const isConfigured = !!(
        restaurantSettings.stripePublishableKey && 
        restaurantSettings.stripeSecretKey
      );
      setStripeConfigured(isConfigured);
    }
  }, [isOpen, restaurantSettings]);

  const handleSave = async () => {
    try {
      // Build payment methods array
      const paymentMethods = [
        { 
          id: 'cash_or_card', 
          name: 'Cash or Card', 
          nameEn: 'Cash or Card', 
          nameFi: 'Käteinen tai kortti', 
          enabled: cashOrCardEnabled, 
          icon: 'banknote' 
        },
      ];

      // Only add online payment if enabled
      if (onlinePaymentEnabled) {
        paymentMethods.push({
          id: 'stripe',
          name: 'Online Payment',
          nameEn: 'Online Payment',
          nameFi: 'Verkkomaksu',
          enabled: true,
          icon: 'smartphone'
        });
      }

      // Save payment settings to database
      await updateSettings.mutateAsync({
        paymentMethods: paymentMethods,
        stripeEnabled: onlinePaymentEnabled,
      });

      toast({
        title: t("Asetukset tallennettu", "Settings Saved"),
        description: t("Maksutavat on päivitetty onnistuneesti", "Payment methods have been updated successfully"),
      });

      onClose();
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Asetusten tallentaminen epäonnistui", "Failed to save settings"),
        variant: "destructive",
      });
    }
  };

  const handleOnlinePaymentToggle = (enabled: boolean) => {
    if (enabled && !stripeConfigured) {
      // If trying to enable but not configured, show Stripe settings
      toast({
        title: t("Stripe ei määritetty", "Stripe Not Configured"),
        description: t("Määritä Stripe-asetukset ensin", "Please configure Stripe settings first"),
        variant: "destructive",
      });
      setShowStripeSettings(true);
      return;
    }
    setOnlinePaymentEnabled(enabled);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>{t("Maksutavat", "Payment Methods")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>{t("Maksutavat", "Payment Methods")}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Cash or Card Payment */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center -space-x-1">
                      <Banknote className="w-5 h-5 text-green-600 z-10" />
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t("Käteinen tai kortti", "Cash or Card")}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {t("Maksu käteisellä tai kortilla paikan päällä", "Cash or card payment at location")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={cashOrCardEnabled}
                    onCheckedChange={setCashOrCardEnabled}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Online Payment (Stripe) */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      {stripeConfigured && (
                        <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{t("Verkkomaksu", "Online Payment")}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {t("Stripe-maksupalvelu verkossa maksamiseen", "Stripe payment service for online payments")}
                      </p>
                      {stripeConfigured && (
                        <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t("Määritetty", "Configured")}
                        </Badge>
                      )}
                      {!stripeConfigured && (
                        <Badge variant="outline" className="mt-1 bg-orange-50 text-orange-700 border-orange-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {t("Vaatii määrityksen", "Requires Setup")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStripeSettings(true)}
                      className="flex items-center space-x-1"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t("Muokkaa", "Edit")}</span>
                    </Button>
                    <Switch
                      checked={onlinePaymentEnabled}
                      onCheckedChange={handleOnlinePaymentToggle}
                      disabled={!stripeConfigured && !onlinePaymentEnabled}
                    />
                  </div>
                </div>
              </CardHeader>
              {onlinePaymentEnabled && (
                <CardContent className="pt-0">
                  <div className="bg-white border border-purple-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-start space-x-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-900">
                          {t("Verkkomaksu käytössä", "Online Payment Active")}
                        </p>
                        <p className="text-gray-600">
                          {t(
                            "Asiakkaat voivat maksaa tilauksensa verkossa Stripe-palvelulla. Maksutavat määritetään Stripe-hallintapaneelista.",
                            "Customers can pay for their orders online using Stripe. Payment methods are configured in the Stripe Dashboard."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                {t("Peruuta", "Cancel")}
              </Button>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateSettings.isPending ? t("Tallennetaan...", "Saving...") : t("Tallenna", "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Settings Modal */}
      <StripeSettingsModal
        isOpen={showStripeSettings}
        onClose={() => setShowStripeSettings(false)}
        onConfigured={() => {
          setStripeConfigured(true);
          setShowStripeSettings(false);
        }}
      />
    </>
  );
}



