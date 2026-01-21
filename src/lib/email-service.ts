/**
 * Email Service for sending order confirmations and marketing emails
 * Uses Hostinger SMTP server
 *
 * Setup required:
 * 1. npm install nodemailer
 * 2. Set environment variables in .env:
 *    VITE_SMTP_HOST=smtp.hostinger.com
 *    VITE_SMTP_PORT=587
 *    VITE_SMTP_USER=no-reply@tirvankahvila.fi
 *    VITE_SMTP_PASS=your-password
 */

// Note: This is a client-side implementation template
// For production, you should create a backend API endpoint
// to handle email sending to avoid exposing SMTP credentials

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    toppings?: string[];
  }>;
  subtotal: number;
  deliveryFee: number;
  smallOrderFee?: number;
  totalAmount: number;
  orderType: 'delivery' | 'pickup' | 'dine-in';
  deliveryAddress?: string;
  branchName?: string;
  branchPhone?: string;
  branchAddress?: string;
  specialInstructions?: string;
  paymentMethod: string;
  prepTime?: number; // Preparation time in minutes
}

export interface MarketingEmailData {
  recipients: string[];
  subject: string;
  htmlContent: string;
}

/**
 * Send marketing email to multiple recipients
 * Note: This should be called from a backend API endpoint in production
 */
