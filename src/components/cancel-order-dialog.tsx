import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CreditCard, DollarSign } from "lucide-react";
import { processOrderRefund, canRefundOrder } from "@/lib/stripe-refund";

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  order: any;
}

export function CancelOrderDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  order 
}: CancelOrderDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundStatus, setRefundStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [refundError, setRefundError] = useState<string>('');

  const needsRefund = order && canRefundOrder(order);
  const refundAmount = order ? parseFloat(order.total_amount || order.totalAmount || '0') : 0;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setRefundStatus('processing');

    try {
      // If order has Stripe payment, process refund first
      if (needsRefund) {
        console.log('💰 Processing refund for order:', order.id);
        
        const refundResult = await processOrderRefund({
          orderId: order.id,
          paymentIntentId: order.stripePaymentIntentId || order.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        });

        if (!refundResult.success) {
          setRefundStatus('error');
          setRefundError(refundResult.error || 'Refund failed');
          setIsProcessing(false);
          // Still allow cancellation even if refund fails
          // Admin can manually process refund in Stripe Dashboard
        } else {
          setRefundStatus('success');
        }
      }

      // Proceed with order cancellation
      await onConfirm(reason);
      
      // Reset state and close
      setReason('');
      setRefundStatus('idle');
      setRefundError('');
      onClose();
    } catch (error) {
      console.error('❌ Cancel order error:', error);
      setRefundStatus('error');
      setRefundError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>{t("Peruuta tilaus", "Cancel Order")}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {order && (
              <div className="space-y-3 mt-3">
                <div>
                  {t(
                    "Haluatko varmasti peruuttaa tämän tilauksen?",
                    "Are you sure you want to cancel this order?"
                  )}
                </div>
                
                {/* Order Details */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("Tilausnumero:", "Order number:")}</span>
                    <span className="font-medium">#{order.order_number || order.orderNumber || order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("Asiakas:", "Customer:")}</span>
                    <span className="font-medium">{order.customer_name || order.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("Summa:", "Amount:")}</span>
                    <span className="font-medium">€{refundAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("Maksutapa:", "Payment method:")}</span>
                    <span className="font-medium capitalize">{order.payment_method || order.paymentMethod || 'cash'}</span>
                  </div>
                </div>

                {/* Refund Warning */}
                {needsRefund && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-purple-800 text-sm">
                      <div className="font-medium mb-1">
                        {t("Automaattinen hyvitys", "Automatic Refund")}
                      </div>
                      <div>
                        {t(
                          "Tilaus on maksettu verkossa. Summa hyvitetään automaattisesti asiakkaan maksutavalle.",
                          "Order was paid online. Amount will be automatically refunded to customer's payment method."
                        )}
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">€{refundAmount.toFixed(2)}</span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Refund Status */}
                {refundStatus === 'processing' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <AlertDescription className="text-blue-800">
                      {t("Käsitellään hyvitystä...", "Processing refund...")}
                    </AlertDescription>
                  </Alert>
                )}

                {refundStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      {t("Hyvitys onnistui!", "Refund successful!")}
                    </AlertDescription>
                  </Alert>
                )}

                {refundStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {t("Hyvitys epäonnistui:", "Refund failed:")} {refundError}
                      <div className="text-xs mt-1">
                        {t(
                          "Voit käsitellä hyvityksen manuaalisesti Stripe-hallintapaneelista",
                          "You can process the refund manually in Stripe Dashboard"
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Cancellation Reason */}
                <div className="space-y-2">
                  <Label htmlFor="cancelReason">
                    {t("Syy peruutukseen (valinnainen)", "Cancellation reason (optional)")}
                  </Label>
                  <Textarea
                    id="cancelReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t(
                      "Kerro peruutuksen syy...",
                      "Enter cancellation reason..."
                    )}
                    rows={3}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {t("Takaisin", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {needsRefund 
                  ? t("Hyvitetään...", "Refunding...")
                  : t("Peruutetaan...", "Cancelling...")
                }
              </>
            ) : (
              <>
                {needsRefund 
                  ? t("Peruuta ja hyvitä", "Cancel & Refund")
                  : t("Peruuta tilaus", "Cancel Order")
                }
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



