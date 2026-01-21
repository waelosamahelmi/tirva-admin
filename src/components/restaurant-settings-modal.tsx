import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantSettings, useUpdateRestaurantSettings } from "@/hooks/use-restaurant-settings";
import { useRestaurantConfig, useUpdateRestaurantConfig } from "@/hooks/use-restaurant-config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Store, 
  Truck, 
  UtensilsCrossed,
  AlertCircle,
  Save,
  Power,
  Coffee,
  CheckCircle,
  Timer,
  Settings,
  CreditCard,
  Euro,
  Percent
} from "lucide-react";

interface RestaurantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RestaurantSettingsModal({ isOpen, onClose }: RestaurantSettingsModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Hooks for data management
  const { data: restaurantSettings, isLoading: settingsLoading } = useRestaurantSettings();
  const { data: restaurantConfig, isLoading: configLoading } = useRestaurantConfig();
  const updateSettings = useUpdateRestaurantSettings();
  const updateConfig = useUpdateRestaurantConfig();
  
  // Local state
  const [isForceOpen, setIsForceOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [specialMessage, setSpecialMessage] = useState("");
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [autoAcceptDeliveryTime, setAutoAcceptDeliveryTime] = useState("30");
  const [autoAcceptPickupTime, setAutoAcceptPickupTime] = useState("15");
  const [minimumOrderDelivery, setMinimumOrderDelivery] = useState("15.00");
  const [serviceFee, setServiceFee] = useState("0.00");
  const [serviceFeeType, setServiceFeeType] = useState<"fixed" | "percentage">("fixed");

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && restaurantSettings) {
      setIsForceOpen(restaurantSettings.isOpen ?? false);
      setIsBusy(restaurantSettings.isBusy ?? false);
      setSpecialMessage(restaurantSettings.specialMessage ?? "");
      setServiceFee((restaurantSettings.onlinePaymentServiceFee ?? "0.00").toString());
      setServiceFeeType((restaurantSettings.onlinePaymentServiceFeeType ?? "fixed") as "fixed" | "percentage");
    }
  }, [isOpen, restaurantSettings]);

  // Load minimum order from restaurant config
  useEffect(() => {
    if (isOpen && restaurantConfig?.deliveryConfig) {
      const minOrder = restaurantConfig.deliveryConfig.minimumOrderDelivery;
      if (minOrder !== undefined && minOrder !== null) {
        setMinimumOrderDelivery(minOrder.toString());
      }
    }
  }, [isOpen, restaurantConfig]);

  // Load auto-accept settings from localStorage (legacy support)
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('restaurantSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setAutoAcceptEnabled(settings.autoAcceptEnabled ?? false);
          setAutoAcceptDeliveryTime(settings.autoAcceptDeliveryTime?.toString() ?? "30");
          setAutoAcceptPickupTime(settings.autoAcceptPickupTime?.toString() ?? "15");
        } catch (error) {
          console.error('Error loading auto-accept settings:', error);
        }
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      // Save restaurant settings to database
      await updateSettings.mutateAsync({
        isOpen: isForceOpen,
        isBusy: isBusy,
        specialMessage: specialMessage,
        openingHours: "Managed via Site Configuration",
        pickupHours: "Managed via Site Configuration", 
        deliveryHours: "Managed via Site Configuration",
        lunchBuffetHours: "Managed via Site Configuration",
        onlinePaymentServiceFee: parseFloat(serviceFee) || 0.00,
        onlinePaymentServiceFeeType: serviceFeeType,
      });

      // Save minimum order to restaurant config if it exists
      if (restaurantConfig?.id) {
        const updatedDeliveryConfig = {
          ...(restaurantConfig.deliveryConfig || {}),
          minimumOrderDelivery: parseFloat(minimumOrderDelivery) || 15.00,
        };

        await updateConfig.mutateAsync({
          id: restaurantConfig.id,
          deliveryConfig: updatedDeliveryConfig,
        });
      }

      // Save auto-accept settings to localStorage (legacy)
      const autoAcceptSettings = {
        autoAcceptEnabled,
        autoAcceptDeliveryTime: parseInt(autoAcceptDeliveryTime),
        autoAcceptPickupTime: parseInt(autoAcceptPickupTime),
      };
      localStorage.setItem('restaurantSettings', JSON.stringify({
        ...autoAcceptSettings,
        isOpen: isForceOpen,
        specialMessage: specialMessage,
      }));

      toast({
        title: t("Asetukset tallennettu", "Settings Saved"),
        description: t("pizzerian asetukset on päivitetty onnistuneesti", "Restaurant settings have been updated successfully"),
      });

      onClose();
    } catch (error) {
      console.error('Error saving restaurant settings:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Asetusten tallentaminen epäonnistui", "Failed to save settings"),
        variant: "destructive",
      });
    }
  };

  // Determine current status based on force open and hours
  const getCurrentStatus = () => {
    if (isForceOpen) return "open";
    
    // If we have config hours, check them
    if (restaurantConfig?.hours?.general) {
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      const dayHours = restaurantConfig.hours.general[currentDay];
      if (dayHours && !dayHours.closed) {
        if (currentTime >= dayHours.open && currentTime <= dayHours.close) {
          return "open";
        }
      }
    }
    
    return "closed";
  };

  const status = getCurrentStatus();

  if (settingsLoading || configLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>{t("pizzerian tiedot", "Restaurant Info")}</span>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>{t("pizzerian asetukset", "Restaurant Settings")}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Restaurant Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Power className="w-5 h-5" />
                <span>{t("pizzerian tila", "Restaurant Status")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Status Badge */}
                <div className="flex items-center justify-center pb-4">
                  <Badge 
                    variant={status === "open" ? "default" : "secondary"}
                    className={`text-lg px-6 py-2 ${status === "open" ? "bg-green-500" : "bg-red-500"}`}
                  >
                    {status === "open" ? t("AVOINNA", "OPEN") : t("SULJETTU", "CLOSED")}
                  </Badge>
                </div>

                <Separator />

                {/* Force Open */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <Label className="font-semibold">{t("Pakota auki", "Force Open")}</Label>
                    <span className="text-xs text-gray-500 mt-1">
                      {t("Ohittaa aukioloajat ja pitää pizzerian auki", "Override hours and keep restaurant open")}
                    </span>
                  </div>
                  <Switch
                    checked={isForceOpen}
                    onCheckedChange={setIsForceOpen}
                  />
                </div>

                {/* Busy Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <Label className="font-semibold">{t("Kiireinen", "Busy")}</Label>
                    <span className="text-xs text-gray-500 mt-1">
                      {t("Näyttää asiakkaille että pizzeria on kiireinen", "Shows customers that restaurant is busy")}
                    </span>
                  </div>
                  <Switch
                    checked={isBusy}
                    onCheckedChange={setIsBusy}
                  />
                </div>

                {/* Auto Accept */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <Label className="font-semibold">{t("Automaattinen hyväksyntä", "Automatic Acceptance")}</Label>
                    <span className="text-xs text-gray-500 mt-1">
                      {t("Hyväksyy tilaukset automaattisesti", "Accepts orders automatically")}
                    </span>
                  </div>
                  <Switch
                    checked={autoAcceptEnabled}
                    onCheckedChange={setAutoAcceptEnabled}
                  />
                </div>

                {/* Status Messages */}
                {isForceOpen && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded border border-orange-200">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {t("pizzeria on pakotettu auki aukioloajoista riippumatta", "Restaurant is forced open regardless of scheduled hours")}
                  </div>
                )}
                {isBusy && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {t("pizzeria näkyy kiireisenä asiakkaille", "Restaurant appears busy to customers")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hours Management Note */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900">{t("Aukioloaikojen hallinta", "Hours Management")}</h4>
                  <p className="text-sm text-blue-700">
                    {t(
                      "Aukioloajat määritellään nyt 'Sivuston asetukset' -osiossa. Siellä voit asettaa erilliset ajat yleisille aukioloajoille, noudolle ja toimitukselle.",
                      "Opening hours are now managed in the 'Site Configuration' section. There you can set separate hours for general, pickup, and delivery services."
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>{t("Erityisviesti", "Special Message")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={specialMessage}
                onChange={(e) => setSpecialMessage(e.target.value)}
                placeholder={t("Kirjoita erityisviesti asiakkaille...", "Write a special message for customers...")}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Auto-Accept Settings */}
          {autoAcceptEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="w-5 h-5" />
                  <span>{t("Automaattisen hyväksynnän ajat", "Auto-Accept Times")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Truck className="w-4 h-4" />
                      <span>{t("Kotiinkuljetus (min)", "Delivery Time (min)")}</span>
                    </Label>
                    <Select value={autoAcceptDeliveryTime} onValueChange={setAutoAcceptDeliveryTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="20">20 min</SelectItem>
                        <SelectItem value="25">25 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="35">35 min</SelectItem>
                        <SelectItem value="40">40 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="50">50 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{t("Nouto (min)", "Pickup Time (min)")}</span>
                    </Label>
                    <Select value={autoAcceptPickupTime} onValueChange={setAutoAcceptPickupTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="20">20 min</SelectItem>
                        <SelectItem value="25">25 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="35">35 min</SelectItem>
                        <SelectItem value="40">40 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Minimum Order Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Euro className="w-5 h-5" />
                <span>{t("Minimitilaus", "Minimum Order")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Truck className="w-4 h-4" />
                  <span>{t("Kotiinkuljetuksen minimitilaus (€)", "Delivery Minimum Order (€)")}</span>
                </Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={minimumOrderDelivery}
                  onChange={(e) => setMinimumOrderDelivery(e.target.value)}
                  placeholder="15.00"
                />
                <p className="text-xs text-gray-500">
                  {t(
                    "Asiakkaiden täytyy tilata vähintään tämän summan verran kotiinkuljetuksessa. Noudossa ei ole minimitilausta.",
                    "Customers must order at least this amount for delivery. There is no minimum for pickup orders."
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Online Payment Service Fee */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>{t("Verkkomaksu palvelumaksu", "Online Payment Service Fee")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("Maksun tyyppi", "Fee Type")}</Label>
                <Select value={serviceFeeType} onValueChange={(value) => setServiceFeeType(value as "fixed" | "percentage")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4" />
                        <span>{t("Kiinteä summa (€)", "Fixed Amount (€)")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="percentage">
                      <div className="flex items-center space-x-2">
                        <Percent className="w-4 h-4" />
                        <span>{t("Prosentti (%)", "Percentage (%)")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  {serviceFeeType === "fixed" 
                    ? t("Palvelumaksu (€)", "Service Fee (€)")
                    : t("Palvelumaksu (%)", "Service Fee (%)")
                  }
                </Label>
                <Input
                  type="number"
                  step={serviceFeeType === "fixed" ? "0.50" : "0.1"}
                  min="0"
                  max={serviceFeeType === "percentage" ? "100" : undefined}
                  value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)}
                  placeholder={serviceFeeType === "fixed" ? "2.00" : "2.5"}
                />
                <p className="text-xs text-gray-500">
                  {serviceFeeType === "fixed" 
                    ? t(
                        "Kiinteä palvelumaksu, joka lisätään verkkomaksuihin (esim. 2,00 € per tilaus).",
                        "Fixed service fee added to online payments (e.g., €2.00 per order)."
                      )
                    : t(
                        "Prosentuaalinen palvelumaksu, joka lasketaan tilauksen summasta (esim. 2,5%).",
                        "Percentage-based service fee calculated from order total (e.g., 2.5%)."
                      )
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? t("Tallennetaan...", "Saving...") : t("Tallenna asetukset", "Save Settings")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


