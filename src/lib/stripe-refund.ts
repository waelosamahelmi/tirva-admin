/**
 * Stripe Refund Utilities
 * Handles automatic refunds for cancelled orders with Stripe payments
 */

interface RefundOrderParams {
  orderId: number;
  paymentIntentId: string;
  amount?: number; // Optional partial refund amount
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
}

interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Process a refund for a cancelled order
 * @param params Refund parameters
 * @returns Promise with refund result
 */
export async function processOrderRefund(params: RefundOrderParams): Promise<RefundResponse> {
  const { paymentIntentId, amount, reason = 'requested_by_customer' } = params;

  try {
    const response = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        amount,
        reason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Refund failed:', data);
      return {
        success: false,
        error: data.message || 'Failed to process refund',
      };
    }

    console.log('✅ Refund processed:', data.refundId);
    return {
      success: true,
      refundId: data.refundId,
    };
  } catch (error) {
    console.error('❌ Refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an order has a Stripe payment that can be refunded
 * @param order Order object
 * @returns true if order can be refunded
 */
export function canRefundOrder(order: any): boolean {
  return !!(
    order.stripePaymentIntentId &&
    order.paymentStatus === 'paid' &&
    order.paymentMethod === 'stripe'
  );
}

/**
 * Get refund status message for UI display
 * @param refundStatus Refund status from order
 * @returns Localized status message
 */
export function getRefundStatusMessage(refundStatus: string, language: 'fi' | 'en' = 'fi'): string {
  const messages = {
    pending: {
      fi: 'Hyvitys käsittelyssä',
      en: 'Refund pending',
    },
    succeeded: {
      fi: 'Hyvitetty',
      en: 'Refunded',
    },
    failed: {
      fi: 'Hyvitys epäonnistui',
      en: 'Refund failed',
    },
    cancelled: {
      fi: 'Hyvitys peruutettu',
      en: 'Refund cancelled',
    },
  };

  return messages[refundStatus as keyof typeof messages]?.[language] || refundStatus;
}



