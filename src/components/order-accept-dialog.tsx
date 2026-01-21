import { useState, useRef } from "react";
import { useLanguage } from "@/lib/language-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Bike, ShoppingBag, User, Phone, MapPin, DollarSign, FileText } from "lucide-react";

interface OrderAcceptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (prepTime: number) => void;
  order: any;
}

export function OrderAcceptDialog({ isOpen, onClose, onAccept, order }: OrderAcceptDialogProps) {
  const { t } = useLanguage();
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Time options in minutes
  const timeOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

  const handleAccept = () => {
    if (selectedTime !== null) {
      onAccept(selectedTime);
      setSelectedTime(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedTime(null);
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t("Hyväksy tilaus", "Accept Order")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-4">
          <div className="space-y-4">
            {/* Order Information */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {t("Tilaus", "Order")} #{order.id}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {order.orderType === "delivery" || order.order_type === "delivery" ? (
                      <><Bike className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        {t("Kotiinkuljetus", "Delivery")}
                      </span></>
                    ) : (
                      <><ShoppingBag className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        {t("Nouto", "Pickup")}
                      </span></>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_name || order.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_phone || order.customerPhone}</span>
                  </div>
                  {(order.delivery_address || order.deliveryAddress) && (
                    <div className="flex items-center space-x-2 md:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{order.delivery_address || order.deliveryAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">
                      €{parseFloat(order.total_amount || order.totalAmount || "0").toFixed(2)}
                    </span>
                  </div>
                </div>

                {(order.special_instructions || order.specialInstructions) && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">
                          {t("Erityisohjeet", "Special Instructions")}
                        </p>
                        <p className="text-sm">{order.special_instructions || order.specialInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-2">
                    {t("Tilauksen sisältö", "Order Items")}
                  </p>
                  <div className="space-y-1">
                    {(order.items || []).map((item: any, index: number) => (
                      <div key={index} className="text-sm flex justify-between">
                        <span>
                          {item.quantity}x {item.name || item.menuItem?.name}
                        </span>
                        <span>€{(parseFloat(item.price || "0") * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    {t("Kuinka kauan valmistumiseen?", "How long will it take?")}
                  </h4>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t("Valitse arvioitu valmistumisaika minuutteina", "Select estimated preparation time in minutes")}
                </p>

                {/* Swipeable Time Options */}
                <div 
                  ref={scrollContainerRef}
                  className="flex overflow-x-scroll gap-2 pb-2 -mx-4 px-4"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x mandatory'
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {timeOptions.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`
                        flex-shrink-0 px-6 py-4 rounded-lg font-semibold
                        transition-all duration-200 min-w-[100px]
                        ${selectedTime === time 
                          ? 'bg-green-600 text-white shadow-lg scale-105' 
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                        }
                      `}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="text-center">
                        <div className="text-2xl">{time}</div>
                        <div className="text-xs opacity-80">{t("min", "min")}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t("← Pyyhkäise vasemmalle nähdäksesi enemmän vaihtoehtoja", "← Swipe left to see more options")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {t("Peruuta", "Cancel")}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={selectedTime === null}
            className="bg-green-600 hover:bg-green-700"
          >
            {selectedTime !== null 
              ? `${t("Hyväksy", "Accept")} (${selectedTime} ${t("min", "min")})`
              : t("Valitse aika", "Select Time")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



