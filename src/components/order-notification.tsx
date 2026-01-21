import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, AlertTriangle, Phone, MapPin, Euro, Truck, Store } from "lucide-react";
import { NotificationSoundManager } from "@/lib/notification-sound-manager-enhanced";

interface OrderNotificationProps {
  order: any;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export function OrderNotification({ order, isOpen, onAccept, onDecline, onClose }: OrderNotificationProps) {
  const { t, language } = useLanguage();
  const soundManager = NotificationSoundManager.getInstance();

  // Start notification sound when dialog opens
  useEffect(() => {
    if (isOpen) {
      soundManager.startNotificationSound();
    } else {
      soundManager.stopNotificationSound();
    }

    // Cleanup on unmount
    return () => {
      soundManager.stopNotificationSound();
    };
  }, [isOpen, soundManager]);

  const handleAccept = () => {
    soundManager.stopNotificationSound();
    onAccept();
  };

  const handleDecline = () => {
    soundManager.stopNotificationSound();
    onDecline();
  };

  const handleClose = () => {
    soundManager.stopNotificationSound();
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl mx-4 rounded-lg border-4 border-red-500 bg-red-50 dark:bg-red-900/30 shadow-2xl animate-pulse">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-8 h-8 animate-bounce text-red-600" />
            <span className="text-2xl font-extrabold animate-pulse">
              {t("🚨 UUSI TILAUS! 🚨", "🚨 NEW ORDER! 🚨", "🚨 طلب جديد! 🚨")}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-gray-900 dark:text-white font-bold">
                {t("Tilaus", "Order", "طلب")} #{order.orderNumber}
              </CardTitle>
              <Badge variant="destructive" className="animate-pulse text-lg px-4 py-2">
                <Clock className="w-5 h-5 mr-1" />
                {t("ODOTTAA", "PENDING", "في الانتظار")}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Customer Info - Enhanced */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-3 border-2 border-blue-300">
              <div className="flex items-center space-x-3">
                <Phone className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-xl text-gray-900 dark:text-white">
                  {order.customerName}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-lg text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{order.customerPhone}</span>
              </div>
              
              {/* Order Type - Enhanced */}
              <div className="flex items-center space-x-3 mt-4">
                {order.orderType === "delivery" ? (
                  <>
                    <Truck className="w-6 h-6 text-green-600" />
                    <span className="font-bold text-xl text-green-700 dark:text-green-400">
                      🚚 {t("Kotiinkuljetus", "Delivery", "توصيل")}
                    </span>
                  </>
                ) : (
                  <>
                    <Store className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-xl text-blue-700 dark:text-blue-400">
                      🏪 {t("Nouto", "Pickup", "استلام")}
                    </span>
                  </>
                )}
              </div>
              
              {/* Delivery Address - Enhanced */}
              {order.deliveryAddress && (
                <div className="flex items-start space-x-3 mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MapPin className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <span className="font-bold text-green-800 dark:text-green-200 text-lg">
                      {t("Toimitusosoite", "Delivery Address", "عنوان التوصيل")}:
                    </span>
                    <p className="text-green-700 dark:text-green-300 font-semibold text-lg mt-1">
                      {order.deliveryAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items - Enhanced Display */}
            {order.items && order.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-300">
                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
                  {t("Tilauksen sisältö", "Order Items", "عناصر الطلب")}:
                </h4>
                <div className="space-y-3">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                      <div className="flex-1">
                        <span className="font-semibold text-lg text-gray-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </span>
                        {item.toppings && item.toppings.length > 0 && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            <span className="font-medium">
                              {t("Lisäkkeet", "Toppings", "إضافات")}:
                            </span>
                            <span className="ml-1">{item.toppings.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Order Total - Enhanced */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border-2 border-green-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-2xl text-gray-900 dark:text-white">
                  {t("YHTEENSÄ", "TOTAL", "المجموع")}:
                </span>
                <div className="flex items-center space-x-2">
                  <Euro className="w-8 h-8 text-green-600" />
                  <span className="text-4xl font-bold text-green-700 dark:text-green-400">
                    {parseFloat(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Special Instructions - Enhanced */}
            {order.specialInstructions && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 border-2 border-yellow-400">
                <div className="text-lg">
                  <span className="font-bold text-2xl text-yellow-800 dark:text-yellow-200">
                    ⚠️ {t("Erityisohjeet", "Special Instructions", "تعليمات خاصة")}:
                  </span>
                  <p className="mt-2 text-xl font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-200 dark:bg-yellow-800/50 p-3 rounded-lg">
                    {order.specialInstructions}
                  </p>
                </div>
              </div>
            )}
            
            {/* Action Buttons - Much Larger and More Prominent */}
            <div className="flex space-x-4 pt-6">
              <Button
                onClick={handleAccept}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xl py-6 font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <CheckCircle className="w-8 h-8 mr-3" />
                {t("✅ HYVÄKSY", "✅ ACCEPT", "✅ قبول")}
              </Button>
              <Button
                onClick={handleDecline}
                variant="destructive"
                className="flex-1 text-xl py-6 font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <XCircle className="w-8 h-8 mr-3" />
                {t("❌ HYLKÄÄ", "❌ DECLINE", "❌ رفض")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}


