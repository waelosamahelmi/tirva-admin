import { backgroundNotificationManager } from "@/lib/background-notification-manager";
import { NotificationSoundManager } from "@/lib/notification-sound-manager-enhanced";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseOrders, useSupabaseUpdateOrderStatus } from "@/hooks/use-supabase-orders";
import { useSupabaseMenuItems, useSupabaseUpdateMenuItem, useSupabaseCreateMenuItem, useSupabaseCategories, useSupabaseToppings } from "@/hooks/use-supabase-menu";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import { useLanguage } from "@/lib/language-context";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { useAndroid } from "@/lib/android-context";
import { usePrinter } from "@/lib/printer-context";
import { useLocation } from "wouter";
import { sendOrderAcceptedEmail, sendOrderCancelledEmail, sendOrderDeliveredEmail } from "@/lib/email-service";
import { processOrderRefund } from "@/lib/stripe-refund";
import { LoginModal } from "@/components/login-modal";
import { ProductManagementModal } from "@/components/product-management-modal";

import { ToppingGroupManagementModal } from "@/components/topping-group-management-modal";
import { RestaurantSettingsModal } from "@/components/restaurant-settings-modal";
import { RestaurantSiteConfig } from "@/components/restaurant-site-config";
import { ThemeLayoutSettings } from "@/components/theme-layout-settings";
import { PaymentMethodsModal } from "@/components/payment-methods-modal-new";
import { StripeSettingsModal } from "@/components/stripe-settings-modal";
import { ManualUpdateButton } from "@/components/update-checker";
import { CategoryManagementModal } from "@/components/category-management-modal";
import { EmailMarketing } from "@/components/email-marketing";
import { BranchManagementModal } from "@/components/branch-management-modal";
import { PromotionsManagementModal } from "@/components/promotions-management-modal";
import { AnalyticsExportModal } from "@/components/analytics-export-modal";
import { PaymentMethodsAnalytics } from "@/components/payment-methods-analytics";
import { OrderDetailModal } from "@/components/order-detail-modal";
import { OrderAcceptDialog } from "@/components/order-accept-dialog";
import { PermissionsDialog } from "@/components/permissions-dialog";
import { PrinterStatusIndicator } from "@/components/printer-status-indicator";
import { PrintPreviewModal } from "@/components/print-preview-modal";
import { PrinterManagementModal } from "@/components/printer-management-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  UtensilsCrossed,
  Settings,
  BarChart3,
  Search,
  Filter,
  TrendingUp,
  Users,
  Euro,
  Bell,
  Truck,
  Store,
  RefreshCw,
  AlertCircle,
  ChefHat,
  Plus,
  Edit,
  Tag,
  Printer,
  Percent,
  Coffee,
  Globe,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Smartphone,
  Mail,
  Calendar,
  Loader2,
  Wifi,
  Bluetooth,
  MapPin,
  CreditCard,
  Zap,
  Download,
  Wallet,
  Banknote,
  Palette
} from "lucide-react";

