import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { useCreateOrder } from "@/hooks/use-orders";
import { useRestaurantSettings } from "@/hooks/use-restaurant-settings";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Bike, ShoppingBag, CreditCard, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeliveryMap } from "@/components/delivery-map";
import { OrderSuccessModal } from "@/components/order-success-modal";
import { StripePaymentModal } from "@/components/stripe-payment-modal";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function CheckoutModal({ isOpen, onClose, onBack }: CheckoutModalProps) {
  const { language, t } = useLanguage();
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: restaurantSettings } = useRestaurantSettings();
  const { data: restaurantConfig } = useRestaurantConfig();
  
  // Load payment methods from database
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([
    { id: 'cash', nameFi: 'Käteinen', nameEn: 'Cash', enabled: true },
    { id: 'card', nameFi: 'Kortti', nameEn: 'Card', enabled: true },
  ]);
  
  useEffect(() => {
    if (restaurantSettings?.paymentMethods && Array.isArray(restaurantSettings.paymentMethods)) {
      setAvailablePaymentMethods(restaurantSettings.paymentMethods.filter((m: any) => m.enabled));
    }
  }, [restaurantSettings]);

  // No longer need to fetch toppings since we store them as objects
  // const { data: allToppings = [] } = useQuery({
  //   queryKey: ['/api/toppings'],
  //   enabled: isOpen && items.some(item => item.toppings && item.toppings.length > 0)
  // });

  // const getToppingName = (toppingId: string) => {
  //   const toppings = Array.isArray(allToppings) ? allToppings : [];
  //   const topping = toppings.find((t: any) => t.id.toString() === toppingId);
  //   return topping ? (language === "fi" ? topping.name : topping.nameEn) : toppingId;
  // };

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryAddress: "",
    orderType: "delivery" as "delivery" | "pickup",
    paymentMethod: "cash",
    specialInstructions: "",
  });

  const [deliveryInfo, setDeliveryInfo] = useState<{
    fee: number;
    distance: number;
    address: string;
  } | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string>("");
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>("");

  // Check if selected payment method requires Stripe
  const isStripePaymentMethod = () => {
    const selectedMethod = availablePaymentMethods.find(m => m.id === formData.paymentMethod);
    // Check if it's the 'stripe' payment method (online payment)
    return selectedMethod && selectedMethod.id === 'stripe' && restaurantSettings?.stripeEnabled === true;
  };

  const handleDeliveryCalculated = (fee: number, distance: number, address: string) => {
    setDeliveryInfo({ fee, distance, address });
    setFormData(prev => ({ ...prev, deliveryAddress: address }));
  };

  const calculateDeliveryFee = () => {
    if (formData.orderType !== "delivery") return 0;
    return deliveryInfo?.fee || 0;
  };

  const deliveryFee = calculateDeliveryFee();
  
  // Calculate online payment service fee
  const calculateServiceFee = () => {
    if (!isStripePaymentMethod()) return 0;
    
    const feeAmount = parseFloat(restaurantSettings?.onlinePaymentServiceFee?.toString() || "0");
    const feeType = restaurantSettings?.onlinePaymentServiceFeeType || "fixed";
    
    if (feeType === "percentage") {
      // Calculate percentage of order subtotal + delivery
      return ((totalPrice + deliveryFee) * feeAmount) / 100;
    } else {
      // Fixed amount
      return feeAmount;
    }
  };
  
  const serviceFee = calculateServiceFee();
  const totalAmount = totalPrice + deliveryFee + serviceFee;
  
  // Get minimum order from config for delivery only (pickup has no minimum)
  const minimumOrderDelivery = formData.orderType === "delivery" 
    ? (restaurantConfig?.deliveryConfig?.minimumOrderDelivery || 15.00)
    : 0;
  
  // Long distance minimum (over 10km)
  const minimumOrderAmount = formData.orderType === "delivery" && 
    deliveryInfo && deliveryInfo.distance > 10 ? 20.00 : minimumOrderDelivery;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Lisää tuotteita koriin ensin", "Add items to cart first"),
        variant: "destructive",
      });
      return;
    }

    // Validate delivery address if order type is delivery
    if (formData.orderType === "delivery" && (!formData.deliveryAddress || formData.deliveryAddress.trim() === "")) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Toimitusosoite on pakollinen kotiinkuljetuksessa", "Delivery address is required for delivery orders"),
        variant: "destructive",
      });
      return;
    }

    // Check minimum order amount for long distance delivery
    if (minimumOrderAmount > 0 && totalPrice < minimumOrderAmount) {
      toast({
        title: t("Virhe", "Error"),
        description: t(`Vähimmäistilaussumma tälle alueelle on ${minimumOrderAmount.toFixed(2)} €`, `Minimum order amount for this area is ${minimumOrderAmount.toFixed(2)} €`),
        variant: "destructive",
      });
      return;
    }

    // If Stripe payment method is selected, show Stripe checkout
    if (isStripePaymentMethod()) {
      setShowStripePayment(true);
      return;
    }

    // Process regular order
    await processOrder();
  };

  const processOrder = async (paymentIntentId?: string) => {
    }

  const processOrder = async (paymentIntentId?: string) => {
    try {
      // Set payment status based on payment method
      const paymentStatus = paymentIntentId ? 'paid' : 'pending';
      
      const orderData = {
        ...formData,
        subtotal: totalPrice.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: paymentStatus,
        items: items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || "",
          toppings: item.toppings ? item.toppings.map(topping => ({
            id: topping.id,
            name: topping.name,
            nameEn: topping.nameEn,
            price: topping.price
          })) : [],
          toppingsPrice: item.toppingsPrice || 0,
          size: item.size || "normal",
        })),
      };

      const result = await createOrder.mutateAsync(orderData);
      
      // Store order number and show success modal
      setSuccessOrderNumber(result.orderNumber || result.id?.toString() || "");
      setShowSuccessModal(true);

      clearCart();
      onClose();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Tilauksen lähettäminen epäonnistui", "Failed to place order"),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: field === "orderType" ? value as "delivery" | "pickup" : value 
    }));
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    setStripePaymentIntentId(paymentIntentId);
    setShowStripePayment(false);
    await processOrder(paymentIntentId);
  };

  const handleStripePaymentCancel = () => {
    setShowStripePayment(false);
  };

  return (
    <>
      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showStripePayment}
        onClose={() => setShowStripePayment(false)}
        amount={totalAmount}
        currency="eur"
        orderMetadata={{
          customerName: formData.customerName,
          customerEmail: formData.customerEmail || '',
          orderType: formData.orderType,
        }}
        onPaymentSuccess={handleStripePaymentSuccess}
        onPaymentFailed={(error) => {
          toast({
            title: t("Maksu epäonnistui", "Payment Failed"),
            description: error,
            variant: "destructive",
          });
        }}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              {t("Tilauksen tiedot", "Order Details")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">{/* Order Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("Tilaustyyppi", "Order Type")}
            </Label>
            <RadioGroup
              value={formData.orderType}
              onValueChange={(value) => handleInputChange("orderType", value)}
            >
              <div className="grid grid-cols-2 gap-4">
                <Label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-600 transition-colors">
                  <RadioGroupItem value="delivery" className="text-red-600" />
                  <div className="flex items-center space-x-2">
                    <Bike className="w-5 h-5 text-red-600" />
                    <span className="font-medium">
                      {t("Kotiinkuljetus", "Delivery")}
                    </span>
                  </div>
                </Label>
                <Label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-600 transition-colors">
                  <RadioGroupItem value="pickup" className="text-red-600" />
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">{t("Nouto", "Pickup")}</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                {t("Nimi", "Name")} *
              </Label>
              <Input
                id="customerName"
                required
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                {t("Puhelinnumero", "Phone Number")} *
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) => handleInputChange("customerPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange("customerEmail", e.target.value)}
            />
          </div>

          {/* Delivery Address with Map Integration */}
          {formData.orderType === "delivery" && (
            <>
              <DeliveryMap 
                onDeliveryCalculated={handleDeliveryCalculated}
                initialAddress={formData.deliveryAddress}
              />

              {/* Delivery Summary */}
              {deliveryInfo && (
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">
                      {t("Toimitus laskettu", "Delivery Calculated")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t("Etäisyys:", "Distance:")}</span>
                        <span className="font-medium">{deliveryInfo.distance} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("Toimitusmaksu:", "Delivery fee:")}</span>
                        <span className="font-medium">{deliveryInfo.fee.toFixed(2)}€</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery Pricing Information */}
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">
                    {t("Toimitushinnat", "Delivery Pricing")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t("Kuljetusalue 0 - 10km", "Delivery zone 0 - 10km")}</span>
                      <span className="font-medium">{t("3,00 €", "3.00 €")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("Kuljetusalue yli 10km", "Delivery zone over 10km")}</span>
                      <span className="font-medium">{t("8,00 € (Min. 20,00 €)", "8.00 € (Min. 20.00 €)")}</span>
                    </div>
                  </div>
                  {minimumOrderAmount > 0 && totalPrice < minimumOrderAmount && (
                    <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/20 rounded text-amber-800 dark:text-amber-200 text-sm">
                      {t(`Vähimmäistilaussumma: ${minimumOrderAmount.toFixed(2)} €`, `Minimum order: ${minimumOrderAmount.toFixed(2)} €`)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">
              {t("Erityisohjeet", "Special Instructions")}
            </Label>
            <Textarea
              id="specialInstructions"
              rows={3}
              placeholder={t("Kerro meille erityistoiveistasi...", "Tell us about your special requests...")}
              value={formData.specialInstructions}
              onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("Maksutapa", "Payment Method")}
            </Label>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(value) => handleInputChange("paymentMethod", value)}
            >
              <div className="space-y-3">
                {availablePaymentMethods.map((method) => {
                  // Dynamically select icon based on method.icon value
                  const PaymentIcon = 
                    method.icon === 'banknote' ? Banknote :
                    method.icon === 'credit-card' ? CreditCard :
                    method.icon === 'wallet' || method.icon === 'smartphone' ? CreditCard :
                    // Default icons for legacy data
                    method.id === 'cash' ? Banknote :
                    method.id === 'card' ? CreditCard : 
                    CreditCard;
                  
                  return (
                    <Label 
                      key={method.id}
                      className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-600 transition-colors"
                    >
                      <RadioGroupItem value={method.id} className="text-red-600" />
                      <PaymentIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">
                        {language === "fi" ? method.nameFi : method.nameEn}
                      </span>
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Order Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">
                {t("Tilauksen yhteenveto", "Order Summary")}
              </h4>
              <div className="space-y-2 mb-4">
                {items.map((item) => {
                  const basePrice = parseFloat(item.menuItem.price);
                  const toppingsPrice = item.toppingsPrice || 0;
                  const totalItemPrice = (basePrice + toppingsPrice) * item.quantity;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {language === "fi" ? item.menuItem.name : item.menuItem.nameEn} x {item.quantity}
                        {toppingsPrice > 0 && (
                          <span className="text-gray-500 text-xs block">
                            {t("+ lisätäytteet", "+ extras")}: €{toppingsPrice.toFixed(2)}
                          </span>
                        )}
                      </span>
                      <span>€{totalItemPrice.toFixed(2)}</span>
                    </div>
                  );
                })}
                {formData.orderType === "delivery" && (
                  <div className="flex justify-between text-sm">
                    <span>{t("Kuljetusmaksu", "Delivery fee")}</span>
                    <span>€{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t("Verkkomaksu palvelumaksu", "Online payment service fee")}</span>
                    <span>€{serviceFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>{t("Yhteensä:", "Total:")}</span>
                <span className="text-red-600">€{totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              {t("Takaisin", "Back")}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending 
                ? t("Lähetetään...", "Placing order...")
                : t("Lähetä tilaus", "Place Order")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Order Success Modal */}
    <OrderSuccessModal 
      isOpen={showSuccessModal}
      onClose={() => setShowSuccessModal(false)}
      orderType={formData.orderType}
      orderNumber={successOrderNumber}
    />
  </>
  );
}



