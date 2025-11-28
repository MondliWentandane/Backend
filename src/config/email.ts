import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

// Create reusable transporter
export const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth.user && emailConfig.auth.pass ? emailConfig.auth : undefined,
  tls: {
    // Do not fail on invalid certificates (for development)
    // In production, you should use proper certificates
    rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
  },
});

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("Email server is ready to send messages");
    return true;
  } catch (error: any) {
    console.warn("Email configuration error:", error?.message || "Unknown error");
    console.warn("Email sending will be disabled. Please configure SMTP settings in .env");
    return false;
  }
};

// Email sender utility
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>
): Promise<boolean> => {
  try {
    // Check if email is configured
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn("Email not configured. Skipping email send.");
      return false;
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "Hotel App"}" <${emailConfig.auth.user}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error: any) {
    console.error("Error sending email:", error?.message || "Unknown error");
    return false;
  }
};

// Email templates
export const emailTemplates = {
  receipt: (bookingDetails: any, paymentDetails: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Receipt</h1>
          </div>
          <div class="content">
            <p>Dear ${bookingDetails.user_name},</p>
            <p>Thank you for your payment. Your booking has been confirmed.</p>
            
            <div class="details">
              <h3>Booking Details</h3>
              <p><strong>Booking ID:</strong> ${bookingDetails.booking_id}</p>
              <p><strong>Hotel:</strong> ${bookingDetails.hotel_name}</p>
              <p><strong>Check-in:</strong> ${new Date(bookingDetails.check_in_date).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(bookingDetails.check_out_date).toLocaleDateString()}</p>
              <p><strong>Guests:</strong> ${bookingDetails.number_of_guests}</p>
              <p><strong>Rooms:</strong> ${bookingDetails.number_of_rooms}</p>
            </div>
            
            <div class="details">
              <h3>Payment Details</h3>
              <p><strong>Transaction ID:</strong> ${paymentDetails.transaction_reference}</p>
              <p><strong>Payment Date:</strong> ${new Date(paymentDetails.created_at).toLocaleString()}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">$${parseFloat(paymentDetails.amount).toFixed(2)}</span></p>
              <p><strong>Payment Method:</strong> ${paymentDetails.payment_gateway || "PayPal"}</p>
            </div>
            
            <p>A detailed receipt PDF is attached to this email.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

