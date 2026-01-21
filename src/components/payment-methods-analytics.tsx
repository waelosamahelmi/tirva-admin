import { useLanguage } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  TrendingUp
} from "lucide-react";

interface PaymentMethodsAnalyticsProps {
  orders: any[];
}

export function PaymentMethodsAnalytics({ orders }: PaymentMethodsAnalyticsProps) {
  const { t, language } = useLanguage();

  // Calculate payment method statistics
  const getPaymentMethodStats = () => {
    const stats: Record<string, { count: number; total: number; percentage: number }> = {};
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
    
    orders.forEach((order: any) => {
      const method = order.paymentMethod || 'cash';
      if (!stats[method]) {
        stats[method] = { count: 0, total: 0, percentage: 0 };
      }
      stats[method].count++;
      stats[method].total += parseFloat(order.totalAmount) || 0;
    });
    
    // Calculate percentages
    Object.keys(stats).forEach(method => {
      stats[method].percentage = totalRevenue > 0 
        ? (stats[method].total / totalRevenue) * 100 
        : 0;
    });
    
    return stats;
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
      case 'käteinen':
        return <Banknote className="w-5 h-5 text-green-600" />;
      case 'card':
      case 'kortti':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'mobile':
      case 'puhelin':
        return <Smartphone className="w-5 h-5 text-purple-600" />;
      case 'stripe':
        return <Wallet className="w-5 h-5 text-indigo-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  const stats = getPaymentMethodStats();
  const sortedMethods = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between">
          <span>{t("Maksutapajakauma", "Payment Method Breakdown")}</span>
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("Ei maksutietoja saatavilla", "No payment data available")}</p>
            </div>
          ) : (
            sortedMethods.map(([method, data]) => (
              <div key={method} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getPaymentIcon(method)}
                    <div>
                      <p className="font-medium capitalize">{method}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {data.count} {t("tilausta", "orders")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      €{data.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {data.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {sortedMethods.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("Suosituin tapa", "Most Popular")}
                </p>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {sortedMethods[0][0]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("Tuottoisin tapa", "Highest Revenue")}
                </p>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {sortedMethods[0][0]}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



