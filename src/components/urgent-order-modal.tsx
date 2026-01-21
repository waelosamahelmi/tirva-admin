import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, AlertTriangle, Phone, MapPin, Euro, Truck, Store } from "lucide-react";
import { NotificationSoundManager } from "@/lib/notification-sound-manager-enhanced";

interface UrgentOrderModalProps {
  order: any;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export function UrgentOrderModal({ order, isOpen, onAccept, onDecline, onClose }: UrgentOrderModalProps) {
  const { t, language } = useLanguage();
  const soundManager = NotificationSoundManager.getInstance();
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Start notification sound when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('🚨 URGENT ORDER MODAL OPENED!');
      
      // Force start sound immediately
      soundManager.forceStartSound();
      
      // Set up click handler to enable audio on user interaction
      const handleUserInteraction = () => {
        if (!hasUserInteracted) {
          setHasUserInteracted(true);
          soundManager.forceStartSound();
          console.log('User interaction detected, forcing sound start');
        }
      };

      // Add event listeners for user interaction
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);

      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
    } else {
      soundManager.stopNotificationSound();
    }

    // Cleanup on unmount
    return () => {
      soundManager.stopNotificationSound();
    };
  }, [isOpen, soundManager, hasUserInteracted]);

  const handleAccept = () => {
    console.log('✅ ORDER ACCEPTED');
    soundManager.stopNotificationSound();
    onAccept();
  };

  const handleDecline = () => {
    console.log('❌ ORDER DECLINED');
    soundManager.stopNotificationSound();
    onDecline();
  };

  const handleClose = () => {
    console.log('🔕 ORDER MODAL CLOSED');
    soundManager.stopNotificationSound();
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-4xl mx-4 rounded-xl border-8 border-red-600 bg-red-50 dark:bg-red-900/40 shadow-2xl animate-pulse z-[9999]"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center space-x-3 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-12 h-12 animate-bounce text-red-600" />
            <span className="text-4xl font-extrabold animate-pulse">
              {t("🚨 KIIREELLINEN TILAUS! 🚨", "🚨 URGENT ORDER! 🚨", "🚨 طلب عاجل! 🚨")}
            </span>
            <AlertTriangle className="w-12 h-12 animate-bounce text-red-600" />
          </DialogTitle>
          
          {/* Large Order Number */}
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-4 border-red-400">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {t("Tilaus", "Order", "طلب")} #{order.orderNumber || order.id}
              </span>
              <Badge variant="destructive" className="animate-pulse text-2xl px-6 py-3">
                <Clock className="w-6 h-6 mr-2" />
                {t("ODOTTAA", "PENDING", "في الانتظار")}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Info - Very Prominent */}
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-6 border-4 border-blue-400">
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-4">
              👤 {t("ASIAKAS", "CUSTOMER", "العميل")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Phone className="w-8 h-8 text-blue-600" />
                <div>
                  <span className="font-bold text-2xl text-gray-900 dark:text-white block">
                    {order.customerName || order.customer_name || 'Customer'}
                  </span>
                  <span className="text-xl text-gray-600 dark:text-gray-300">
                    {order.customerPhone || order.customer_phone || 'No phone'}
                  </span>
                </div>
              </div>
              
              {/* Order Type */}
              <div className="flex items-center space-x-3">
                {(order.orderType || order.order_type) === "delivery" ? (
                  <>
                    <Truck className="w-8 h-8 text-green-600" />
                    <span className="font-bold text-2xl text-green-700 dark:text-green-400">
                      🚚 {t("Kotiinkuljetus", "Delivery", "توصيل")}
                    </span>
                  </>
                ) : (
                  <>
                    <Store className="w-8 h-8 text-blue-600" />
                    <span className="font-bold text-2xl text-blue-700 dark:text-blue-400">
                      🏪 {t("Nouto", "Pickup", "استلام")}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Delivery Address */}
            {(order.deliveryAddress || order.delivery_address) && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-400">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-8 h-8 text-green-600 mt-1" />
                  <div>
                    <span className="font-bold text-green-800 dark:text-green-200 text-xl block">
                      📍 {t("Toimitusosoite", "Delivery Address", "عنوان التوصيل")}:
                    </span>
                    <p className="text-green-700 dark:text-green-300 font-semibold text-xl mt-1">
                      {order.deliveryAddress || order.delivery_address}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Total Amount - Very Large and Prominent */}
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-8 border-4 border-yellow-500 text-center">
            <h3 className="text-3xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">
              💰 {t("KOKONAISSUMMA", "TOTAL AMOUNT", "المبلغ الإجمالي")}
            </h3>
            <div className="flex items-center justify-center space-x-4">
              <Euro className="w-16 h-16 text-green-600" />
              <span className="text-6xl font-bold text-green-700 dark:text-green-400">
                {parseFloat(order.totalAmount || order.total_amount || '0').toFixed(2)}
              </span>
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border-4 border-gray-400">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                🍕 {t("Tilauksen sisältö", "Order Items", "عناصر الطلب")}:
              </h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border-2 border-gray-300">
                    <div className="flex-1">
                      <span className="font-bold text-xl text-gray-900 dark:text-white">
                        {item.quantity}x {item.name}
                      </span>
                      {item.toppings && item.toppings.length > 0 && (
                        <div className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                          <span className="font-medium">
                            {t("Lisäkkeet", "Toppings", "إضافات")}:
                          </span>
                          <span className="ml-1">{item.toppings.join(", ")}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xl text-gray-900 dark:text-white">
                        €{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Special Instructions */}
          {(order.specialInstructions || order.special_instructions) && (
            <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-6 border-4 border-orange-500">
              <h3 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-4">
                ⚠️ {t("ERITYISOHJEET", "SPECIAL INSTRUCTIONS", "تعليمات خاصة")}
              </h3>
              <p className="text-xl font-semibold text-orange-700 dark:text-orange-300 bg-orange-200 dark:bg-orange-800/50 p-4 rounded-lg">
                {order.specialInstructions || order.special_instructions}
              </p>
            </div>
          )}
          
          {/* Action Buttons - Extremely Large and Prominent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <Button
              onClick={handleAccept}
              className="h-20 text-3xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-xl transform hover:scale-105 transition-all duration-200 border-4 border-green-500"
              size="lg"
            >
              <CheckCircle className="w-12 h-12 mr-4" />
              {t("✅ HYVÄKSY TILAUS", "✅ ACCEPT ORDER", "✅ قبول الطلب")}
            </Button>
            <Button
              onClick={handleDecline}
              variant="destructive"
              className="h-20 text-3xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200 border-4 border-red-500"
              size="lg"
            >
              <XCircle className="w-12 h-12 mr-4" />
              {t("❌ HYLKÄÄ TILAUS", "❌ DECLINE ORDER", "❌ رفض الطلب")}
            </Button>
          </div>

          {/* Instruction for sound */}
          <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border-2 border-red-400">
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">
              🔊 {t("Ääni soi kunnes hyväksyt tai hylkäät tilauksen", "Sound will play until you accept or decline the order", "سيستمر الصوت حتى تقبل أو ترفض الطلب")}
            </p>
            {!hasUserInteracted && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {t("Klikkaa jotain aktivoidaksesi äänen", "Click anywhere to activate sound", "انقر في أي مكان لتفعيل الصوت")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



