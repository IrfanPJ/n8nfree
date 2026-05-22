import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "House of Tailors <no-reply@houseoftailors.ae>";

export async function sendAppointmentConfirmation(opts: {
  to: string;
  customerName: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  notes?: string | null;
}) {
  if (!resend) return;
  const start = new Date(opts.startTime).toLocaleString("en-AE", { dateStyle: "full", timeStyle: "short" });
  const end = new Date(opts.endTime).toLocaleString("en-AE", { timeStyle: "short" });

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Appointment Confirmed: ${opts.title}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #b8960c;">House of Tailors</h2>
        <p>Dear ${opts.customerName},</p>
        <p>Your appointment has been confirmed.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Appointment</td><td style="padding: 8px;">${opts.title}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Date &amp; Time</td><td style="padding: 8px;">${start} – ${end}</td></tr>
          ${opts.location ? `<tr><td style="padding: 8px; font-weight: bold;">Location</td><td style="padding: 8px;">${opts.location}</td></tr>` : ""}
          ${opts.notes ? `<tr><td style="padding: 8px; font-weight: bold;">Notes</td><td style="padding: 8px;">${opts.notes}</td></tr>` : ""}
        </table>
        <p>If you need to reschedule, please contact us.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">House of Tailors — Luxury Tailoring</p>
      </div>
    `,
  });
}

export async function sendOrderStatusUpdate(opts: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  garmentType: string;
}) {
  if (!resend) return;

  const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    MEASURING: "Measuring",
    CUTTING: "Cutting",
    STITCHING: "Stitching",
    TRIAL: "Ready for Trial",
    READY: "Ready for Pickup",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  const label = statusLabels[opts.status] ?? opts.status;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Order ${opts.orderNumber} — ${label}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #b8960c;">House of Tailors</h2>
        <p>Dear ${opts.customerName},</p>
        <p>Your order status has been updated.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Order</td><td style="padding: 8px;">${opts.orderNumber}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Garment</td><td style="padding: 8px;">${opts.garmentType}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status</td><td style="padding: 8px; color: #b8960c; font-weight: bold;">${label}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">House of Tailors — Luxury Tailoring</p>
      </div>
    `,
  });
}
