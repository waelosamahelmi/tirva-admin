import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Download,
  FileText,
  Calendar,
  CreditCard,
  TrendingUp,
  DollarSign,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
}

export function AnalyticsExportModal({ isOpen, onClose, orders }: AnalyticsExportModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  // Calculate payment method statistics
  const getPaymentMethodStats = () => {
    const stats: Record<string, { count: number; total: number }> = {};
    
    const filteredOrders = filterOrders();
    
    filteredOrders.forEach((order: any) => {
      const method = order.paymentMethod || 'cash';
      if (!stats[method]) {
        stats[method] = { count: 0, total: 0 };
      }
      stats[method].count++;
      stats[method].total += parseFloat(order.totalAmount) || 0;
    });
    
    return stats;
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate;
      });
    }
    
    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter((order: any) => 
        (order.paymentMethod || 'cash') === paymentMethodFilter
      );
    }
    
    return filtered;
  };

  const exportToCSV = () => {
    const filtered = filterOrders();
    const stats = getPaymentMethodStats();
    
    // Create CSV header
    let csv = 'Order ID,Date,Customer Name,Customer Phone,Order Type,Payment Method,Total Amount,Status\n';
    
    // Add order data
    filtered.forEach((order: any) => {
      const date = order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm') : '';
      const row = [
        order.id,
        date,
        `"${order.customerName || ''}"`,
        order.customerPhone || '',
        order.orderType || 'delivery',
        order.paymentMethod || 'cash',
        order.totalAmount || '0',
        order.status || 'pending'
      ].join(',');
      csv += row + '\n';
    });
    
    // Add summary section
    csv += '\n\nPayment Method Summary\n';
    csv += 'Payment Method,Number of Orders,Total Revenue\n';
    Object.entries(stats).forEach(([method, data]) => {
      csv += `${method},${data.count},€${data.total.toFixed(2)}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: t("Viety onnistuneesti", "Exported Successfully"),
      description: t("Raportti on ladattu CSV-tiedostona", "Report has been downloaded as CSV"),
    });
  };

  const exportToPDF = async () => {
    // For a full PDF implementation, you would need a library like jsPDF or pdfmake
    // For now, we'll show a message that this feature is coming soon
    toast({
      title: t("Tulossa pian", "Coming Soon"),
      description: t("PDF-vienti toteutetaan pian. Käytä toistaiseksi CSV-vientiä.", "PDF export will be implemented soon. Please use CSV export for now."),
    });
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
    onClose();
  };

  const stats = getPaymentMethodStats();
  const filtered = filterOrders();
  const totalRevenue = filtered.reduce((sum: number, order: any) => 
    sum + (parseFloat(order.totalAmount) || 0), 0
  );

  // Get unique payment methods from orders
  const uniquePaymentMethods = Array.from(
    new Set(orders.map((order: any) => order.paymentMethod || 'cash'))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-6 h-6 text-blue-600" />
            <span>{t("Vie analytiikka", "Export Analytics")}</span>
          </DialogTitle>
          <DialogDescription>
            {t(
              "Valitse aikaväli ja muoto viedäksesi raportin",
              "Select date range and format to export your report"
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Vientiasetukset", "Export Settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{t("Aikaväli", "Date Range")}</span>
                  </Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("Kaikki", "All Time")}</SelectItem>
                      <SelectItem value="today">{t("Tänään", "Today")}</SelectItem>
                      <SelectItem value="week">{t("Viimeinen viikko", "Last Week")}</SelectItem>
                      <SelectItem value="month">{t("Viimeinen kuukausi", "Last Month")}</SelectItem>
                      <SelectItem value="year">{t("Viimeinen vuosi", "Last Year")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>{t("Maksutapa", "Payment Method")}</span>
                  </Label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("Kaikki", "All")}</SelectItem>
                      {uniquePaymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>{t("Muoto", "Format")}</span>
                  </Label>
                  <Select value={exportFormat} onValueChange={(value: 'csv' | 'pdf') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF {t("(tulossa)", "(coming soon)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Esikatselu", "Preview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {t("Tilauksia", "Orders")}
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {filtered.length}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {t("Liikevaihto", "Revenue")}
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    €{totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg col-span-2 md:col-span-1">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    {t("Keskiarvo", "Avg Order")}
                  </p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    €{filtered.length > 0 ? (totalRevenue / filtered.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("Maksutapajakauma:", "Payment Method Breakdown:")}
                </p>
                {Object.entries(stats).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium capitalize">{method}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {data.count} {t("tilausta", "orders")}
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        €{data.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel")}
            </Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              {t("Vie raportti", "Export Report")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



