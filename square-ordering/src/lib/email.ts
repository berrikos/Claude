import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

function getResendClient(): Resend {
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(process.env.RESEND_API_KEY);
  }
  return globalForResend.resend;
}

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "orders@updates.example.com";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready for Pickup",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#F59E0B",
    confirmed: "#3B82F6",
    preparing: "#8B5CF6",
    ready: "#10B981",
    completed: "#6B7280",
    cancelled: "#EF4444",
  };
  return colors[status] || "#6B7280";
}

interface OrderItem {
  name: string;
  quantity: number;
  basePrice: number;
  totalPrice: number;
  modifiers?: unknown;
  specialInstructions?: string | null;
}

interface OrderEmailParams {
  to: string;
  restaurantName: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  discountAmount?: number;
  pickupAt?: Date | string | null;
  specialInstructions?: string | null;
}

interface StatusUpdateParams {
  to: string;
  restaurantName: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  discountAmount?: number;
  status: string;
  cancelledReason?: string | null;
  pickupAt?: Date | string | null;
}

interface NewOrderNotificationParams {
  to: string | string[];
  restaurantName: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  discountAmount?: number;
  pickupAt?: Date | string | null;
  specialInstructions?: string | null;
}

function formatPickupTime(pickupAt: Date | string | null | undefined): string {
  if (!pickupAt) return "";
  const date = typeof pickupAt === "string" ? new Date(pickupAt) : pickupAt;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildItemsHtml(items: OrderItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151;">
          ${item.quantity}x ${item.name}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151; text-align: right; white-space: nowrap;">
          ${formatCents(item.totalPrice)}
        </td>
      </tr>`
    )
    .join("");
}

function buildTotalsHtml(params: {
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  discountAmount?: number;
}): string {
  let rows = `
    <tr>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280;">Subtotal</td>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280; text-align: right;">${formatCents(params.subtotal)}</td>
    </tr>`;

  if (params.discountAmount && params.discountAmount > 0) {
    rows += `
    <tr>
      <td style="padding: 4px 0; font-size: 14px; color: #10B981;">Discount</td>
      <td style="padding: 4px 0; font-size: 14px; color: #10B981; text-align: right;">-${formatCents(params.discountAmount)}</td>
    </tr>`;
  }

  rows += `
    <tr>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280;">Tax</td>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280; text-align: right;">${formatCents(params.tax)}</td>
    </tr>`;

  if (params.tip > 0) {
    rows += `
    <tr>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280;">Tip</td>
      <td style="padding: 4px 0; font-size: 14px; color: #6B7280; text-align: right;">${formatCents(params.tip)}</td>
    </tr>`;
  }

  rows += `
    <tr>
      <td style="padding: 8px 0 0; font-size: 16px; font-weight: 700; color: #111827; border-top: 2px solid #E5E7EB;">Total</td>
      <td style="padding: 8px 0 0; font-size: 16px; font-weight: 700; color: #111827; border-top: 2px solid #E5E7EB; text-align: right;">${formatCents(params.total)}</td>
    </tr>`;

  return rows;
}

function wrapEmail(restaurantName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; max-width: 100%;">
          <tr>
            <td style="background-color: #111827; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.025em;">${restaurantName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; background-color: #F9FAFB; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">This email was sent by ${restaurantName}. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmation(
  params: OrderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  const pickupHtml = params.pickupAt
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #374151;"><strong>Pickup Time:</strong> ${formatPickupTime(params.pickupAt)}</p>`
    : "";

  const instructionsHtml = params.specialInstructions
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #374151; background-color: #FEF3C7; padding: 12px; border-radius: 6px;"><strong>Special Instructions:</strong> ${params.specialInstructions}</p>`
    : "";

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827;">Order Confirmed!</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #6B7280;">Thank you for your order.</p>

    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Order Number</p>
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 0.05em;">${params.orderNumber}</p>
    </div>

    ${pickupHtml}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${buildItemsHtml(params.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${buildTotalsHtml(params)}
    </table>

    ${instructionsHtml}
  `;

  try {
    await resend.emails.send({
      from: `${params.restaurantName} <${fromEmail}>`,
      to: params.to,
      subject: `Order ${params.orderNumber} Confirmed - ${params.restaurantName}`,
      html: wrapEmail(params.restaurantName, content),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send order confirmation:", message);
    return { success: false, error: message };
  }
}

export async function sendOrderStatusUpdate(
  params: StatusUpdateParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  const color = statusColor(params.status);
  const label = statusLabel(params.status);

  const pickupHtml = params.pickupAt
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #374151;"><strong>Pickup Time:</strong> ${formatPickupTime(params.pickupAt)}</p>`
    : "";

  const cancelledHtml =
    params.status === "cancelled" && params.cancelledReason
      ? `<p style="margin: 0 0 24px; font-size: 14px; color: #EF4444; background-color: #FEF2F2; padding: 12px; border-radius: 6px;"><strong>Reason:</strong> ${params.cancelledReason}</p>`
      : "";

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827;">Order Update</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #6B7280;">Your order status has been updated.</p>

    <div style="background-color: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Order Number</p>
      <p style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 0.05em;">${params.orderNumber}</p>
      <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; color: #FFFFFF; background-color: ${color};">${label}</span>
    </div>

    ${cancelledHtml}
    ${pickupHtml}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${buildItemsHtml(params.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${buildTotalsHtml(params)}
    </table>
  `;

  try {
    await resend.emails.send({
      from: `${params.restaurantName} <${fromEmail}>`,
      to: params.to,
      subject: `Order ${params.orderNumber} - ${label} | ${params.restaurantName}`,
      html: wrapEmail(params.restaurantName, content),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send status update:", message);
    return { success: false, error: message };
  }
}

export async function sendNewOrderNotification(
  params: NewOrderNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  const recipients = Array.isArray(params.to) ? params.to : [params.to];

  const pickupHtml = params.pickupAt
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #374151;"><strong>Pickup Time:</strong> ${formatPickupTime(params.pickupAt)}</p>`
    : "";

  const instructionsHtml = params.specialInstructions
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #374151; background-color: #FEF3C7; padding: 12px; border-radius: 6px;"><strong>Special Instructions:</strong> ${params.specialInstructions}</p>`
    : "";

  const customerInfo = params.customerEmail
    ? `${params.customerName} (${params.customerEmail})`
    : params.customerName;

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827;">New Order Received!</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #6B7280;">A new order has been placed and needs your attention.</p>

    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Order Number</p>
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 0.05em;">${params.orderNumber}</p>
    </div>

    <p style="margin: 0 0 24px; font-size: 14px; color: #374151;"><strong>Customer:</strong> ${customerInfo}</p>

    ${pickupHtml}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${buildItemsHtml(params.items)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${buildTotalsHtml(params)}
    </table>

    ${instructionsHtml}
  `;

  try {
    await resend.emails.send({
      from: `${params.restaurantName} Orders <${fromEmail}>`,
      to: recipients,
      subject: `New Order ${params.orderNumber} - ${formatCents(params.total)}`,
      html: wrapEmail(params.restaurantName, content),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send new order notification:", message);
    return { success: false, error: message };
  }
}
