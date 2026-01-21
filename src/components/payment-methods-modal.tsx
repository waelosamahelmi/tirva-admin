import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantSettings, useUpdateRestaurantSettings } from "@/hooks/use-restaurant-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  Trash2,
  Wallet,
  DollarSign,
  Euro,
  Bitcoin,
  Edit2,
  Check,
  X,
  AlertCircle,
  Save,
  Settings
} from "lucide-react";

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStripeSettings?: () => void;
}

export function PaymentMethodsModal({ isOpen, onClose, onOpenStripeSettings }: PaymentMethodsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Hooks for data management
  const { data: restaurantSettings, isLoading } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  
  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'cash', name: 'Cash', nameEn: 'Cash', nameFi: 'Käteinen', enabled: true, icon: 'banknote' },
    { id: 'card', name: 'Card', nameEn: 'Card', nameFi: 'Kortti', enabled: true, icon: 'credit-card' },
  ]);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ nameFi: '', nameEn: '', icon: 'credit-card' });
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<number | null>(null);
  
  // Stripe enabled status (read-only)
  const [stripeEnabled, setStripeEnabled] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && restaurantSettings) {
      // Load payment methods from database
      if (restaurantSettings.paymentMethods && Array.isArray(restaurantSettings.paymentMethods)) {
        setPaymentMethods(restaurantSettings.paymentMethods);
      }
      
      // Load Stripe enabled status
      setStripeEnabled(restaurantSettings.stripeEnabled ?? false);
    }
  }, [isOpen, restaurantSettings]);

  // Load settings from localStorage (legacy support)
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('restaurantSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          
          // Load payment methods if available
          if (settings.paymentMethods && Array.isArray(settings.paymentMethods)) {
            setPaymentMethods(settings.paymentMethods);
          }
          
          // Load Stripe enabled status
          setStripeEnabled(settings.stripeEnabled ?? false);
        } catch (error) {
          console.error('Error loading payment settings:', error);
        }
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      // Save payment settings to database
      await updateSettings.mutateAsync({
        paymentMethods: paymentMethods,
      });

      // Save to localStorage (legacy)
      const savedSettings = localStorage.getItem('restaurantSettings');
      const existingSettings = savedSettings ? JSON.parse(savedSettings) : {};
      
      localStorage.setItem('restaurantSettings', JSON.stringify({
        ...existingSettings,
        paymentMethods,
      }));

      toast({
        title: t("Maksutavat tallennettu", "Payment Methods Saved"),
        description: t("Muutokset on tallennettu onnistuneesti", "Changes saved successfully"),
      });

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('restaurantSettingsUpdated', {
        detail: {
          ...existingSettings,
          paymentMethods,
        }
      }));

      onClose();
    } catch (error) {
      console.error('Error saving payment settings:', error);
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
        <DialogContent className="max-w-2xl">
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>{t("Maksutavat", "Payment Methods")}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Methods Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>{t("Maksutavat", "Payment Methods")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("Käytössä olevat maksutavat", "Available Payment Methods")}</Label>
                <div className="space-y-2">
                  {paymentMethods.map((method, index) => {
                    const PaymentIcon = method.icon === 'banknote' ? Banknote :
                                       method.icon === 'credit-card' ? CreditCard :
                                       method.icon === 'wallet' ? Wallet :
                                       method.icon === 'smartphone' ? Smartphone :
                                       method.icon === 'dollar-sign' ? DollarSign :
                                       method.icon === 'euro' ? Euro :
                                       method.icon === 'bitcoin' ? Bitcoin : CreditCard;
                    
                    const isEditing = editingPaymentMethod === index;
                    
                    return (
                      <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {isEditing ? (
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input
                              placeholder={t("Nimi (Suomi)", "Name (Finnish)")}
                              value={method.nameFi}
                              onChange={(e) => {
                                const updated = [...paymentMethods];
                                updated[index].nameFi = e.target.value;
                                setPaymentMethods(updated);
                              }}
                            />
                            <Input
                              placeholder={t("Nimi (Englanti)", "Name (English)")}
                              value={method.nameEn}
                              onChange={(e) => {
                                const updated = [...paymentMethods];
                                updated[index].nameEn = e.target.value;
                                updated[index].name = e.target.value;
                                setPaymentMethods(updated);
                              }}
                            />
                            <Select 
                              value={method.icon || 'credit-card'}
                              onValueChange={(value) => {
                                const updated = [...paymentMethods];
                                updated[index].icon = value;
                                setPaymentMethods(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="banknote">💵 {t("Käteinen", "Cash")}</SelectItem>
                                <SelectItem value="credit-card">💳 {t("Kortti", "Card")}</SelectItem>
                                <SelectItem value="wallet">👛 {t("Lompakko", "Wallet")}</SelectItem>
                                <SelectItem value="smartphone">📱 {t("Puhelin", "Mobile")}</SelectItem>
                                <SelectItem value="dollar-sign">💲 Dollar</SelectItem>
                                <SelectItem value="euro">€ Euro</SelectItem>
                                <SelectItem value="bitcoin">₿ Bitcoin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <PaymentIcon className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{method.nameFi} / {method.nameEn}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPaymentMethod(null)}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPaymentMethod(null);
                                  // Reload from database to undo changes
                                  if (restaurantSettings?.paymentMethods && Array.isArray(restaurantSettings.paymentMethods)) {
                                    setPaymentMethods(restaurantSettings.paymentMethods);
                                  }
                                }}
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPaymentMethod(index)}
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </Button>
                              <Switch
                                checked={method.enabled}
                                onCheckedChange={(checked) => {
                                  const updated = [...paymentMethods];
                                  updated[index].enabled = checked;
                                  setPaymentMethods(updated);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Label>{t("Lisää uusi maksutapa", "Add New Payment Method")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder={t("Nimi (Suomi)", "Name (Finnish)")}
                    value={newPaymentMethod.nameFi}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, nameFi: e.target.value })}
                  />
                  <Input
                    placeholder={t("Nimi (Englanti)", "Name (English)")}
                    value={newPaymentMethod.nameEn}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, nameEn: e.target.value })}
                  />
                  <Select 
                    value={newPaymentMethod.icon}
                    onValueChange={(value) => setNewPaymentMethod({ ...newPaymentMethod, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banknote">💵 {t("Käteinen", "Cash")}</SelectItem>
                      <SelectItem value="credit-card">💳 {t("Kortti", "Card")}</SelectItem>
                      <SelectItem value="wallet">👛 {t("Lompakko", "Wallet")}</SelectItem>
                      <SelectItem value="smartphone">📱 {t("Puhelin", "Mobile")}</SelectItem>
                      <SelectItem value="dollar-sign">💲 Dollar</SelectItem>
                      <SelectItem value="euro">€ Euro</SelectItem>
                      <SelectItem value="bitcoin">₿ Bitcoin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (newPaymentMethod.nameFi && newPaymentMethod.nameEn) {
                      setPaymentMethods([
                        ...paymentMethods,
                        {
                          id: `custom_${Date.now()}`,
                          name: newPaymentMethod.nameEn,
                          nameFi: newPaymentMethod.nameFi,
                          nameEn: newPaymentMethod.nameEn,
                          icon: newPaymentMethod.icon,
                          enabled: true
                        }
                      ]);
                      setNewPaymentMethod({ nameFi: '', nameEn: '', icon: 'credit-card' });
                    }
                  }}
                  disabled={!newPaymentMethod.nameFi || !newPaymentMethod.nameEn}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("Lisää maksutapa", "Add Payment Method")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Integration Link */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span>{t("Stripe-integraatio", "Stripe Integration")}</span>
                </div>
                <Badge variant={stripeEnabled ? "default" : "secondary"}>
                  {stripeEnabled ? t("Käytössä", "Enabled") : t("Ei käytössä", "Disabled")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t(
                  "Hallinnoi Stripe-maksuja, verkkomaksutapoja ja API-asetuksia omassa Stripe-asetukset sivulla.",
                  "Manage Stripe payments, online payment methods and API settings in the dedicated Stripe Settings page."
                )}
              </p>
              <Button 
                onClick={() => {
                  onClose();
                  onOpenStripeSettings?.();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t("Avaa Stripe-asetukset", "Open Stripe Settings")}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel")}
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {t("Tallenna", "Save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



