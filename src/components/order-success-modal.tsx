import { useLanguage } from "@/lib/language-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Truck, ShoppingBag } from "lucide-react";

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: "delivery" | "pickup";
  orderNumber?: string;
}

export function OrderSuccessModal({ isOpen, onClose, orderType, orderNumber }: OrderSuccessModalProps) {
  const { t } = useLanguage();

  const getEstimatedTime = () => {
    if (orderType === "delivery") {
      return {
        time: "1 tunti",
        timeEn: "1 hour",
        icon: <Truck className="w-8 h-8 text-green-600" />,
        message: "Tilauksesi toimitetaan tunnin sisällä!",
        messageEn: "Your order will be delivered within 1 hour!"
      };
    } else {
      return {
        time: "15 minuLahtia",
        timeEn: "15 minutes", 
        icon: <ShoppingBag className="w-8 h-8 text-blue-600" />,
        message: "Tilauksesi on valmis noudettavaksi 15 minuutin sisällä!",
        messageEn: "Your order will be ready for pickup within 15 minutes!"
      };
    }
  };

  const estimate = getEstimatedTime();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 animate-pulse" />
            <span className="text-2xl font-bold text-green-700">
              {t("Tilaus lähetetty!", "Order Placed!")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center">
          {/* Order Number */}
          {orderNumber && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("Tilausnumero", "Order Number")}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  #{orderNumber}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              {t("Kiitos tilauksestasi!", "Thank you for your order!")}
            </p>
            
            {/* New Information Card */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="p-4">
                <div className="space-y-2 text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t(
                      "Tilauksesi on vastaanotettu! Odota, kunnes joku hyväksyy tilauksesi saadaksesi tietää, kuinka kauan se kestää.",
                      "Your order has been placed successfully! Please wait until someone accepts your order to know how long it will take."
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {t(
                      "Saat myös sähköpostin lisätiedoilla.",
                      "You will also receive an email with more information."
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Time Estimate - Kept for reference but now with disclaimer */}
            <Card className={`${orderType === "delivery" ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200"}`}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-3">
                  {estimate.icon}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("Arvioitu valmistumisaika (vahvistetaan pian)", "Estimated preparation time (will be confirmed soon)")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t(estimate.time, estimate.timeEn)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                      {t(estimate.message, estimate.messageEn)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              {t("Saat vahvistuksen sähköpostiin pian.", "You will receive an email confirmation shortly.")}
            </p>
            {orderType === "delivery" && (
              <p>
                {t("Soitamme sinulle ennen toimitusta.", "We will call you before delivery.")}
              </p>
            )}
            {orderType === "pickup" && (
              <p>
                {t("Voit tulla noutamaan tilauksesi 15 minuutin kuluttua.", "You can come to pick up your order after 15 minutes.")}
              </p>
            )}
          </div>

          {/* Restaurant Info */}
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
            <CardContent className="p-4">
              <div className="text-center space-y-1">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Tirvan Kahvila
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Rauhankatu 19 c, 15110 Lahti
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  +358-3589-9089
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {t("Sulje", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



