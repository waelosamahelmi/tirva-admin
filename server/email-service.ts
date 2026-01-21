import sgMail from '@sendgrid/mail';

// Initialize SendGrid with your API key
// Make sure to set SENDGRID_API_KEY in your environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
    toppings?: Array<{ name: string; price: number; }>;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  orderType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  estimatedDeliveryTime?: string;
}

export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      orderType,
      deliveryAddress,
      estimatedDeliveryTime
    } = orderData;

    // Create HTML content for items
    const itemsHtml = items.map(item => {
      const toppingsHtml = item.toppings && item.toppings.length > 0
        ? `<br>Toppings: ${item.toppings.map(t => `${t.name} (€${t.price.toFixed(2)})`).join(', ')}`
        : '';

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.name} x${item.quantity}${toppingsHtml}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            €${item.totalPrice.toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #e53e3e; text-align: center;">Order Confirmation</h1>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! Here are your order details:</p>
        
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Order Number:</strong> #${orderNumber}<br>
          <strong>Order Type:</strong> ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}<br>
          ${deliveryAddress ? `<strong>Delivery Address:</strong> ${deliveryAddress}<br>` : ''}
          ${estimatedDeliveryTime ? `<strong>Estimated Time:</strong> ${estimatedDeliveryTime}<br>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f7fafc;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td style="padding: 10px; text-align: right;" colspan="2">
                <strong>Subtotal:</strong> €${subtotal.toFixed(2)}<br>
                ${deliveryFee > 0 ? `<strong>Delivery Fee:</strong> €${deliveryFee.toFixed(2)}<br>` : ''}
                <strong>Total:</strong> €${totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          ${orderType === 'pickup' 
            ? '<p>You can pick up your order in approximately 15-20 minutes.</p>' 
            : '<p>We will call you before delivering your order.</p>'}
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666;">
          <p>Thank you for choosing Tirvan Kahvila!</p>
          <p>For any questions, please contact us at +358 41 3152619</p>
          <p>Pasintie 2, 45410 Utti</p>
        </div>
      </div>
    `;

    const msg = {
      to: customerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'orders@tirvankahvila.fi',
      subject: `Order Confirmation #${orderNumber} - Tirvan Kahvila`,
      html: emailContent,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}