export async function sendMarketingEmail(
  data: MarketingEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get API URL from environment or use default
    const API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001';

    console.log('📧 Marketing email would be sent to:', data.recipients.length, 'recipients');
    console.log('📧 Subject:', data.subject);

    // Call backend API
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: data.recipients,
        subject: data.subject,
        html: data.htmlContent,
        replyTo: 'info@tirvankahvila.fi'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Marketing emails sent successfully:', result.messageId);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send marketing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send order acceptance confirmation email to customer
 * Called when admin accepts the order with estimated time
 */
export async function sendOrderAcceptedEmail(
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const API_URL = import.meta.env.VITE_EMAIL_API_URL || 'https://tirva-admin.fly.dev';
    
    console.log('📧 Sending order accepted email to:', data.customerEmail);
    
    // Format the expected time
    const now = new Date();
    const expectedTime = new Date(now.getTime() + (data.prepTime || 30) * 60000);
    const timeStr = expectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Build items list HTML
    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          ${item.name} x${item.quantity}
          ${item.toppings && item.toppings.length > 0 ? `<br><small style="color: #64748b;">+ ${item.toppings.join(', ')}</small>` : ''}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">
          €${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Order Accepted!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Tirvan Kahvila</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear ${data.customerName},</p>
            
            <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-weight: 600;">✓ Your order has been accepted and is being prepared!</p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">Order Details</h3>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Type:</strong> ${data.orderType === 'delivery' ? '🚴 Delivery' : '🛍️ Pickup'}</p>
              ${data.deliveryAddress ? `<p style="margin: 5px 0; color: #475569;"><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>` : ''}
              <p style="margin: 5px 0; color: #475569;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.9;">
                ${data.orderType === 'delivery' ? '⏰ Estimated Delivery Time' : '⏰ Estimated Pickup Time'}
              </p>
              <p style="margin: 0; font-size: 32px; font-weight: bold;">${timeStr}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">(approximately ${data.prepTime} minutes)</p>
            </div>
            
            <h3 style="margin: 25px 0 15px 0; color: #0f172a; font-size: 18px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px; text-align: left; color: #475569; font-weight: 600;">Item</th>
                  <th style="padding: 10px; text-align: right; color: #475569; font-weight: 600;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td style="padding: 10px; text-align: right; color: #64748b;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right; color: #64748b;">€${data.subtotal.toFixed(2)}</td>
                </tr>
                ${data.deliveryFee > 0 ? `
                <tr>
                  <td style="padding: 10px; text-align: right; color: #64748b;">Delivery Fee:</td>
                  <td style="padding: 10px; text-align: right; color: #64748b;">€${data.deliveryFee.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #0f172a;">Total:</td>
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #dc2626;">€${data.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            ${data.specialInstructions ? `
            <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;"><strong>Special Instructions:</strong></p>
              <p style="margin: 5px 0 0 0; color: #92400e;">${data.specialInstructions}</p>
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b;">
              <p style="margin: 5px 0; font-size: 14px;">Thank you for choosing Tirvan Kahvila!</p>
              <p style="margin: 5px 0; font-size: 14px;">📞 Phone: ${data.branchPhone || '+358-3589-9089'}</p>
              <p style="margin: 5px 0; font-size: 14px;">📍 Address: ${data.branchAddress || 'Rauhankatu 19 c, 15110 Lahti'}</p>
              <p style="margin: 15px 0 5px 0; font-size: 12px; color: #94a3b8;">
                If you have any questions about your order, please contact us.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [data.customerEmail],
        subject: `Order #${data.orderNumber} Accepted - Expected ${data.orderType === 'delivery' ? 'Delivery' : 'Pickup'} at ${timeStr}`,
        html: htmlContent,
        replyTo: 'info@tirvankahvila.fi'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Order accepted email sent successfully:', result.messageId);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send order accepted email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send order cancellation email to customer
 * Called when admin cancels the order
 */
export async function sendOrderCancelledEmail(
  data: OrderEmailData & { cancellationReason?: string; refundAmount?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const API_URL = import.meta.env.VITE_EMAIL_API_URL || 'https://tirva-admin.fly.dev';
    
    console.log('📧 Sending order cancellation email to:', data.customerEmail);
    
    // Build items list HTML
    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          ${item.name} x${item.quantity}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">
          €${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Order Cancelled</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Tirvan Kahvila</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear ${data.customerName},</p>
            
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">Your order #${data.orderNumber} has been cancelled.</p>
            </div>
            
            ${data.refundAmount ? `
            <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-weight: 600;">💳 A refund of €${data.refundAmount.toFixed(2)} will be processed to your original payment method within 5-10 business days.</p>
            </div>
            ` : ''}
            
            ${data.cancellationReason ? `
            <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;"><strong>Cancellation Reason:</strong></p>
              <p style="margin: 5px 0 0 0; color: #92400e;">${data.cancellationReason}</p>
            </div>
            ` : ''}
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">Cancelled Order Details</h3>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Type:</strong> ${data.orderType === 'delivery' ? '🚴 Delivery' : '🛍️ Pickup'}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            </div>
            
            <h3 style="margin: 25px 0 15px 0; color: #0f172a; font-size: 18px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px; text-align: left; color: #475569; font-weight: 600;">Item</th>
                  <th style="padding: 10px; text-align: right; color: #475569; font-weight: 600;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #0f172a;">Total:</td>
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #dc2626;">€${data.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b;">
              <p style="margin: 5px 0; font-size: 14px;">We apologize for any inconvenience.</p>
              <p style="margin: 5px 0; font-size: 14px;">We hope to serve you again soon!</p>
              <p style="margin: 15px 0 5px 0; font-size: 14px;">📞 Phone: ${data.branchPhone || '+358-3589-9089'}</p>
              <p style="margin: 5px 0; font-size: 14px;">📍 Address: ${data.branchAddress || 'Rauhankatu 19 c, 15110 Lahti'}</p>
              <p style="margin: 15px 0 5px 0; font-size: 12px; color: #94a3b8;">
                If you have any questions, please contact us.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [data.customerEmail],
        subject: `Order #${data.orderNumber} Cancelled${data.refundAmount ? ' - Refund Processing' : ''}`,
        html: htmlContent,
        replyTo: 'info@tirvankahvila.fi'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Order cancellation email sent successfully:', result.messageId);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send order cancellation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send order delivered confirmation email with review link
 * Called when admin marks order as delivered
 */
export async function sendOrderDeliveredEmail(
  data: OrderEmailData & { reviewLink?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const API_URL = import.meta.env.VITE_EMAIL_API_URL || 'https://tirva-admin.fly.dev';
    
    console.log('📧 Sending order delivered email to:', data.customerEmail);
    
    const reviewUrl = data.reviewLink || 'https://share.google/lgfzGpNmPplzeeIBI';
    
    // Build items list HTML
    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          ${item.name} x${item.quantity}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">
          €${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">✅ Order Delivered!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Tirvan Kahvila</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear ${data.customerName},</p>
            
            <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-weight: 600;">🎉 Your order has been delivered! We hope you enjoy your meal!</p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">Order Details</h3>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Order Type:</strong> ${data.orderType === 'delivery' ? '🚴 Delivery' : '🛍️ Pickup'}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            </div>
            
            <h3 style="margin: 25px 0 15px 0; color: #0f172a; font-size: 18px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px; text-align: left; color: #475569; font-weight: 600;">Item</th>
                  <th style="padding: 10px; text-align: right; color: #475569; font-weight: 600;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #0f172a;">Total:</td>
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #dc2626;">€${data.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <!-- Review Section -->
            <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 25px; border-radius: 10px; margin: 30px 0; text-align: center;">
              <h3 style="margin: 0 0 15px 0; font-size: 22px;">⭐ How was your experience?</h3>
              <p style="margin: 0 0 20px 0; font-size: 15px; opacity: 0.95;">
                We'd love to hear your feedback! Your review helps us improve our service.
              </p>
              <a href="${reviewUrl}" style="display: inline-block; background: white; color: #f59e0b; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ⭐ Leave a Review on Google
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b;">
              <p style="margin: 5px 0; font-size: 14px;">Thank you for choosing Tirvan Kahvila!</p>
              <p style="margin: 5px 0; font-size: 14px;">We look forward to serving you again!</p>
              <p style="margin: 15px 0 5px 0; font-size: 14px;">📞 Phone: ${data.branchPhone || '+358-3589-9089'}</p>
              <p style="margin: 5px 0; font-size: 14px;">📍 Address: ${data.branchAddress || 'Rauhankatu 19 c, 15110 Lahti'}</p>
              <p style="margin: 15px 0 5px 0; font-size: 12px; color: #94a3b8;">
                If you have any questions, please contact us.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [data.customerEmail],
        subject: `Order #${data.orderNumber} Delivered - Please Share Your Feedback! ⭐`,
        html: htmlContent,
        replyTo: 'info@tirvankahvila.fi'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Order delivered email sent successfully:', result.messageId);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send order delivered email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}




