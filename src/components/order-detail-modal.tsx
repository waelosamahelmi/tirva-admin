import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ReceiptPreviewModal } from "@/components/receipt-preview-modal";
import { UniversalOrderParser } from "@/lib/universal-order-parser";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Phone, 
  MapPin, 
  Euro, 
  Truck,
  Store,
  Calendar,
  Hash,
  MessageSquare,
  FileText
} from "lucide-react";

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: number, status: string) => void;
}

export function OrderDetailModal({ order, isOpen, onClose, onStatusUpdate }: OrderDetailModalProps) {
  const { language } = useLanguage();
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Admin translation function with Arabic support
  const adminT = (fi: string, en: string, ar: string) => {
    if (language === "fi") return fi;
    if (language === "en") return en;
    if (language === "ar") return ar;
    return fi;
  };

  if (!order) return null;

  // Generate receipt data for preview
  const receiptData = UniversalOrderParser.parseOrder(order);

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: adminT("Odottaa", "Pending", "في الانتظار"),
      accepted: adminT("Hyväksytty", "Accepted", "مقبول"),
      preparing: adminT("Valmistellaan", "Preparing", "قيد التحضير"),
      ready: adminT("Valmis", "Ready", "جاهز"),
      delivered: adminT("Toimitettu", "Delivered", "تم التسليم"),
      cancelled: adminT("Peruttu", "Cancelled", "ملغى")
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      ready: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      delivered: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === "ar" ? "ar-SA" : language === "fi" ? "fi-FI" : "en-US");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Hash className="w-5 h-5" />
            <span>{adminT("Tilauksen tiedot", "Order Details", "تفاصيل الطلب")} #{order.orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <Badge className={`${getStatusColor(order.status)} w-fit`}>
              {getStatusDisplayName(order.status)}
            </Badge>
            
            <div className="flex flex-wrap gap-2">
              {/* Receipt Preview Button - Always visible */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReceiptPreview(true)}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-1" />
                {adminT("Esikatsele kuitti", "Preview Receipt", "معاينة الإيصال")}
              </Button>
              
              {order.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      onStatusUpdate(order.id, "accepted");
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {adminT("Hyväksy", "Accept", "قبول")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onStatusUpdate(order.id, "cancelled");
                      onClose();
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {adminT("Hylkää", "Decline", "رفض")}
                  </Button>
                </>
              )}
              {order.status === "accepted" && (
                <Button
                  size="sm"
                  onClick={() => {
                    onStatusUpdate(order.id, "preparing");
                    onClose();
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {adminT("Aloita valmistus", "Start preparing", "بدء التحضير")}
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  size="sm"
                  onClick={() => {
                    onStatusUpdate(order.id, "ready");
                    onClose();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {adminT("Merkitse valmiiksi", "Mark ready", "وضع علامة جاهز")}
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  size="sm"
                  onClick={() => {
                    onStatusUpdate(order.id, "delivered");
                    onClose();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Truck className="w-4 h-4 mr-1" />
                  {adminT("Toimitettu", "Delivered", "تم التسليم")}
                </Button>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>{adminT("Asiakastiedot", "Customer Information", "معلومات العميل")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{order.customerName || adminT("Tuntematon", "Unknown", "غير معروف")}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.customerEmail && (
                <div className="flex items-center space-x-3">
                  <span className="w-4 h-4 text-gray-500">@</span>
                  <span>{order.customerEmail}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{adminT("Toimitusosoite", "Delivery Address", "عنوان التسليم")}</p>
                    <p className="text-gray-600 dark:text-gray-400">{order.deliveryAddress}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                {order.orderType === "delivery" ? (
                  <Truck className="w-4 h-4 text-gray-500" />
                ) : (
                  <Store className="w-4 h-4 text-gray-500" />
                )}
                <span>
                  {order.orderType === "delivery" 
                    ? adminT("Kotiinkuljetus", "Delivery", "توصيل")
                    : adminT("Nouto", "Pickup", "استلام")
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>{adminT("Tilauksen sisältö", "Order Items", "عناصر الطلب")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(order.orderItems || order.items)?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {(() => {
                          const baseName = item.menuItems?.name || item.menu_items?.name || item.name || adminT("Tuntematon tuote", "Unknown item", "عنصر غير معروف");
                          // Extract size from special instructions and add to display name
                          const specialInstructions = item.specialInstructions || item.special_instructions;
                          if (specialInstructions) {
                            const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
                            if (sizeMatch) {
                              const size = sizeMatch[1].trim();
                              if (size && size !== 'normal' && size !== 'regular') {
                                return `${baseName} (${size})`;
                              }
                            }
                          }
                          return baseName;
                        })()}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {adminT("Määrä", "Quantity", "الكمية")}: {item.quantity}
                      </p>
                      {item.menuItems?.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.menuItems.description}
                        </p>
                      )}
                      {(item.specialInstructions || item.special_instructions) && (
                        <div className="mt-2">
                          {((item.specialInstructions || item.special_instructions || '').includes("Toppings:")) && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{adminT("Lisätäytteet", "Extras", "الإضافات")}:</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(() => {
                                  const specialInstructions = item.specialInstructions || item.special_instructions;
                                  const toppingsSection = specialInstructions
                                    .split(';')
                                    .find((part: string) => part.trim().startsWith('Toppings:'))
                                    ?.replace('Toppings:', '');
                                  
                                  if (!toppingsSection) return null;
                                  
                                  // Extract size to determine pricing
                                  const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
                                  const size = sizeMatch ? sizeMatch[1].trim() : 'normal';
                                  
                                  return toppingsSection
                                    .split(',')
                                    .map((topping: string, idx: number) => {
                                      const trimmedTopping = topping.trim();
                                      
                                      // Extract topping name and original price
                                      const priceMatch = trimmedTopping.match(/(.+?)\s*\(\+€([\d.]+)\)/);
                                      if (priceMatch) {
                                        const toppingName = priceMatch[1].trim();
                                        const originalPrice = parseFloat(priceMatch[2]);
                                        
                                        // Apply size-based pricing rules
                                        let adjustedPrice = originalPrice;
                                        if (size === "perhe") {
                                          adjustedPrice = originalPrice * 2; // Double price for family size
                                        } else if (size === "large" && Math.abs(originalPrice - 1.00) < 0.01) {
                                          adjustedPrice = 2.00; // €1.00 toppings become €2.00 for large
                                        }
                                        
                                        const displayText = `${toppingName} (+€${adjustedPrice.toFixed(2)})`;
                                        
                                        return (
                                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {displayText}
                                          </span>
                                        );
                                      } else {
                                        // No price information, display as-is
                                        return (
                                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {trimmedTopping}
                                          </span>
                                        );
                                      }
                                    });
                                })()}
                              </div>
                            </div>
                          )}
                          {((item.specialInstructions || item.special_instructions) && ((item.specialInstructions || item.special_instructions).includes("Size:") || (item.specialInstructions || item.special_instructions).includes("Special:") || (item.specialInstructions || item.special_instructions).includes("Kastike:") || (item.specialInstructions || item.special_instructions).includes("Juoma:"))) && (
                            <div>
                              <p className="text-xs text-gray-500">{adminT("Lisätiedot", "Additional Info", "معلومات إضافية")}:</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {(item.specialInstructions || item.special_instructions)
                                  .split(';')
                                  .filter((part: string) => !part.trim().startsWith('Toppings:'))
                                  .map((part: string) => part.trim())
                                  .filter((part: string) => part.length > 0)
                                  .join('; ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{item.totalPrice}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        €{item.unitPrice} {adminT("kpl", "each", "للقطعة")}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 dark:text-gray-400">
                    {adminT("Ei tuotetietoja saatavilla", "No item details available", "لا توجد تفاصيل للعناصر")}
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Order-level Special Instructions */}
              {(order.specialInstructions || order.special_instructions) && (
                <>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      {adminT("Tilauksen erikoisohjeet", "Order Special Instructions", "تعليمات خاصة للطلب")}
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {order.specialInstructions || order.special_instructions}
                    </p>
                  </div>
                  <Separator className="my-4" />
                </>
              )}

              {/* Order Totals */}
              <div className="space-y-2">
                {order.subtotal && (
                  <div className="flex justify-between">
                    <span>{adminT("Välisumma", "Subtotal", "المجموع الفرعي")}</span>
                    <span>€{order.subtotal}</span>
                  </div>
                )}
                {(order.deliveryFee !== undefined && order.deliveryFee !== null) && (
                  <div className="flex justify-between">
                    <span>{adminT("Toimitusmaksu", "Delivery Fee", "رسوم التوصيل")}</span>
                    <span>€{Number(order.deliveryFee).toFixed(2)}</span>
                  </div>
                )}
                {(order.smallOrderFee !== undefined && order.smallOrderFee !== null && parseFloat(order.smallOrderFee) > 0) && (
                  <div className="flex justify-between">
                    <span>{adminT("Pientilauslisä", "Small Order Fee", "رسوم الطلب الصغير")}</span>
                    <span>€{Number(order.smallOrderFee).toFixed(2)}</span>
                  </div>
                )}
                {order.discount && parseFloat(order.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{adminT("Alennus", "Discount", "خصم")}</span>
                    <span>-€{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>{adminT("Yhteensä", "Total", "المجموع")}</span>
                  <span>€{order.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{adminT("Tilaustiedot", "Order Information", "معلومات الطلب")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{adminT("Tilausnumero", "Order Number", "رقم الطلب")}</span>
                <span className="font-mono">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{adminT("Tilattu", "Ordered", "تم الطلب")}</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.estimatedDeliveryTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{adminT("Arvioitu toimitusaika", "Estimated Delivery", "الوقت المقدر للتسليم")}</span>
                  <span>{formatDate(order.estimatedDeliveryTime)}</span>
                </div>
              )}
              {order.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{adminT("Maksutapa", "Payment Method", "طريقة الدفع")}</span>
                  <span>{order.paymentMethod}</span>
                </div>
              )}
              {order.notes && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block mb-1">{adminT("Huomautukset", "Notes", "ملاحظات")}</span>
                  <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                    {order.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Receipt Preview Modal */}
        <ReceiptPreviewModal
          receiptData={receiptData}
          originalOrder={order}
          isOpen={showReceiptPreview}
          onClose={() => setShowReceiptPreview(false)}
        />
      </DialogContent>
    </Dialog>
  );
}