export default function Admin() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useSupabaseOrders();
  const { data: menuItems, isLoading: menuLoading } = useSupabaseMenuItems();
  const { data: categories } = useSupabaseCategories();
  const { data: toppings } = useSupabaseToppings();
  const updateOrderStatus = useSupabaseUpdateOrderStatus();
  const updateMenuItem = useSupabaseUpdateMenuItem();
  const createMenuItem = useSupabaseCreateMenuItem();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);  const [showProductModal, setShowProductModal] = useState(false);
  const [showToppingGroupsModal, setShowToppingGroupsModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showSiteConfigModal, setShowSiteConfigModal] = useState(false);
  const [showThemeLayoutModal, setShowThemeLayoutModal] = useState(false);
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [showStripeSettingsModal, setShowStripeSettingsModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAnalyticsExportModal, setShowAnalyticsExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showOrderAcceptDialog, setShowOrderAcceptDialog] = useState(false);
  const [orderToAccept, setOrderToAccept] = useState<any>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  
  // Restaurant busy status
  const [isRestaurantBusy, setIsRestaurantBusy] = useState(false);
  const [isUpdatingBusyStatus, setIsUpdatingBusyStatus] = useState(false);
  
  // Restaurant settings state
  const [restaurantSettings, setRestaurantSettings] = useState<any>({
    autoAcceptEnabled: false,
    autoAcceptDeliveryTime: 30,
    autoAcceptPickupTime: 15,
  });
  
  // Track orders that have been auto-printed to prevent duplicates
  const [autoPrintedOrders, setAutoPrintedOrders] = useState<Set<number>>(new Set());
  
  // Track orders currently being processed to prevent race conditions
  const [ordersBeingProcessed, setOrdersBeingProcessed] = useState<Set<number>>(new Set());
  
  // Load restaurant settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('restaurantSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setRestaurantSettings(settings);
      } catch (error) {
        console.error('Error loading restaurant settings:', error);
      }
    }
  }, []);
  
  // Listen for restaurant settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      setRestaurantSettings(event.detail);
      console.log('📋 Restaurant settings updated:', event.detail);
    };
    
    window.addEventListener('restaurantSettingsUpdated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('restaurantSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);
  
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const { 
    isAndroid, 
    hasNotificationPermission, 
    hasBluetoothPermission, 
    hasNetworkPermission,
    sendNotification, 
    scanBluetooth,
    connectToLocalNetwork,
    enableBackgroundMode,
    keepAppActive,
    permissionsRequested,
    markPermissionsRequested
  } = useAndroid();
  
  // Printer context
  const {
    printers,
    activePrinter,
    isDiscovering,
    connectionStatus: printerConnectionStatus,
    startBluetoothDiscovery,
    startNetworkDiscovery,
    connectToPrinter,
    setActivePrinter,
    printReceipt,
    printOrder,
    printQueue,
    showDiscoveryModal,
    showSettingsModal,
    showPreviewModal,
    setShowDiscoveryModal,
    setShowSettingsModal,
    setShowPreviewModal,
    setShowTroubleshootingModal
  } = usePrinter();
    // Mobile API context - Remove this since we're using Supabase
  const isOnline = navigator.onLine;
  const isConnectedToServer = true; // Always true with Supabase
  const apiConnectionStatus = 'online';
  const lastSyncTime = new Date();
  const isOfflineModeEnabled = false;
  const getOfflineOrdersCount = () => 0;
  
  const [, setLocation] = useLocation();

  // Translation function with Arabic support for admin
  const adminT = (fi: string, en: string, ar: string) => {
    if (language === "fi") return fi;
    if (language === "en") return en;
    if (language === "ar") return ar;
    return fi;
  };

  // Fetch restaurant busy status
  useEffect(() => {
    const fetchBusyStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('is_busy')
          .single();
        
        if (error) throw error;
        setIsRestaurantBusy(data?.is_busy || false);
      } catch (error) {
        console.error('Error fetching busy status:', error);
      }
    };

    fetchBusyStatus();
  }, []);

  // Toggle restaurant busy status
  const toggleRestaurantBusy = async () => {
    setIsUpdatingBusyStatus(true);
    try {
      const newStatus = !isRestaurantBusy;
      
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ is_busy: newStatus })
        .eq('id', 1); // Assuming single settings row with id=1
      
      if (error) throw error;
      
      setIsRestaurantBusy(newStatus);
      toast({
        title: newStatus 
          ? adminT("pizzeria asetettu kiireiseksi", "Restaurant set to busy", "تم تعيين المطعم مشغول")
          : adminT("pizzeria ei ole enää kiireinen", "Restaurant no longer busy", "المطعم لم يعد مشغولاً"),
        description: newStatus
          ? adminT("Asiakkaat näkevät, että olet kiireinen", "Customers will see you're busy", "سيرى العملاء أنك مشغول")
          : adminT("Asiakkaat voivat taas tehdä tilauksia normaalisti", "Customers can order normally again", "يمكن للعملاء الطلب بشكل طبيعي مرة أخرى"),
      });
    } catch (error) {
      console.error('Error toggling busy status:', error);
      toast({
        title: adminT("Virhe", "Error", "خطأ"),
        description: adminT("Kiireisyystilan muuttaminen epäonnistui", "Failed to update busy status", "فشل تحديث الحالة"),
        variant: "destructive"
      });
    } finally {
      setIsUpdatingBusyStatus(false);
    }
  };  // Memoize realtime callbacks to prevent unnecessary reconnections
  const handleNewOrder = useCallback(async (order: any) => {
    console.log('🆕 New order notification:', order);
    
    // Create properly formatted order data for background notification
    const orderData = {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      customerName: order.customer_name || order.customerName || 'Customer',
      customerPhone: order.customer_phone || order.customerPhone || '',
      totalAmount: parseFloat(order.total_amount || order.totalAmount || '0'),
      orderType: order.order_type || order.orderType || 'pickup',
      deliveryAddress: order.delivery_address || order.deliveryAddress,
      specialInstructions: order.special_instructions || order.specialInstructions,
      items: order.items || []
    };
    
    // Refresh orders first to get the order in the list
    await refetchOrders();
    
    // NOW play sound after order appears in list
    const soundManager = NotificationSoundManager.getInstance();
    soundManager.forceStartSound();
    
    // Show enhanced background notification
    backgroundNotificationManager.showOrderNotification(orderData);
    
    // Add strong vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    }
    
    // Send urgent Android notification if available
    if (isAndroid && hasNotificationPermission) {
      sendNotification(
        "🚨 NEW ORDER RECEIVED! 🚨",
        `Order #${orderData.orderNumber} - ${orderData.customerName} - €${orderData.totalAmount.toFixed(2)}`,
        "alert"
      );
    }
  }, [refetchOrders, isAndroid, hasNotificationPermission, sendNotification]);

  const handleOrderUpdate = useCallback((order: any) => {
    console.log('🔄 Order update notification:', order);
    refetchOrders();
  }, [refetchOrders]);
  // Supabase real-time notifications
  const { isConnected } = useSupabaseRealtime({
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate
  });

  // Define handleStatusUpdate early to avoid hook order issues
  const handleStatusUpdate = useCallback(async (orderId: number, status: string, prepTime?: number) => {
    try {
      console.log(`🔄 Updating order ${orderId} to status ${status}`, prepTime ? `with prep time ${prepTime} mins` : '');
      
      // Update order status in database with prep time if provided
      const updateData: any = { id: orderId, status };
      if (prepTime !== undefined) {
        updateData.prep_time = prepTime;
      }
      
      await updateOrderStatus.mutateAsync(updateData);
      
      // Stop notification sound when any order is processed
      const soundManager = NotificationSoundManager.getInstance();
      soundManager.stopNotificationSound();
      
      // If order is being accepted, send email to customer
      if (status === "accepted" && prepTime !== undefined) {
        const order = orders?.find((o: any) => o.id === orderId);
        if (order && (order.customer_email || order.customerEmail)) {
          // Extract branch information from order
          const branch = order.branches || order.branch || {};
          const branchName = branch.name || 'Tirvan Kahvila';
          const branchAddress = branch.address || 'Rauhankatu 19 c';
          const branchCity = branch.city || 'Lahti';
          const branchPostalCode = branch.postalCode || branch.postal_code || '15110';
          const branchPhone = branch.phone || '+358-3589-9089';

          // Send order accepted email
          const emailData = {
            customerName: order.customer_name || order.customerName || 'Customer',
            customerEmail: order.customer_email || order.customerEmail,
            orderNumber: order.id?.toString() || orderId.toString(),
            orderItems: (order.items || []).map((item: any) => ({
              name: item.name || item.menuItem?.name || 'Unknown Item',
              quantity: item.quantity || 1,
              price: parseFloat(item.price || '0'),
              toppings: item.toppings?.map((t: any) => t.name || t) || []
            })),
            subtotal: parseFloat(order.subtotal || order.total_amount || '0'),
            deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || '0'),
            totalAmount: parseFloat(order.total_amount || order.totalAmount || '0'),
            orderType: (order.order_type || order.orderType || 'pickup') as 'delivery' | 'pickup',
            deliveryAddress: order.delivery_address || order.deliveryAddress,
            branchName: branchName,
            branchPhone: branchPhone,
            branchAddress: branchAddress,
            branchCity: branchCity,
            branchPostalCode: branchPostalCode,
            specialInstructions: order.special_instructions || order.specialInstructions,
            paymentMethod: order.payment_method || order.paymentMethod || 'Cash',
            prepTime: prepTime
          };
          
          sendOrderAcceptedEmail(emailData).then(result => {
            if (result.success) {
              console.log('✅ Order accepted email sent to customer');
            } else {
              console.warn('⚠️ Failed to send order accepted email:', result.error);
            }
          }).catch(err => {
            console.error('❌ Error sending order accepted email:', err);
          });
        }
      }
      
      // If order is being cancelled, send cancellation email and process refund for online payments
      if (status === "cancelled") {
        const order = orders?.find((o: any) => o.id === orderId);
        if (order && (order.customer_email || order.customerEmail)) {
          const paymentMethod = order.payment_method || order.paymentMethod || 'cash';
          const stripePaymentIntentId = order.stripe_payment_intent_id || order.stripePaymentIntentId;
          const isOnlinePayment = paymentMethod.toLowerCase().includes('card') || 
                                 paymentMethod.toLowerCase().includes('online') || 
                                 paymentMethod.toLowerCase().includes('stripe') ||
                                 paymentMethod.toLowerCase().includes('credit') ||
                                 paymentMethod.toLowerCase().includes('debit');
          
          const totalAmount = parseFloat(order.total_amount || order.totalAmount || '0');
          
          // Process Stripe refund if payment was made online
          let refundAmount = undefined;
          let refundStatus = undefined;
          if (isOnlinePayment && totalAmount > 0 && stripePaymentIntentId) {
            refundAmount = totalAmount;
            console.log(`💳 Processing refund for order ${orderId}: €${refundAmount}`);
            
            try {
              const refundResult = await processOrderRefund({
                orderId: orderId,
                paymentIntentId: stripePaymentIntentId,
                amount: refundAmount,
                reason: 'requested_by_customer'
              });
              
              if (refundResult.success) {
                console.log(`✅ Refund processed successfully: ${refundResult.refundId}`);
                refundStatus = 'processed';
                toast({
                  title: adminT("Hyvitys käsitelty", "Refund Processed", "تمت المعالجة"),
                  description: adminT(
                    `Hyvitys €${refundAmount.toFixed(2)} käsitelty onnistuneesti`,
                    `Refund of €${refundAmount.toFixed(2)} processed successfully`,
                    `تمت معالجة استرداد €${refundAmount.toFixed(2)} بنجاح`
                  ),
                });
              } else {
                console.error(`❌ Refund failed: ${refundResult.error}`);
                refundStatus = 'failed';
                toast({
                  title: adminT("Hyvitys epäonnistui", "Refund Failed", "فشل الاسترداد"),
                  description: refundResult.error || adminT("Hyvityksen käsittely epäonnistui", "Failed to process refund", "فشل معالجة الاسترداد"),
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error(`❌ Error processing refund:`, error);
              refundStatus = 'error';
              toast({
                title: adminT("Hyvitysvirhe", "Refund Error", "خطأ في الاسترداد"),
                description: adminT("Hyvityksen käsittelyssä tapahtui virhe", "An error occurred processing the refund", "حدث خطأ في معالجة الاسترداد"),
                variant: "destructive",
              });
            }
          }
          
          // Extract branch information from order
          const branch = order.branches || order.branch || {};
          const branchName = branch.name || 'Tirvan Kahvila';
          const branchAddress = branch.address || 'Rauhankatu 19 c';
          const branchCity = branch.city || 'Lahti';
          const branchPostalCode = branch.postalCode || branch.postal_code || '15110';
          const branchPhone = branch.phone || '+358-3589-9089';

          const emailData = {
            customerName: order.customer_name || order.customerName || 'Customer',
            customerEmail: order.customer_email || order.customerEmail,
            orderNumber: order.id?.toString() || orderId.toString(),
            orderItems: (order.items || []).map((item: any) => ({
              name: item.name || item.menuItem?.name || 'Unknown Item',
              quantity: item.quantity || 1,
              price: parseFloat(item.price || '0'),
            })),
            subtotal: parseFloat(order.subtotal || order.total_amount || '0'),
            deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || '0'),
            totalAmount: totalAmount,
            orderType: (order.order_type || order.orderType || 'pickup') as 'delivery' | 'pickup',
            deliveryAddress: order.delivery_address || order.deliveryAddress,
            branchName: branchName,
            branchPhone: branchPhone,
            branchAddress: branchAddress,
            branchCity: branchCity,
            branchPostalCode: branchPostalCode,
            specialInstructions: order.special_instructions || order.specialInstructions,
            paymentMethod: paymentMethod,
            refundAmount: refundAmount,
            refundStatus: refundStatus
          };
          
          sendOrderCancelledEmail(emailData).then(result => {
            if (result.success) {
              console.log('✅ Order cancellation email sent to customer');
            } else {
              console.warn('⚠️ Failed to send order cancellation email:', result.error);
            }
          }).catch(err => {
            console.error('❌ Error sending order cancellation email:', err);
          });
        }
      }
      
      // If order is being marked as delivered, send delivery confirmation email with review link
      if (status === "delivered") {
        const order = orders?.find((o: any) => o.id === orderId);
        if (order && (order.customer_email || order.customerEmail)) {
          // Extract branch information from order
          const branch = order.branches || order.branch || {};
          const branchName = branch.name || 'Tirvan Kahvila';
          const branchAddress = branch.address || 'Rauhankatu 19 c';
          const branchCity = branch.city || 'Lahti';
          const branchPostalCode = branch.postalCode || branch.postal_code || '15110';
          const branchPhone = branch.phone || '+358-3589-9089';

          const emailData = {
            customerName: order.customer_name || order.customerName || 'Customer',
            customerEmail: order.customer_email || order.customerEmail,
            orderNumber: order.id?.toString() || orderId.toString(),
            orderItems: (order.items || []).map((item: any) => ({
              name: item.name || item.menuItem?.name || 'Unknown Item',
              quantity: item.quantity || 1,
              price: parseFloat(item.price || '0'),
            })),
            subtotal: parseFloat(order.subtotal || order.total_amount || '0'),
            deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || '0'),
            totalAmount: parseFloat(order.total_amount || order.totalAmount || '0'),
            orderType: (order.order_type || order.orderType || 'pickup') as 'delivery' | 'pickup',
            deliveryAddress: order.delivery_address || order.deliveryAddress,
            branchName: branchName,
            branchPhone: branchPhone,
            branchAddress: branchAddress,
            branchCity: branchCity,
            branchPostalCode: branchPostalCode,
            specialInstructions: order.special_instructions || order.specialInstructions,
            paymentMethod: order.payment_method || order.paymentMethod || 'Cash',
            reviewLink: 'https://share.google/lgfzGpNmPplzeeIBI'
          };
          
          sendOrderDeliveredEmail(emailData).then(result => {
            if (result.success) {
              console.log('✅ Order delivered email sent to customer');
            } else {
              console.warn('⚠️ Failed to send order delivered email:', result.error);
            }
          }).catch(err => {
            console.error('❌ Error sending order delivered email:', err);
          });
        }
      }
      
      // If order is being accepted, automatically print if printer is connected
      if (status === "accepted" && activePrinter) {
        // Check if this order has already been auto-printed to prevent duplicates
        if (autoPrintedOrders.has(orderId)) {
          console.log(`⏭️ Order ${orderId} already auto-printed, skipping duplicate print`);
          toast({
            title: adminT("Tilaus hyväksytty", "Order accepted", "تم قبول الطلب"),
            description: adminT(`Tilaus #${orderId} hyväksytty (kuitti jo tulostettu)`, `Order #${orderId} accepted (receipt already printed)`, `تم قبول الطلب #${orderId} (تم طباعة الإيصال بالفعل)`),
          });
        } else {
          // Immediately mark as auto-printed to prevent any race conditions
          setAutoPrintedOrders(prev => new Set(prev).add(orderId));
          
          console.log(`🖨️ Auto-printing order ${orderId} after acceptance`);
          const order = orders?.find((o: any) => o.id === orderId);
          if (order) {
            try {
              const success = await printOrder(order);
              if (success) {
                console.log(`✅ Order ${orderId} printed successfully after acceptance`);
                toast({
                  title: adminT("Tilaus hyväksytty ja tulostettu", "Order accepted and printed", "تم قبول الطلب وطباعته"),
                  description: adminT(`Tilaus #${orderId} hyväksytty ja kuitti tulostettu`, `Order #${orderId} accepted and receipt printed`, `تم قبول الطلب #${orderId} وطباعة الإيصال`),
                });
              } else {
                console.warn(`⚠️ Order ${orderId} accepted but printing failed`);
                // Remove from auto-printed set if printing failed
                setAutoPrintedOrders(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(orderId);
                  return newSet;
                });
                toast({
                  title: adminT("Tilaus hyväksytty", "Order accepted", "تم قبول الطلب"),
                  description: adminT(`Tilaus #${orderId} hyväksytty, mutta tulostus epäonnistui`, `Order #${orderId} accepted, but printing failed`, `تم قبول الطلب #${orderId}، لكن فشلت الطباعة`),
                  variant: "destructive",
                });
              }
            } catch (printError) {
              console.error(`❌ Failed to print order ${orderId} after acceptance:`, printError);
              // Remove from auto-printed set if printing failed
              setAutoPrintedOrders(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
              });
              toast({
                title: adminT("Tilaus hyväksytty", "Order accepted", "تم قبول الطلب"),
                description: adminT(`Tilaus #${orderId} hyväksytty, mutta tulostus epäonnistui`, `Order #${orderId} accepted, but printing failed`, `تم قبول الطلب #${orderId}، لكن فشلت الطباعة`),
                variant: "destructive",
              });
            }
          }
        }
      } else {
        toast({
          title: adminT("Tilauksen tila päivitetty", "Order status updated", "تم تحديث حالة الطلب"),
          description: adminT(`Tilaus #${orderId} merkitty tilaan ${getStatusDisplayName(status)}`, `Order #${orderId} marked as ${getStatusDisplayName(status)}`, `تم وضع علامة على الطلب #${orderId} كـ ${getStatusDisplayName(status)}`),
        });
      }
      
      console.log(`✅ Order ${orderId} status updated successfully to ${status}`);
      
      // Clean up processing state after successful completion
      setOrdersBeingProcessed(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId} status:`, error);
      
      // Clean up processing state on error
      setOrdersBeingProcessed(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      
      toast({
        title: adminT("Virhe", "Error", "خطأ"),
        description: adminT("Tilauksen tilan päivitys epäonnistui", "Failed to update order status", "فشل في تحديث حالة الطلب"),
        variant: "destructive",
      });
    }
  }, [updateOrderStatus, activePrinter, orders, printOrder, toast, adminT, autoPrintedOrders]);

  // Auto-accept functionality - monitor pending orders and auto-accept if enabled
  useEffect(() => {
    if (!orders || !user || !restaurantSettings.autoAcceptEnabled) return;
    
    const pendingOrders = orders.filter((order: any) => 
      order.status === "pending" && 
      !autoPrintedOrders.has(order.id) &&
      !ordersBeingProcessed.has(order.id) // Prevent race conditions
    );
    
    if (pendingOrders.length > 0) {
      console.log(`🤖 Auto-accept enabled: Found ${pendingOrders.length} new pending orders`);
      
      // Auto-accept each pending order with staggered delays
      pendingOrders.forEach((order: any, index: number) => {
        // Immediately mark order as being processed to prevent duplicates
        setOrdersBeingProcessed(prev => new Set(prev).add(order.id));
        
        // Add a progressive delay to avoid overwhelming the system and printer
        const delay = 1000 + (index * 500) + Math.random() * 1000; // 1-2.5 seconds with progressive delay
        setTimeout(() => {
          console.log(`🟢 Auto-accepting order ${order.id} (${index + 1}/${pendingOrders.length})`);
          handleStatusUpdate(order.id, "accepted");
        }, delay);
      });
    }
  }, [orders, user, restaurantSettings.autoAcceptEnabled, handleStatusUpdate, autoPrintedOrders, ordersBeingProcessed]);
  
  // Setup background mode and check permissions for Android when component loads
  useEffect(() => {
    if (isAndroid) {
      // Enable background operation for receiving notifications
      enableBackgroundMode();
      keepAppActive();
      
      // Check if we need to show permissions dialog
      const needsPermissions = !hasNotificationPermission || !hasBluetoothPermission || !hasNetworkPermission;
      if (needsPermissions && !permissionsRequested) {
        setShowPermissionsDialog(true);
      }
    }    // Setup background notification handlers
    backgroundNotificationManager.setNotificationHandlers({
      onAccept: (orderId: string) => {
        handleStatusUpdate(parseInt(orderId), "accepted");
      },
      onDecline: (orderId: string) => {
        handleStatusUpdate(parseInt(orderId), "cancelled");
      },
      onShow: (orderData) => {
        // Just log - no popup to show
        console.log('🔔 Background notification shown for order:', orderData.orderId);
      }
    });// Cleanup on unmount
    return () => {
      backgroundNotificationManager.destroy();
    };
  }, [isAndroid, enableBackgroundMode, keepAppActive, hasNotificationPermission, hasBluetoothPermission, hasNetworkPermission, permissionsRequested, orders]);

  // Setup service worker message handler for background notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📱 Service Worker message received:', event.data);
        
        if (event.data.type === 'ACCEPT_ORDER') {
          handleStatusUpdate(event.data.orderId, 'accepted');
          backgroundNotificationManager.acceptOrder();
        } else if (event.data.type === 'DECLINE_ORDER') {
          handleStatusUpdate(event.data.orderId, 'cancelled');
          backgroundNotificationManager.declineOrder();
        }
      });
    }
  }, []);

  // Check authentication status
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login');
    }
  }, [authLoading, user, setLocation]);  // Auto-refresh orders every 10 seconds AND check for pending orders
  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => {
      refetchOrders();
    }, 10000); // More frequent refresh
    return () => clearInterval(interval);
  }, [autoRefresh, refetchOrders, user]);  // Continuous notification system for pending orders
  useEffect(() => {
    if (!orders || !user) return;
    
    const pendingOrdersList = orders.filter((order: any) => order.status === "pending");
    console.log(`🔔 Checking for pending orders: found ${pendingOrdersList.length} pending orders`);
    
    const soundManager = NotificationSoundManager.getInstance();
    
    if (pendingOrdersList.length > 0) {
      // Start continuous sound for pending orders
      console.log('🔔 Starting continuous notification sound for pending orders');
      soundManager.startNotificationSound();
      
      // Add vibration pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
        // Send system notifications for each pending order if Android
      if (isAndroid && hasNotificationPermission) {
        pendingOrdersList.forEach((order: any) => {
          const totalAmount = parseFloat(order.total_amount || order.totalAmount || '0');
          sendNotification(
            "🚨 PENDING ORDER!",
            `Order #${order.id} from ${order.customer_name || order.customerName || 'Customer'} - €${totalAmount.toFixed(2)}`,
            "alert"
          );
        });
      }
      
    } else {
      // No pending orders, stop sound
      console.log('� No pending orders, stopping notification sound');
      soundManager.stopNotificationSound();
    }
  }, [orders, user, isAndroid, hasNotificationPermission, sendNotification]);

  // Background notification pusher - sends notifications every 15 seconds while there are pending orders
  useEffect(() => {
    if (!orders || !user) return;
    
    const pendingOrdersList = orders.filter((order: any) => order.status === "pending");
    
    if (pendingOrdersList.length > 0) {
      console.log(`🔔 Setting up background notification pusher for ${pendingOrdersList.length} pending orders`);
      
      const interval = setInterval(() => {
        const currentPendingOrders = orders?.filter((order: any) => order.status === "pending") || [];
        
        if (currentPendingOrders.length > 0) {
          console.log(`🔔 Pushing background notifications for ${currentPendingOrders.length} pending orders`);
          
          // Strong vibration
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 150, 300, 150, 300, 150, 300]);
          }
            // Send Android notifications
          if (isAndroid && hasNotificationPermission) {
            currentPendingOrders.forEach((order: any, index: number) => {
              setTimeout(() => {
                const totalAmount = parseFloat(order.total_amount || order.totalAmount || '0');
                sendNotification(
                  `🚨 URGENT: Order #${order.id}`,
                  `${order.customer_name || order.customerName || 'Customer'} is waiting! €${totalAmount.toFixed(2)} - ${order.order_type || order.orderType || 'pickup'}`,
                  "alert"
                );
              }, index * 1000); // Stagger notifications by 1 second each
            });
          }
            // Enhanced background notification manager
          currentPendingOrders.forEach((order: any) => {
            const totalAmount = parseFloat(order.total_amount || order.totalAmount || '0');
            const orderData = {
              orderId: order.id,
              orderNumber: order.id,
              customerName: order.customer_name || order.customerName || 'Customer',
              customerPhone: order.customer_phone || order.customerPhone || '',
              totalAmount: totalAmount,
              orderType: order.order_type || order.orderType || 'pickup',
              deliveryAddress: order.delivery_address || order.deliveryAddress || '',
              specialInstructions: order.special_instructions || order.specialInstructions || '',
              items: order.items || []
            };
            
            backgroundNotificationManager.showOrderNotification(orderData);
          });
          
        } else {
          console.log('🔕 No more pending orders, stopping background pusher');
        }
      }, 15000); // Every 15 seconds
      
      return () => {
        console.log('🔕 Clearing background notification pusher');
        clearInterval(interval);
      };
    }  }, [orders, user, isAndroid, hasNotificationPermission, sendNotification]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {adminT("Tarkistetaan kirjautumista...", "Checking authentication...", "جاري التحقق من المصادقة...")}
          </p>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <Card className="w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="text-white w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Tirvan Kahvila
              </CardTitle>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {adminT("Hallintapaneeli", "Admin Panel", "لوحة الإدارة")}
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {adminT("Kirjaudu sisään hallintapaneeliin", "Please login to access admin panel", "يرجى تسجيل الدخول للوصول إلى لوحة الإدارة")}
              </p>
              <Button onClick={() => setShowLoginModal(true)} className="w-full">
                {adminT("Kirjaudu sisään", "Login", "تسجيل الدخول")}
              </Button>
            </CardContent>
          </Card>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      </>
    );  }

  // Handle printing receipt
  const handlePrintReceipt = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!activePrinter) {
      toast({
        title: adminT("Ei tulostinta", "No printer", "لا توجد طابعة"),
        description: adminT("Valitse ja yhdistä tulostin ensin", "Please select and connect a printer first", "يرجى تحديد الطابعة والاتصال بها أولاً"),
        variant: "destructive",
      });
      setShowDiscoveryModal(true);
      return;
    }    try {
      const success = await printOrder(order);
      if (success) {
        toast({
          title: adminT("Kuitti tulostettu", "Receipt printed", "تم طباعة الإيصال"),
          description: adminT("Tilauksen kuitti on tulostettu onnistuneesti", "Order receipt has been printed successfully", "تم طباعة إيصال الطلب بنجاح"),
        });
      }
    } catch (error) {
      console.error('Failed to print receipt:', error);
      toast({
        title: adminT("Tulostusvirhe", "Print error", "خطأ في الطباعة"),
        description: adminT("Kuitin tulostus epäonnistui", "Failed to print receipt", "فشل في طباعة الإيصال"),
        variant: "destructive",
      });
    }
  };

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

  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const filteredMenuItems = menuItems?.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.categoryId?.toString() === selectedCategory;
    const matchesSearch = searchTerm === "" || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nameEn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = availabilityFilter === "all" || 
      (availabilityFilter === "enabled" && item.isAvailable) ||
      (availabilityFilter === "disabled" && !item.isAvailable);
    return matchesCategory && matchesSearch && matchesAvailability;
  }).sort((a, b) => {
    // Sort by displayOrder first, then by ID as fallback
    const orderA = a.displayOrder ?? 999999;
    const orderB = b.displayOrder ?? 999999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id - b.id;
  }) || [];
  // Calculate stats
  const todayOrders = filteredOrders.filter(order => {
    const today = new Date().toDateString();
    return order.createdAt && new Date(order.createdAt).toDateString() === today;
  });

  const pendingOrders = filteredOrders.filter(order => order.status === "pending");
  const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
  
  // Debug logging for mobile app
  if (isAndroid) {
    console.log('📊 Stats Debug:', {
      ordersTotal: orders?.length || 0,
      filteredOrdersTotal: filteredOrders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      todayRevenue,
      menuItemsCount: menuItems?.length || 0,
      ordersLoading,
      menuLoading
    });
  }
  
  // Analytics data
  const weeklyOrders = filteredOrders.filter(order => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return order.createdAt && new Date(order.createdAt) >= weekAgo;
  });
  
  const monthlyOrders = filteredOrders.filter(order => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return order.createdAt && new Date(order.createdAt) >= monthAgo;
  });
  
  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
  const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
    
  const averageOrderValue = filteredOrders.length > 0 
    ? filteredOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0) / filteredOrders.length 
    : 0;
  
  // Calculate most ordered items from orders
  const itemOrderCounts: Record<string, { count: number; revenue: number; name: string; nameEn: string }> = {};
  filteredOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const itemId = item.id || item.menuItemId;
        if (!itemOrderCounts[itemId]) {
          itemOrderCounts[itemId] = {
            count: 0,
            revenue: 0,
            name: item.name || '',
            nameEn: item.nameEn || item.name || ''
          };
        }
        itemOrderCounts[itemId].count += item.quantity || 1;
        itemOrderCounts[itemId].revenue += parseFloat(item.price || 0) * (item.quantity || 1);
      });
    }
  });
  
  const topMenuItems = Object.entries(itemOrderCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, data]) => ({
      id,
      name: data.name,
      nameEn: data.nameEn,
      count: data.count,
      revenue: data.revenue
    }));
  
  const ordersByStatus = {
    pending: filteredOrders.filter(o => o.status === "pending").length,
    accepted: filteredOrders.filter(o => o.status === "accepted").length,
    preparing: filteredOrders.filter(o => o.status === "preparing").length,
    ready: filteredOrders.filter(o => o.status === "ready").length,
    delivered: filteredOrders.filter(o => o.status === "delivered").length,
    cancelled: filteredOrders.filter(o => o.status === "cancelled").length,
  };
  
  // Payment method analytics
  const paymentMethodStats: Record<string, { count: number; revenue: number }> = {};
  filteredOrders.forEach(order => {
    const method = order.paymentMethod || 'cash_or_card';
    const status = order.paymentStatus || 'pending';
    if (!paymentMethodStats[method]) {
      paymentMethodStats[method] = { count: 0, revenue: 0 };
    }
    paymentMethodStats[method].count++;
    if (status === 'paid' || method === 'cash_or_card') {
      paymentMethodStats[method].revenue += parseFloat(order.totalAmount || "0");
    }
  });
  
  // Order type analytics (delivery vs pickup)
  const orderTypeStats = {
    delivery: filteredOrders.filter(o => o.deliveryMethod === 'delivery').length,
    pickup: filteredOrders.filter(o => o.deliveryMethod === 'pickup').length,
    deliveryRevenue: filteredOrders
      .filter(o => o.deliveryMethod === 'delivery')
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0),
    pickupRevenue: filteredOrders
      .filter(o => o.deliveryMethod === 'pickup')
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0),
  };
  
  // Hourly distribution
  const ordersByHour: Record<number, number> = {};
  filteredOrders.forEach(order => {
    if (order.createdAt) {
      const hour = new Date(order.createdAt).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    }
  });
  
  const peakHour = Object.entries(ordersByHour).sort((a, b) => b[1] - a[1])[0];
  
  // Success rate
  const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
  const successRate = filteredOrders.length > 0 
    ? ((completedOrders / filteredOrders.length) * 100).toFixed(1)
    : '0';
  const cancellationRate = filteredOrders.length > 0
    ? ((cancelledOrders / filteredOrders.length) * 100).toFixed(1)
    : '0';
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${isAndroid ? 'pt-safe-area-inset-top' : ''}`}>
      {/* Android status bar spacer */}
      {isAndroid && <div className="h-6 sm:h-8 bg-white/80 dark:bg-gray-900/80"></div>}
      
      {/* Modern Mobile Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  <span className="hidden sm:inline">Tirvan Kahvila</span>
                  <span className="sm:hidden">Tirva</span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {adminT("Hallintapaneeli", "Admin Panel", "لوحة الإدارة")}
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                isConnected 
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{isConnected ? adminT("Yhdistetty", "Connected", "متصل") : adminT("Ei yhteyttä", "Disconnected", "غير متصل")}</span>
              </div>

              {/* Busy Status Toggle */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                <label htmlFor="busy-toggle" className="text-xs font-medium cursor-pointer">
                  {adminT("Kiireinen", "Busy", "مشغول")}
                </label>
                <Switch
                  id="busy-toggle"
                  checked={isRestaurantBusy}
                  onCheckedChange={toggleRestaurantBusy}
                  disabled={isUpdatingBusyStatus}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="px-3 py-2"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              {/* Language Selection */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="px-3 py-2 flex items-center space-x-2"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {language === "fi" ? "FI" : language === "en" ? "EN" : "AR"}
                  </span>
                </Button>
                
                {isLanguageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <button
                      onClick={() => {
                        setLanguage("fi");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg text-sm ${
                        language === "fi" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇫🇮 Suomi
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("en");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                        language === "en" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇺🇸 English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("ar");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg text-sm ${
                        language === "ar" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    >
                      🇸🇦 العربية
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="px-3 py-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-4 space-y-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                isConnected 
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{isConnected ? adminT("Yhdistetty", "Connected", "متصل") : adminT("Ei yhteyttä", "Disconnected", "غير متصل")}</span>
              </div>

              {/* Busy Status Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label htmlFor="busy-toggle-mobile" className="text-sm font-medium">
                  {adminT("pizzeria kiireinen", "Restaurant Busy", "المطعم مشغول")}
                </label>
                <Switch
                  id="busy-toggle-mobile"
                  checked={isRestaurantBusy}
                  onCheckedChange={toggleRestaurantBusy}
                  disabled={isUpdatingBusyStatus}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="w-full justify-start"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {theme === "dark" ? adminT("Vaalea teema", "Light theme", "السمة الفاتحة") : adminT("Tumma teema", "Dark theme", "السمة المظلمة")}
              </Button>

              {/* Language Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {adminT("Kieli", "Language", "اللغة")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setLanguage("fi");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "fi" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇫🇮 FI
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "en" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("ar");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "ar" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇸🇦 AR
                  </button>
                </div>
              </div>

              <Button
                variant="outline"                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {adminT("Kirjaudu ulos", "Logout", "تسجيل الخروج")}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>                  <p className="text-blue-100 text-sm font-medium">{adminT("Tänään tilauksia", "Today's Orders", "طلبات اليوم")}</p>
                  {ordersLoading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{todayOrders.length}</p>
                  )}
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>                  <p className="text-orange-100 text-sm font-medium">{adminT("Odottaa", "Pending", "في الانتظار")}</p>
                  {ordersLoading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{pendingOrders.length}</p>
                  )}
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>                  <p className="text-green-100 text-sm font-medium">{adminT("Liikevaihto", "Revenue", "الإيرادات")}</p>
                  {ordersLoading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">€{todayRevenue.toFixed(2)}</p>
                  )}
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <Euro className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>                  <p className="text-purple-100 text-sm font-medium">{adminT("Tuotteita", "Products", "المنتجات")}</p>
                  {menuLoading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{menuItems?.length || 0}</p>
                  )}
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <ChefHat className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <TabsTrigger value="orders" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <Clock className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Tilaukset", "Orders", "الطلبات")}</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <ChefHat className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Ruokalista", "Menu", "القائمة")}</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <Tag className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Tarjoukset", "Promotions", "العروض")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <BarChart3 className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Analytiikka", "Analytics", "التحليلات")}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <Settings className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Asetukset", "Settings", "الإعدادات")}</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex flex-col items-center justify-center space-y-1 px-2 py-3 text-xs font-medium h-auto">
              <Mail className="w-4 h-4" />
              <span className="text-center leading-tight">{adminT("Markkinointi", "Marketing", "التسويق")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {adminT("Tilaukset", "Orders", "الطلبات")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={adminT("Hae tilauksia...", "Search orders...", "البحث في الطلبات...")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={adminT("Valitse tila", "Select status", "اختر الحالة")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{adminT("Kaikki tilat", "All statuses", "جميع الحالات")}</SelectItem>
                      <SelectItem value="pending">{adminT("Odottaa", "Pending", "في الانتظار")}</SelectItem>
                      <SelectItem value="accepted">{adminT("Hyväksytty", "Accepted", "مقبول")}</SelectItem>
                      <SelectItem value="preparing">{adminT("Valmistellaan", "Preparing", "قيد التحضير")}</SelectItem>
                      <SelectItem value="ready">{adminT("Valmis", "Ready", "جاهز")}</SelectItem>
                      <SelectItem value="delivered">{adminT("Toimitettu", "Delivered", "تم التسليم")}</SelectItem>
                      <SelectItem value="cancelled">{adminT("Peruttu", "Cancelled", "ملغى")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Orders List */}
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      {adminT("Ei tilauksia löytynyt", "No orders found", "لم يتم العثور على طلبات")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <Card 
                        key={order.id} 
                        className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetailModal(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusDisplayName(order.status)}
                                </Badge>
                                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                  #{order.orderNumber}
                                </span>
                              </div>
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                {order.customerName || adminT("Tuntematon asiakas", "Unknown customer", "عميل غير معروف")}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {adminT("Yhteensä", "Total", "المجموع")}: €{order.totalAmount}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {order.createdAt && new Date(order.createdAt).toLocaleString(language === "ar" ? "ar-SA" : language === "fi" ? "fi-FI" : "en-US")}
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {order.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToAccept(order);
                                      setShowOrderAcceptDialog(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {adminT("Hyväksy", "Accept", "قبول")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(order.id, "cancelled");
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(order.id, "preparing");
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(order.id, "ready");
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(order.id, "delivered");
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Truck className="w-4 h-4 mr-1" />
                                  {adminT("Toimitettu", "Delivered", "تم التسليم")}
                                </Button>
                              )}
                                {/* Print Receipt Button - Available for all orders */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handlePrintReceipt(order, e)}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                                disabled={!activePrinter}
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                {adminT("Tulosta", "Print", "طباعة")}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {adminT("Ruokalistan hallinta", "Menu Management", "إدارة القائمة")}
                  </CardTitle>
                  <Button 
                    onClick={() => setShowProductModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {adminT("Lisää tuote", "Add Product", "إضافة منتج")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Menu filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={adminT("Hae tuotteita...", "Search products...", "البحث في المنتجات...")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={adminT("Valitse kategoria", "Select category", "اختر الفئة")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{adminT("Kaikki kategoriat", "All categories", "جميع الفئات")}</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {language === "en" ? category.nameEn : category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={adminT("Saatavuus", "Availability", "التوفر")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{adminT("Kaikki tuotteet", "All products", "جميع المنتجات")}</SelectItem>
                      <SelectItem value="enabled">{adminT("Käytössä", "Enabled", "مفعل")}</SelectItem>
                      <SelectItem value="disabled">{adminT("Pois käytöstä", "Disabled", "معطل")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Menu items grid */}
                {menuLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))}
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      {adminT("Ei tuotteita löytynyt", "No products found", "لم يتم العثور على منتجات")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMenuItems.map((item) => (
                      <Card 
                        key={item.id} 
                        className={`border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden relative ${
                          !item.isAvailable 
                            ? 'opacity-60 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                            : 'bg-white dark:bg-gray-900'
                        }`}
                      >
                        {!item.isAvailable && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                              {adminT("Pois käytöstä", "Disabled", "معطل")}
                            </span>
                          </div>
                        )}
                        <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center">
                              <ChefHat className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
                              {language === "en" ? item.nameEn : item.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                              {language === "en" ? item.descriptionEn : item.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                €{item.price}
                              </span>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <Switch
                                    checked={Boolean(item.isAvailable)}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        await updateMenuItem.mutateAsync({
                                          id: item.id,
                                          data: { isAvailable: checked }
                                        });
                                      } catch (error) {
                                        toast({
                                          title: adminT("Virhe", "Error", "خطأ"),
                                          description: adminT("Tuotteen päivitys epäonnistui", "Failed to update product", "فشل في تحديث المنتج"),
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="scale-75"
                                  />
                                  <span className={`text-xs font-medium ${
                                    item.isAvailable 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {item.isAvailable 
                                      ? adminT("Käytössä", "Enabled", "مفعل")
                                      : adminT("Pois", "Disabled", "معطل")
                                    }
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProduct(item);
                                    setShowProductModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  {adminT("Hallitse tarjouksia", "Manage Promotions", "إدارة العروض")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {adminT(
                    "Luo ja hallitse tarjouksia kategorioille ja toimipisteille. Tarjoukset voivat olla prosenttipohjaisia tai kiinteitä alennuksia.",
                    "Create and manage promotions for categories and branches. Promotions can be percentage-based or fixed discounts.",
                    "إنشاء وإدارة العروض الترويجية للفئات والفروع. يمكن أن تكون العروض الترويجية على أساس النسبة المئوية أو خصومات ثابتة."
                  )}
                </p>
                <Button 
                  onClick={() => setShowPromotionsModal(true)}
                  className="w-full"
                  size="lg"
                >
                  <Tag className="w-5 h-5 mr-2" />
                  {adminT("Avaa tarjousten hallinta", "Open Promotions Management", "فتح إدارة العروض")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Header with Export Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminT("Analytiikka", "Analytics", "التحليلات")}
              </h2>
              <Button
                onClick={() => setShowAnalyticsExportModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {adminT("Vie raportti", "Export Report", "تصدير التقرير")}
              </Button>
            </div>

            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">{adminT("Kaikki tilaukset", "Total Orders", "إجمالي الطلبات")}</p>
                      <p className="text-2xl font-bold">{filteredOrders.length}</p>
                      <p className="text-xs text-indigo-200 mt-1">
                        {adminT("Viikko", "Week", "أسبوع")}: {weeklyOrders.length}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">{adminT("Kokonaisliikevaihto", "Total Revenue", "إجمالي الإيرادات")}</p>
                      <p className="text-2xl font-bold">€{monthlyRevenue.toFixed(0)}</p>
                      <p className="text-xs text-emerald-200 mt-1">
                        {adminT("Viikko", "Week", "أسبوع")}: €{weeklyRevenue.toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">{adminT("Keskitilausarvo", "Avg Order Value", "متوسط قيمة الطلب")}</p>
                      <p className="text-2xl font-bold">€{averageOrderValue.toFixed(2)}</p>
                      <p className="text-xs text-amber-200 mt-1">
                        {adminT("Onnistumisaste", "Success Rate", "معدل النجاح")}: {successRate}%
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <Euro className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm font-medium">{adminT("Aktiiviset tilaukset", "Active Orders", "الطلبات النشطة")}</p>
                      <p className="text-2xl font-bold">{ordersByStatus.pending + ordersByStatus.accepted + ordersByStatus.preparing}</p>
                      <p className="text-xs text-rose-200 mt-1">
                        {adminT("Peruutukset", "Cancelled", "ملغاة")}: {cancelledOrders} ({cancellationRate}%)
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment & Delivery Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods Breakdown */}
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between">
                    <span>{adminT("Maksutavat", "Payment Methods", "طرق الدفع")}</span>
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(paymentMethodStats).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">{adminT("Ei maksutietoja", "No payment data", "لا توجد بيانات")}</p>
                      </div>
                    ) : (
                      Object.entries(paymentMethodStats)
                        .sort((a, b) => b[1].revenue - a[1].revenue)
                        .map(([method, data]) => {
                          const percentage = filteredOrders.length > 0 ? (data.count / filteredOrders.length) * 100 : 0;
                          const methodName = method === 'cash_or_card' 
                            ? adminT('Käteinen tai kortti', 'Cash or Card', 'نقداً أو بطاقة')
                            : method === 'stripe'
                            ? adminT('Verkkomaksu', 'Online Payment', 'دفع إلكتروني')
                            : method;
                          
                          return (
                            <div key={method} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {method === 'cash_or_card' ? (
                                    <div className="flex items-center -space-x-1">
                                      <Banknote className="w-5 h-5 text-green-600 z-10" />
                                      <CreditCard className="w-5 h-5 text-blue-600" />
                                    </div>
                                  ) : (
                                    <Wallet className="w-5 h-5 text-purple-600" />
                                  )}
                                  <div>
                                    <p className="font-medium">{methodName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {data.count} {adminT("tilausta", "orders", "طلبات")}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    €{data.revenue.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Method Breakdown */}
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between">
                    <span>{adminT("Toimitustapa", "Delivery Method", "طريقة التوصيل")}</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{adminT("Kotiinkuljetus", "Delivery", "توصيل")}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {orderTypeStats.delivery} {adminT("tilausta", "orders", "طلبات")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            €{orderTypeStats.deliveryRevenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {filteredOrders.length > 0 ? ((orderTypeStats.delivery / filteredOrders.length) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${filteredOrders.length > 0 ? (orderTypeStats.delivery / filteredOrders.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium">{adminT("Nouto", "Pickup", "استلام")}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {orderTypeStats.pickup} {adminT("tilausta", "orders", "طلبات")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            €{orderTypeStats.pickupRevenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {filteredOrders.length > 0 ? ((orderTypeStats.pickup / filteredOrders.length) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${filteredOrders.length > 0 ? (orderTypeStats.pickup / filteredOrders.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {peakHour && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {adminT("Kiireisin tunti", "Peak Hour", "ساعة الذروة")}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            {peakHour[0]}:00 - {parseInt(peakHour[0]) + 1}:00
                          </Badge>
                          <span className="font-semibold text-lg">{peakHour[1]} {adminT("tilausta", "orders", "طلبات")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods Analytics (old component) - keeping for backwards compatibility */}
            <div className="hidden">
              <PaymentMethodsAnalytics orders={filteredOrders} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Status Breakdown */}
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    {adminT("Tilausten tilat", "Order Status Breakdown", "توزيع حالات الطلبات")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(ordersByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(status)}>
                            {getStatusDisplayName(status)}
                          </Badge>
                        </div>
                        <span className="font-semibold text-lg">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Menu Items */}
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    {adminT("Suosituimmat tuotteet", "Popular Products", "المنتجات الشائعة")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topMenuItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">{adminT("Ei tuotetietoja", "No product data", "لا توجد بيانات")}</p>
                      </div>
                    ) : (
                      topMenuItems.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <span className={`w-7 h-7 ${
                              index === 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                              index === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                              index === 2 ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' :
                              'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                            } rounded-full flex items-center justify-center text-sm font-bold`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">
                                {language === "en" ? item.nameEn : item.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.count} {adminT("kertaa tilattu", "times ordered", "مرات الطلب")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-600 dark:text-green-400 font-semibold">
                              €{item.revenue.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {adminT("liikevaihto", "revenue", "إيرادات")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  {adminT("Viimeaikainen toiminta", "Recent Activity", "النشاط الأخير")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusDisplayName(order.status)}
                        </Badge>
                        <span className="font-medium">#{order.orderNumber}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {order.customerName || adminT("Tuntematon", "Unknown", "غير معروف")}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">€{order.totalAmount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {order.createdAt && new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    {adminT("Yleiset asetukset", "General Settings", "الإعدادات العامة")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => setShowRestaurantModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    {adminT("pizzerian asetukset", "Restaurant Settings", "إعدادات المطعم")}
                  </Button>
                  <Button 
                    onClick={() => setShowSiteConfigModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {adminT("Sivuston asetukset", "Site Configuration", "إعدادات الموقع")}
                  </Button>
                  <Button 
                    onClick={() => setShowThemeLayoutModal(true)}
                    variant="outline"
                    className="w-full justify-start bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800"
                  >
                    <Palette className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                    {adminT("Teema & ulkoasu", "Theme & Layout", "المظهر والتخطيط")}
                  </Button>
                  <Button 
                    onClick={() => setShowPaymentMethodsModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {adminT("Maksutavat", "Payment Methods", "طرق الدفع")}
                  </Button>
                  <Button
                    onClick={() => setShowToppingGroupsModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    {adminT("Täytteiden hallinta", "Toppings Management", "إدارة الإضافات")}
                  </Button>
                  <Button 
                    onClick={() => setShowCategoryModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Coffee className="w-4 h-4 mr-2" />
                    {adminT("Kategorioiden hallinta", "Category Management", "إدارة الفئات")}
                  </Button>
                  <Button 
                    onClick={() => setShowBranchModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    {adminT("Toimipisteiden hallinta", "Branch Management", "إدارة الفروع")}
                  </Button>
                  <Button 
                    onClick={() => navigate("/locations")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {adminT("Ruokapisteet", "Food Locations", "مواقع الطعام")}
                  </Button>
                  <Button 
                    onClick={() => navigate("/lounas")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <UtensilsCrossed className="w-4 h-4 mr-2" />
                    {adminT("Lounas-valikko", "Lunch Menu", "قائمة الغداء")}
                  </Button>
                  <Button 
                    onClick={() => setShowDiscoveryModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {adminT("Tulostimet", "Printers", "الطابعات")}
                  </Button>
                  <ManualUpdateButton />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-4">
            <EmailMarketing />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ProductManagementModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={async (productData) => {
          try {
            console.log("💾 Saving product data:", productData);
            console.log("🔍 hasConditionalPricing:", productData.hasConditionalPricing);
            console.log("🔍 includedToppingsCount:", productData.includedToppingsCount);
            
            if (editingProduct?.id) {
              // Editing existing product - preserve displayOrder
              const updatePayload = {
                ...productData,
                // Convert date strings to Date objects
                offerStartDate: productData.offerStartDate ? new Date(productData.offerStartDate) : null,
                offerEndDate: productData.offerEndDate ? new Date(productData.offerEndDate) : null,
                displayOrder: editingProduct.displayOrder // Preserve original order
              };
              
              console.log("📤 Update payload:", updatePayload);
              console.log("📤 Payload hasConditionalPricing:", updatePayload.hasConditionalPricing);
              console.log("📤 Payload includedToppingsCount:", updatePayload.includedToppingsCount);
              
              await updateMenuItem.mutateAsync({
                id: editingProduct.id,
                data: updatePayload
              });
            } else {
              // Creating new product - find next displayOrder for the category
              const categoryItems = menuItems?.filter(item => item.categoryId === productData.categoryId) || [];
              const maxDisplayOrder = categoryItems.length > 0 
                ? Math.max(...categoryItems.map(item => item.displayOrder || 0))
                : 0;
              
              await createMenuItem.mutateAsync({
                ...productData,
                // Convert date strings to Date objects
                offerStartDate: productData.offerStartDate ? new Date(productData.offerStartDate) : null,
                offerEndDate: productData.offerEndDate ? new Date(productData.offerEndDate) : null,
                displayOrder: maxDisplayOrder + 1
              });
            }
            
            toast({
              title: adminT("Tallennettu", "Saved", "محفوظ"),
              description: adminT("Tuote tallennettu onnistuneesti", "Product saved successfully", "تم حفظ المنتج بنجاح"),
            });
          } catch (error) {
            toast({
              title: adminT("Virhe", "Error", "خطأ"),
              description: adminT("Tuotteen tallentaminen epäonnistui", "Failed to save product", "فشل في حفظ المنتج"),
              variant: "destructive",
            });
          }
          
          setShowProductModal(false);
          setEditingProduct(null);        }}
      />

      <ToppingGroupManagementModal
        isOpen={showToppingGroupsModal}
        onClose={() => setShowToppingGroupsModal(false)}
      />

      <RestaurantSettingsModal
        isOpen={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
      />

      <PaymentMethodsModal
        isOpen={showPaymentMethodsModal}
        onClose={() => setShowPaymentMethodsModal(false)}
        onOpenStripeSettings={() => setShowStripeSettingsModal(true)}
      />

      <StripeSettingsModal
        isOpen={showStripeSettingsModal}
        onClose={() => setShowStripeSettingsModal(false)}
      />

      <AnalyticsExportModal
        isOpen={showAnalyticsExportModal}
        onClose={() => setShowAnalyticsExportModal(false)}
        orders={filteredOrders}
      />

      {/* Site Configuration Modal */}
      <Dialog open={showSiteConfigModal} onOpenChange={setShowSiteConfigModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Restaurant Site Configuration</DialogTitle>
          </DialogHeader>
          <RestaurantSiteConfig onClose={() => setShowSiteConfigModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Theme & Layout Settings Modal */}
      <Dialog open={showThemeLayoutModal} onOpenChange={setShowThemeLayoutModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Theme & Layout Settings</DialogTitle>
          </DialogHeader>
          <ThemeLayoutSettings onClose={() => setShowThemeLayoutModal(false)} />
        </DialogContent>
      </Dialog>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={showOrderDetailModal}
        onClose={() => {
          setShowOrderDetailModal(false);
          setSelectedOrder(null);
        }}
        onStatusUpdate={handleStatusUpdate}      />

      <OrderAcceptDialog
        isOpen={showOrderAcceptDialog}
        onClose={() => {
          setShowOrderAcceptDialog(false);
          setOrderToAccept(null);
        }}
        onAccept={(prepTime) => {
          if (orderToAccept) {
            handleStatusUpdate(orderToAccept.id, "accepted", prepTime);
            setShowOrderAcceptDialog(false);
            setOrderToAccept(null);
          }
        }}
        order={orderToAccept}
      />

      <PermissionsDialog

        isOpen={showPermissionsDialog}
        onClose={() => {
          setShowPermissionsDialog(false);
          markPermissionsRequested();        }}
      />
      
      {/* Comprehensive Printer Management Modal */}
      <PrinterManagementModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />

      {/* Branch Management Modal */}
      <BranchManagementModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
      />

      {/* Promotions Management Modal */}
      <PromotionsManagementModal
        isOpen={showPromotionsModal}
        onClose={() => setShowPromotionsModal(false)}
      />
    </div>
  );
}


